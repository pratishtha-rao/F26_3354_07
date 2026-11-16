import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import type { RecoveryEntry } from "../domain/types";
import { validateVitals } from "../domain/validateVitals";
import type { PatientDataRepository } from "../repositories/PatientDataRepository";
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

interface RecoveryScreenProps {
  entries: RecoveryEntry[];
  repository: PatientDataRepository;
  onChanged: () => Promise<void>;
}

const initialValues = {
  heartRate: "",
  systolic: "",
  diastolic: "",
  temperatureF: "",
  oxygenSaturation: "",
  painLevel: "0",
  symptoms: "",
  note: "",
};

export function RecoveryScreen({
  entries,
  repository,
  onChanged,
}: RecoveryScreenProps) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterDate, setFilterDate] = useState("");

  const update = (key: keyof typeof initialValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const visibleEntries = entries.filter((entry) => {
    if (!filterDate.trim()) {
      return true;
    }

    const date = new Date(entry.recordedAt);
    const localDate = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
    return localDate === filterDate.trim();
  });

  const save = async () => {
    setError("");
    const rawVitals = {
      heartRate: Number(values.heartRate),
      systolic: Number(values.systolic),
      diastolic: Number(values.diastolic),
      temperatureF: Number(values.temperatureF),
      oxygenSaturation: Number(values.oxygenSaturation),
    };

    if (
      !values.heartRate.trim() ||
      !values.systolic.trim() ||
      !values.diastolic.trim() ||
      !values.temperatureF.trim() ||
      !values.oxygenSaturation.trim()
    ) {
      setError("Enter all five vital measurements before saving.");
      return;
    }

    const validation = validateVitals(rawVitals);
    if (!validation.valid) {
      setError(validation.errors.join(". "));
      return;
    }

    const painLevel = Number(values.painLevel);
    if (
      !Number.isInteger(painLevel) ||
      painLevel < 0 ||
      painLevel > 10
    ) {
      setError("Pain level must be a whole number from 0 to 10.");
      return;
    }

    const entry: RecoveryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      recordedAt: new Date().toISOString(),
      vitals: rawVitals,
      painLevel,
      symptoms: values.symptoms.trim(),
      note: values.note.trim(),
    };

    setSaving(true);
    try {
      await repository.saveRecoveryEntry(entry);
      await onChanged();
      setValues(initialValues);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The recovery entry could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <Title subtitle="Record how you are feeling and keep a dated vitals history.">
        Recovery journal
      </Title>
      <Card>
        <SectionTitle>New check-in</SectionTitle>
        <Field
          label="Heart rate (bpm)"
          keyboardType="decimal-pad"
          value={values.heartRate}
          onChangeText={(value) => update("heartRate", value)}
        />
        <Field
          label="Blood pressure - systolic (mmHg)"
          keyboardType="decimal-pad"
          value={values.systolic}
          onChangeText={(value) => update("systolic", value)}
        />
        <Field
          label="Blood pressure - diastolic (mmHg)"
          keyboardType="decimal-pad"
          value={values.diastolic}
          onChangeText={(value) => update("diastolic", value)}
        />
        <Field
          label="Temperature (degrees F)"
          keyboardType="decimal-pad"
          value={values.temperatureF}
          onChangeText={(value) => update("temperatureF", value)}
        />
        <Field
          label="Oxygen saturation (%)"
          keyboardType="decimal-pad"
          value={values.oxygenSaturation}
          onChangeText={(value) => update("oxygenSaturation", value)}
        />
        <Field
          label="Pain level (0-10)"
          keyboardType="number-pad"
          value={values.painLevel}
          onChangeText={(value) => update("painLevel", value)}
        />
        <Field
          label="Symptoms"
          multiline
          value={values.symptoms}
          onChangeText={(value) => update("symptoms", value)}
        />
        <Field
          label="Journal note"
          multiline
          value={values.note}
          onChangeText={(value) => update("note", value)}
        />
        {error ? <Message error>{error}</Message> : null}
        <Button
          title={saving ? "Saving..." : "Save check-in"}
          disabled={saving}
          onPress={() => void save()}
        />
      </Card>

      <Card>
        <SectionTitle>Recent check-ins</SectionTitle>
        <Field
          label="Filter by date (YYYY-MM-DD)"
          placeholder="2026-11-15"
          value={filterDate}
          onChangeText={setFilterDate}
        />
        {visibleEntries.length === 0 ? (
          <Text style={styles.empty}>
            {entries.length === 0
              ? "Entries you save will be listed here, newest first."
              : "No check-ins match that date."}
          </Text>
        ) : (
          visibleEntries.slice(0, 10).map((entry) => (
            <Text key={entry.id} style={styles.entry}>
              <Text style={styles.entryDate}>
                {new Date(entry.recordedAt).toLocaleString()}
              </Text>
              {"\n"}
              HR {entry.vitals.heartRate} | BP {entry.vitals.systolic}/
              {entry.vitals.diastolic} | Temp {entry.vitals.temperatureF} degrees F
              {" | "}SpO2 {entry.vitals.oxygenSaturation}% | Pain{" "}
              {entry.painLevel}/10
              {entry.symptoms ? `\nSymptoms: ${entry.symptoms}` : ""}
              {entry.note ? `\n${entry.note}` : ""}
            </Text>
          ))
        )}
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  empty: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  entry: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    paddingTop: 10,
  },
  entryDate: {
    color: colors.ink,
    fontWeight: "700",
  },
});
