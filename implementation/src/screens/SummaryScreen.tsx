import { useState } from "react";
import { Platform, StyleSheet, Switch, Text, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { PatientDataSnapshot } from "../domain/types";
import {
  Button,
  Card,
  colors,
  Field,
  Message,
  Page,
  SectionTitle,
  Title,
} from "../components/UI";

const MAX_SUMMARY_BYTES = 5 * 1024 * 1024;

function localDateInput(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function parseDate(value: string, endOfDay = false): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = endOfDay
    ? new Date(year, month, day, 23, 59, 59, 999)
    : new Date(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function withinRange(value: string, start: Date, end: Date): boolean {
  const time = new Date(value).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function listSection(title: string, items: string[]): string {
  if (items.length === 0) {
    return `<section><h2>${escapeHtml(title)}</h2><p>No entries in this section.</p></section>`;
  }
  return `<section><h2>${escapeHtml(title)}</h2><ul>${items
    .map((item) => `<li>${item}</li>`)
    .join("")}</ul></section>`;
}

function createSummaryHtml(
  snapshot: PatientDataSnapshot,
  start: Date,
  end: Date,
  include: {
    recovery: boolean;
    medications: boolean;
    testResults: boolean;
    appointments: boolean;
  },
): string {
  const sections: string[] = [];
  if (include.medications) {
    const medications = snapshot.medications
      .filter((medication) => medication.deletedAt === null)
      .map(
        (medication) =>
          `<strong>${escapeHtml(medication.name)}</strong> — ${escapeHtml(
            medication.dose,
          )}; ${escapeHtml(medication.schedule)}${
            medication.reminderTimes.length > 0
              ? `; reminders: ${escapeHtml(medication.reminderTimes.join(", "))}`
              : ""
          }`,
      );
    sections.push(listSection("Current medications", medications));
  }
  if (include.recovery) {
    const entries = snapshot.recoveryEntries
      .filter((entry) => withinRange(entry.recordedAt, start, end))
      .map((entry) => {
        const parts = [
          `<strong>${escapeHtml(
            new Date(entry.recordedAt).toLocaleString(),
          )}</strong>`,
          `Heart rate ${entry.vitals.heartRate} bpm; blood pressure ${entry.vitals.systolic}/${entry.vitals.diastolic}; temperature ${entry.vitals.temperatureF} °F; SpO2 ${entry.vitals.oxygenSaturation}%; pain ${entry.painLevel}/10.`,
        ];
        if (entry.symptoms) {
          parts.push(`Symptoms: ${escapeHtml(entry.symptoms)}`);
        }
        if (entry.note) {
          parts.push(escapeHtml(entry.note).replace(/\n/g, "<br>"));
        }
        return parts.join("<br>");
      });
    sections.push(listSection("Recovery journal and vitals", entries));
  }
  if (include.testResults) {
    const results = snapshot.testResults
      .filter((result) => withinRange(result.addedAt, start, end))
      .map(
        (result) =>
          `<strong>${escapeHtml(result.title)}</strong> — ${escapeHtml(
            result.fileName,
          )}, added ${escapeHtml(new Date(result.addedAt).toLocaleDateString())}`,
      );
    sections.push(listSection("Test results", results));
  }
  if (include.appointments) {
    const appointments = snapshot.appointments
      .filter((appointment) =>
        withinRange(appointment.scheduledAt, start, end),
      )
      .map(
        (appointment) =>
          `<strong>${escapeHtml(appointment.title)}</strong> — ${escapeHtml(
            new Date(appointment.scheduledAt).toLocaleString(),
          )}${appointment.provider ? `; ${escapeHtml(appointment.provider)}` : ""}${
            appointment.location ? `; ${escapeHtml(appointment.location)}` : ""
          }${appointment.notes ? `<br>${escapeHtml(appointment.notes)}` : ""}`,
      );
    sections.push(listSection("Appointments", appointments));
  }

  return `<!doctype html>
    <html><head><meta charset="utf-8"><style>
      body { font-family: Arial, sans-serif; color: #183438; margin: 32px; }
      h1 { color: #167d78; margin-bottom: 4px; }
      .range { color: #637679; margin-top: 0; }
      section { margin-top: 24px; page-break-inside: avoid; }
      h2 { border-bottom: 1px solid #dce8e5; padding-bottom: 6px; font-size: 18px; }
      li { margin: 0 0 12px; line-height: 1.5; }
      .disclaimer { margin-top: 28px; color: #637679; font-size: 12px; }
    </style></head><body>
      <h1>Comet Care Recovery Summary</h1>
      <p class="range">Period: ${escapeHtml(start.toLocaleDateString())} – ${escapeHtml(
        end.toLocaleDateString(),
      )}</p>
      ${sections.join("")}
      <p class="disclaimer">This summary is for personal tracking and organization. It does not diagnose conditions or replace professional medical advice.</p>
    </body></html>`;
}

export function SummaryScreen({
  snapshot,
}: {
  snapshot: PatientDataSnapshot;
}) {
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const [startDate, setStartDate] = useState(localDateInput(monthAgo));
  const [endDate, setEndDate] = useState(localDateInput(today));
  const [include, setInclude] = useState({
    recovery: true,
    medications: true,
    testResults: true,
    appointments: false,
  });
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  const updateIncluded = (key: keyof typeof include, value: boolean) => {
    setInclude((current) => ({ ...current, [key]: value }));
  };

  const generate = async () => {
    setError("");
    const start = parseDate(startDate);
    const end = parseDate(endDate, true);
    if (!start || !end || start.getTime() > end.getTime()) {
      setError("Enter a valid date range with the start on or before the end.");
      return;
    }

    const earliestAllowed = new Date(end);
    earliestAllowed.setHours(0, 0, 0, 0);
    earliestAllowed.setFullYear(earliestAllowed.getFullYear() - 1);
    if (start.getTime() < earliestAllowed.getTime()) {
      setError("The summary period cannot exceed 12 months.");
      return;
    }
    if (!Object.values(include).some(Boolean)) {
      setError("Select at least one section to include.");
      return;
    }

    setWorking(true);
    try {
      const html = createSummaryHtml(snapshot, start, end, include);
      if (Platform.OS === "web") {
        await Print.printAsync({ html });
      } else {
        const file = await Print.printToFileAsync({ html });
        const info = await FileSystem.getInfoAsync(file.uri);
        if (!info.exists || typeof info.size !== "number") {
          await FileSystem.deleteAsync(file.uri, { idempotent: true });
          throw new Error("The generated PDF size could not be verified.");
        }
        if (info.size > MAX_SUMMARY_BYTES) {
          await FileSystem.deleteAsync(file.uri, { idempotent: true });
          throw new Error("The generated PDF exceeds the 5 MB size limit.");
        }
        if (!(await Sharing.isAvailableAsync())) {
          await FileSystem.deleteAsync(file.uri, { idempotent: true });
          throw new Error("PDF sharing is not available on this device.");
        }
        await Sharing.shareAsync(file.uri, {
          dialogTitle: "Share recovery summary",
          mimeType: "application/pdf",
        });
      }
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "The recovery summary could not be generated.",
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <Page>
      <Title subtitle="Choose a period and sections to share with your provider.">
        Provider summary
      </Title>
      <Message>
        Summaries include only information stored on this device. The browser
        print dialog cannot verify the final PDF file size.
      </Message>
      <Card>
        <SectionTitle>Summary period (up to 12 months)</SectionTitle>
        <Field
          label="Start date (YYYY-MM-DD)"
          placeholder="2026-01-01"
          value={startDate}
          onChangeText={setStartDate}
        />
        <Field
          label="End date (YYYY-MM-DD)"
          placeholder="2026-01-31"
          value={endDate}
          onChangeText={setEndDate}
        />
      </Card>
      <Card>
        <SectionTitle>Include in PDF</SectionTitle>
        <View style={styles.option}>
          <Text style={styles.optionText}>Recovery journal and vitals</Text>
          <Switch
            accessibilityLabel="Include recovery journal and vitals"
            value={include.recovery}
            onValueChange={(value) => updateIncluded("recovery", value)}
          />
        </View>
        <View style={styles.option}>
          <Text style={styles.optionText}>Current medications</Text>
          <Switch
            accessibilityLabel="Include current medications"
            value={include.medications}
            onValueChange={(value) => updateIncluded("medications", value)}
          />
        </View>
        <View style={styles.option}>
          <Text style={styles.optionText}>Test results</Text>
          <Switch
            accessibilityLabel="Include test results"
            value={include.testResults}
            onValueChange={(value) => updateIncluded("testResults", value)}
          />
        </View>
        <View style={styles.option}>
          <Text style={styles.optionText}>Appointments</Text>
          <Switch
            accessibilityLabel="Include appointments"
            value={include.appointments}
            onValueChange={(value) => updateIncluded("appointments", value)}
          />
        </View>
        {error ? <Message error>{error}</Message> : null}
        <Button
          title={working ? "Preparing PDF..." : "Generate provider summary"}
          disabled={working}
          onPress={() => void generate()}
        />
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  option: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 40,
  },
  optionText: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    paddingRight: 12,
  },
});
