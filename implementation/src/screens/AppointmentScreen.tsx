import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import type { Appointment } from "../domain/types";
import type { PatientDataRepository } from "../repositories/PatientDataRepository";
import {
  cancelAppointmentReminders,
  requestReminderPermission,
  scheduleAppointmentReminders,
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

interface AppointmentScreenProps {
  appointments: Appointment[];
  repository: PatientDataRepository;
  onChanged: () => Promise<void>;
}

const emptyForm = {
  title: "",
  provider: "",
  location: "",
  scheduledAt: "",
  notes: "",
};

function parseLocalDateTime(value: string): Date | null {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const date = new Date(year, month - 1, day, hour, minute);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }
  return date;
}

function toLocalDateTimeInput(value: string): string {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function AppointmentScreen({
  appointments,
  repository,
  onChanged,
}: AppointmentScreenProps) {
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [error, setError] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const update = (key: keyof typeof emptyForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const clearForm = () => {
    setForm(emptyForm);
    setEditing(null);
    setReminderEnabled(true);
  };

  const save = async () => {
    setError("");
    setReminderMessage("");
    const appointmentTime = parseLocalDateTime(form.scheduledAt);
    if (!form.title.trim() || !appointmentTime) {
      setError("Enter an appointment name and a valid date and time.");
      return;
    }

    setSaving(true);
    try {
      let permissionGranted: boolean | undefined;
      let permissionError = "";
      if (reminderEnabled) {
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
      const appointment: Appointment = {
        id:
          editing?.id ??
          `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: form.title.trim(),
        provider: form.provider.trim(),
        location: form.location.trim(),
        scheduledAt: appointmentTime.toISOString(),
        notes: form.notes.trim(),
        reminderEnabled,
      };
      await repository.saveAppointment(appointment);
      await onChanged();
      clearForm();
      try {
        const result = await scheduleAppointmentReminders(
          appointment,
          permissionGranted,
        );
        setReminderMessage(
          permissionError
            ? `${result.message} Details: ${permissionError}`
            : result.message,
        );
      } catch (scheduleError) {
        setError(
          `Appointment saved, but reminders could not be updated: ${
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
          : "The appointment could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (appointment: Appointment) => {
    setError("");
    try {
      await repository.deleteAppointment(appointment.id);
      await onChanged();
      if (editing?.id === appointment.id) {
        clearForm();
      }
      try {
        await cancelAppointmentReminders(appointment.id);
      } catch (cancelError) {
        setError(
          `Appointment deleted, but its reminder could not be canceled: ${
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
          : "The appointment could not be deleted.",
      );
    }
  };

  return (
    <Page>
      <Title subtitle="Keep track of follow-up visits and where you need to be.">
        Appointments
      </Title>
      <Message>
        Appointment reminders need notification permission. In the browser,
        reminders only work while this page stays open.
      </Message>
      <Card>
        <SectionTitle>
          {editing ? "Edit appointment" : "Add appointment"}
        </SectionTitle>
        <Field
          label="Appointment"
          value={form.title}
          onChangeText={(value) => update("title", value)}
        />
        <Field
          label="Date and time"
          placeholder="YYYY-MM-DDTHH:mm"
          value={form.scheduledAt}
          onChangeText={(value) => update("scheduledAt", value)}
        />
        <Field
          label="Provider"
          value={form.provider}
          onChangeText={(value) => update("provider", value)}
        />
        <Field
          label="Location"
          value={form.location}
          onChangeText={(value) => update("location", value)}
        />
        <Field
          label="Notes"
          multiline
          value={form.notes}
          onChangeText={(value) => update("notes", value)}
        />
        <View style={styles.reminderRow}>
          <Text style={styles.details}>Reminder notifications</Text>
          <Switch
            accessibilityLabel="Enable appointment reminders"
            value={reminderEnabled}
            onValueChange={setReminderEnabled}
          />
        </View>
        {error ? <Message error>{error}</Message> : null}
        {reminderMessage ? <Message>{reminderMessage}</Message> : null}
        <Button
          title={
            saving ? "Saving..." : editing ? "Save changes" : "Add appointment"
          }
          disabled={saving}
          onPress={() => void save()}
        />
        {editing ? (
          <Button title="Cancel edit" secondary onPress={clearForm} />
        ) : null}
      </Card>

      <Card>
        <SectionTitle>Your appointments</SectionTitle>
        {appointments.length === 0 ? (
          <Text style={styles.empty}>Appointments you add will appear here.</Text>
        ) : (
          appointments.map((appointment) => (
            <View key={appointment.id} style={styles.item}>
              <Text style={styles.name}>{appointment.title}</Text>
              <Text style={styles.details}>
                {new Date(appointment.scheduledAt).toLocaleString()}
              </Text>
              {appointment.provider ? (
                <Text style={styles.details}>{appointment.provider}</Text>
              ) : null}
              {appointment.location ? (
                <Text style={styles.details}>{appointment.location}</Text>
              ) : null}
              {appointment.notes ? (
                <Text style={styles.details}>{appointment.notes}</Text>
              ) : null}
              <View style={styles.actions}>
                <Button
                  title="Edit"
                  secondary
                  onPress={() => {
                    setEditing(appointment);
                    setForm({
                      title: appointment.title,
                      provider: appointment.provider,
                      location: appointment.location,
                      scheduledAt: toLocalDateTimeInput(
                        appointment.scheduledAt,
                      ),
                      notes: appointment.notes,
                    });
                    setReminderEnabled(appointment.reminderEnabled);
                    setError("");
                  }}
                />
                <Button
                  title="Delete"
                  danger
                  onPress={() => void remove(appointment)}
                />
              </View>
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
  reminderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
