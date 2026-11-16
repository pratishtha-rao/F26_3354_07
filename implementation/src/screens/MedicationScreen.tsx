import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Medication } from "../domain/types";
import type { PatientDataRepository } from "../repositories/PatientDataRepository";
import {
  cancelMedicationReminders,
  requestReminderPermission,
  scheduleMedicationReminders,
} from "../services/ReminderService";
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

interface MedicationScreenProps {
  medications: Medication[];
  repository: PatientDataRepository;
  onChanged: () => Promise<void>;
}

const emptyForm = { name: "", dose: "", schedule: "", reminderTimes: "" };

export function MedicationScreen({
  medications,
  repository,
  onChanged,
}: MedicationScreenProps) {
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Medication | null>(null);
  const [error, setError] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const activeMedications = medications.filter(
    (medication) => medication.deletedAt === null,
  );
  const deletedMedications = medications.filter(
    (medication) => medication.deletedAt !== null,
  );

  const update = (key: keyof typeof emptyForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const clearForm = () => {
    setForm(emptyForm);
    setEditing(null);
  };

  const save = async () => {
    setError("");
    setReminderMessage("");
    if (!form.name.trim() || !form.dose.trim() || !form.schedule.trim()) {
      setError("Enter a medication name, dose, and schedule.");
      return;
    }

    const reminderTimes = form.reminderTimes
      .split(",")
      .map((time) => time.trim())
      .filter(Boolean);
    if (
      reminderTimes.some(
        (time) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time),
      )
    ) {
      setError("Enter reminder times as 24-hour HH:MM values separated by commas.");
      return;
    }

    const medication: Medication = {
      id:
        editing?.id ??
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: form.name.trim(),
      dose: form.dose.trim(),
      schedule: form.schedule.trim(),
      createdAt: editing?.createdAt ?? new Date().toISOString(),
      reminderTimes: [...new Set(reminderTimes)],
      deletedAt: null,
    };

    setSaving(true);
    try {
      let permissionGranted: boolean | undefined;
      let permissionError = "";
      if (medication.reminderTimes.length > 0) {
        try {
          permissionGranted = await requestReminderPermission();
        } catch (requestError) {
          permissionGranted = false;
          permissionError =
            requestError instanceof Error
              ? requestError.message
              : "notification permission could not be requested";
        }
      }
      await repository.saveMedication(medication);
      await onChanged();
      clearForm();
      try {
        const result = await scheduleMedicationReminders(
          medication,
          permissionGranted,
        );
        setReminderMessage(
          permissionError
            ? `${result.message} Details: ${permissionError}`
            : result.message,
        );
      } catch (scheduleError) {
        setError(
          `Medication saved, but reminders could not be updated: ${
            scheduleError instanceof Error
              ? scheduleError.message
              : "unknown notification error"
          }`,
        );
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The medication could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (medication: Medication) => {
    setError("");
    try {
      await repository.deleteMedication(medication.id);
      await onChanged();
      if (editing?.id === medication.id) {
        clearForm();
      }
      try {
        await cancelMedicationReminders(medication.id);
      } catch (cancelError) {
        setError(
          `Medication moved to recently deleted, but its reminder could not be canceled: ${
            cancelError instanceof Error
              ? cancelError.message
              : "unknown notification error"
          }`,
        );
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "The medication could not be deleted.",
      );
    }
  };

  const restore = async (medication: Medication) => {
    setError("");
    setReminderMessage("");
    try {
      let permissionGranted: boolean | undefined;
      let permissionError = "";
      if (medication.reminderTimes.length > 0) {
        try {
          permissionGranted = await requestReminderPermission();
        } catch (requestError) {
          permissionGranted = false;
          permissionError =
            requestError instanceof Error
              ? requestError.message
              : "notification permission could not be requested";
        }
      }
      await repository.restoreMedication(medication.id);
      await onChanged();
      try {
        const result = await scheduleMedicationReminders({
          ...medication,
          deletedAt: null,
        }, permissionGranted);
        setReminderMessage(
          permissionError
            ? `${result.message} Details: ${permissionError}`
            : result.message,
        );
      } catch (scheduleError) {
        setError(
          `Medication restored, but reminders could not be updated: ${
            scheduleError instanceof Error
              ? scheduleError.message
              : "unknown notification error"
          }`,
        );
      }
    } catch (restoreError) {
      setError(
        restoreError instanceof Error
          ? restoreError.message
          : "The medication could not be restored.",
      );
    }
  };

  return (
    <Page>
      <Title subtitle="Keep your medication instructions organized in one place.">
        Medications
      </Title>
      <Message>
        Device reminders need notification permission. In the browser, reminders
        only work while this page stays open.
      </Message>
      <Card>
        <SectionTitle>
          {editing ? "Edit medication" : "Add medication"}
        </SectionTitle>
        <Field
          label="Medication name"
          value={form.name}
          onChangeText={(value) => update("name", value)}
        />
        <Field
          label="Dose"
          placeholder="For example, 1 tablet"
          value={form.dose}
          onChangeText={(value) => update("dose", value)}
        />
        <Field
          label="Schedule"
          placeholder="For example, morning and evening"
          value={form.schedule}
          onChangeText={(value) => update("schedule", value)}
        />
        <Field
          label="Reminder times (24-hour, comma-separated; optional)"
          placeholder="08:00, 20:00"
          value={form.reminderTimes}
          onChangeText={(value) => update("reminderTimes", value)}
        />
        {error ? <Message error>{error}</Message> : null}
        {reminderMessage ? <Message>{reminderMessage}</Message> : null}
        <Button
          title={
            saving ? "Saving..." : editing ? "Save changes" : "Add medication"
          }
          disabled={saving}
          onPress={() => void save()}
        />
        {editing ? (
          <Button title="Cancel edit" secondary onPress={clearForm} />
        ) : null}
      </Card>

      <Card>
        <SectionTitle>Your medication list</SectionTitle>
        {activeMedications.length === 0 ? (
          <Text style={styles.empty}>Medications you add will appear here.</Text>
        ) : (
          activeMedications.map((medication) => (
            <View key={medication.id} style={styles.item}>
              <Text style={styles.name}>{medication.name}</Text>
              <Text style={styles.details}>
                {medication.dose} | {medication.schedule}
              </Text>
              {medication.reminderTimes.length > 0 ? (
                <Text style={styles.details}>
                  Reminders: {medication.reminderTimes.join(", ")}
                </Text>
              ) : null}
              <View style={styles.actions}>
                <Button
                  title="Edit"
                  secondary
                  onPress={() => {
                    setEditing(medication);
                    setForm({
                      name: medication.name,
                      dose: medication.dose,
                      schedule: medication.schedule,
                      reminderTimes: medication.reminderTimes.join(", "),
                    });
                    setError("");
                  }}
                />
                <Button
                  title="Delete"
                  danger
                  onPress={() => void remove(medication)}
                />
              </View>
            </View>
          ))
        )}
      </Card>

      <Card>
        <SectionTitle>Recently deleted (30-day recovery)</SectionTitle>
        {deletedMedications.length === 0 ? (
          <Text style={styles.empty}>Deleted medications can be restored here.</Text>
        ) : (
          deletedMedications.map((medication) => (
            <View key={medication.id} style={styles.item}>
              <Text style={styles.name}>{medication.name}</Text>
              <Text style={styles.details}>
                Deleted {new Date(medication.deletedAt ?? "").toLocaleDateString()}
              </Text>
              <Button
                title="Restore medication"
                secondary
                onPress={() => void restore(medication)}
              />
            </View>
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
  },
  item: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: 7,
    paddingTop: 12,
  },
  name: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  details: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
});
