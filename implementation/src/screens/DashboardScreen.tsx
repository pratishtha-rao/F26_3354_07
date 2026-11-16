import type { Appointment, PatientDataSnapshot } from "../domain/types";
import {
  Card,
  colors,
  Message,
  Page,
  SectionTitle,
  Title,
} from "../components/UI";
import { StyleSheet, Text, View } from "react-native";

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function upcomingAppointments(appointments: Appointment[]): Appointment[] {
  const now = Date.now();
  return appointments
    .filter((appointment) => new Date(appointment.scheduledAt).getTime() >= now)
    .slice(0, 3);
}

export function DashboardScreen({
  snapshot,
}: {
  snapshot: PatientDataSnapshot;
}) {
  const latest = snapshot.recoveryEntries[0];
  const nextAppointments = upcomingAppointments(snapshot.appointments);
  const activeMedicationCount = snapshot.medications.filter(
    (medication) => medication.deletedAt === null,
  ).length;

  return (
    <Page>
      <Title subtitle="A calm place to organize your recovery at home.">
        Good to see you
      </Title>

      <Message>
        Comet Care is for personal tracking and organization. It does not
        diagnose conditions or replace advice from your healthcare team.
      </Message>

      <View style={styles.summaryRow}>
        <Card>
          <Text style={styles.metric}>{activeMedicationCount}</Text>
          <Text style={styles.metricLabel}>Medications</Text>
        </Card>
        <Card>
          <Text style={styles.metric}>{snapshot.appointments.length}</Text>
          <Text style={styles.metricLabel}>Appointments</Text>
        </Card>
      </View>

      <Card>
        <SectionTitle>Latest recovery check-in</SectionTitle>
        {latest ? (
          <>
            <Text style={styles.bodyText}>{formatDate(latest.recordedAt)}</Text>
            <Text style={styles.bodyText}>
            Heart rate {latest.vitals.heartRate} bpm | Blood pressure{" "}
            {latest.vitals.systolic}/{latest.vitals.diastolic} | Pain{" "}
              {latest.painLevel}/10
            </Text>
            {latest.note ? (
              <Text style={styles.bodyText}>{latest.note}</Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.bodyText}>
            Your first vitals and journal entry will appear here.
          </Text>
        )}
      </Card>

      <Card>
        <SectionTitle>Upcoming appointments</SectionTitle>
        {nextAppointments.length > 0 ? (
          nextAppointments.map((appointment) => (
            <View key={appointment.id} style={styles.listItem}>
              <Text style={styles.itemTitle}>{appointment.title}</Text>
              <Text style={styles.bodyText}>
                {formatDate(appointment.scheduledAt)}
              </Text>
              {appointment.provider ? (
                <Text style={styles.bodyText}>{appointment.provider}</Text>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={styles.bodyText}>
            No upcoming appointments added yet.
          </Text>
        )}
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  metric: {
    color: colors.teal,
    fontSize: 25,
    fontWeight: "800",
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  bodyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  listItem: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: 3,
    paddingTop: 10,
  },
  itemTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
});
