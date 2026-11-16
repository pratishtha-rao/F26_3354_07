import {
  type Appointment,
  type DietRestriction,
  type Medication,
  type PatientDataSnapshot,
  type RecoveryEntry,
  type TestResult,
  type VitalsEntry,
} from "../domain/types";
import type { PatientDataRepository } from "./PatientDataRepository";

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

const STORAGE_KEY = "comet-care.patient-data.v1";
const MEDICATION_RECOVERY_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_TEST_RESULT_BYTES = 10 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isDateString(value: unknown): value is string {
  return isString(value) && !Number.isNaN(new Date(value).getTime());
}

function isVitalsEntry(value: unknown): value is VitalsEntry {
  return (
    isRecord(value) &&
    typeof value.heartRate === "number" &&
    Number.isFinite(value.heartRate) &&
    typeof value.systolic === "number" &&
    Number.isFinite(value.systolic) &&
    typeof value.diastolic === "number" &&
    Number.isFinite(value.diastolic) &&
    typeof value.temperatureF === "number" &&
    Number.isFinite(value.temperatureF) &&
    typeof value.oxygenSaturation === "number" &&
    Number.isFinite(value.oxygenSaturation)
  );
}

function isReminderTime(value: unknown): value is string {
  return isString(value) && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isRecoveryEntry(value: unknown): value is RecoveryEntry {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isDateString(value.recordedAt) &&
    isVitalsEntry(value.vitals) &&
    typeof value.painLevel === "number" &&
    Number.isInteger(value.painLevel) &&
    value.painLevel >= 0 &&
    value.painLevel <= 10 &&
    isString(value.symptoms) &&
    isString(value.note)
  );
}

function isMedication(value: unknown): value is Medication {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isString(value.dose) &&
    isString(value.schedule) &&
    isDateString(value.createdAt) &&
    Array.isArray(value.reminderTimes) &&
    value.reminderTimes.every(isReminderTime) &&
    (value.deletedAt === null || isDateString(value.deletedAt))
  );
}

function normalizeMedication(value: unknown): Medication {
  if (!isRecord(value)) {
    throw new Error("Saved medication data is invalid.");
  }
  const medication = {
    ...value,
    reminderTimes: value.reminderTimes === undefined ? [] : value.reminderTimes,
    deletedAt: value.deletedAt === undefined ? null : value.deletedAt,
  };
  if (!isMedication(medication)) {
    throw new Error("Saved medication data is invalid.");
  }
  return medication;
}

function isAppointment(value: unknown): value is Appointment {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.title) &&
    isString(value.provider) &&
    isString(value.location) &&
    isDateString(value.scheduledAt) &&
    isString(value.notes) &&
    typeof value.reminderEnabled === "boolean"
  );
}

function normalizeAppointment(value: unknown): Appointment {
  if (!isRecord(value)) {
    throw new Error("Saved appointment data is invalid.");
  }
  const appointment = {
    ...value,
    reminderEnabled:
      value.reminderEnabled === undefined ? true : value.reminderEnabled,
  };
  if (!isAppointment(appointment)) {
    throw new Error("Saved appointment data is invalid.");
  }
  return appointment;
}

function isDietRestriction(value: unknown): value is DietRestriction {
  return (
    isRecord(value) &&
    isString(value.id) &&
    (value.kind === "diet" || value.kind === "restriction") &&
    isString(value.title) &&
    isString(value.details) &&
    isDateString(value.createdAt)
  );
}

function isTestResult(value: unknown): value is TestResult {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.title) &&
    isString(value.fileName) &&
    isString(value.mimeType) &&
    typeof value.sizeBytes === "number" &&
    Number.isInteger(value.sizeBytes) &&
    value.sizeBytes >= 0 &&
    value.sizeBytes <= MAX_TEST_RESULT_BYTES &&
    isString(value.storageKey) &&
    isDateString(value.addedAt)
  );
}

function isPatientDataSnapshot(value: unknown): value is PatientDataSnapshot {
  return (
    isRecord(value) &&
    Array.isArray(value.recoveryEntries) &&
    value.recoveryEntries.every(isRecoveryEntry) &&
    Array.isArray(value.medications) &&
    value.medications.every(isMedication) &&
    Array.isArray(value.appointments) &&
    value.appointments.every(isAppointment) &&
    Array.isArray(value.dietRestrictions) &&
    value.dietRestrictions.every(isDietRestriction) &&
    Array.isArray(value.testResults) &&
    value.testResults.every(isTestResult)
  );
}

function parseSnapshot(serialized: string | null): PatientDataSnapshot {
  if (serialized === null) {
    return {
      recoveryEntries: [],
      medications: [],
      appointments: [],
      dietRestrictions: [],
      testResults: [],
    };
  }

  const parsed: unknown = JSON.parse(serialized);
  if (
    !isRecord(parsed) ||
    !Array.isArray(parsed.recoveryEntries) ||
    !Array.isArray(parsed.medications) ||
    !Array.isArray(parsed.appointments)
  ) {
    throw new Error("Saved Comet Care data is invalid and could not be loaded.");
  }

  const migrated = {
    recoveryEntries: parsed.recoveryEntries,
    medications: parsed.medications.map(normalizeMedication),
    appointments: parsed.appointments.map(normalizeAppointment),
    dietRestrictions:
      parsed.dietRestrictions === undefined ? [] : parsed.dietRestrictions,
    testResults: parsed.testResults === undefined ? [] : parsed.testResults,
  };
  if (!isPatientDataSnapshot(migrated)) {
    throw new Error("Saved Comet Care data is invalid and could not be loaded.");
  }

  return migrated;
}

function replaceById<T extends { id: string }>(items: T[], item: T): T[] {
  return [...items.filter((current) => current.id !== item.id), item];
}

export class LocalPatientDataRepository implements PatientDataRepository {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly storage: KeyValueStore,
    private readonly storageKey = STORAGE_KEY,
  ) {}

  async getSnapshot(): Promise<PatientDataSnapshot> {
    await this.writeQueue;
    return parseSnapshot(await this.storage.getItem(this.storageKey));
  }

  purgeExpiredMedications(): Promise<void> {
    const expiresBefore = Date.now() - MEDICATION_RECOVERY_MS;
    return this.update((snapshot) => ({
      ...snapshot,
      medications: snapshot.medications.filter(
        (medication) =>
          medication.deletedAt === null ||
          new Date(medication.deletedAt).getTime() > expiresBefore,
      ),
    }));
  }

  saveRecoveryEntry(entry: RecoveryEntry): Promise<void> {
    return this.update((snapshot) => ({
      ...snapshot,
      recoveryEntries: [...snapshot.recoveryEntries, entry].sort(
        (a, b) => b.recordedAt.localeCompare(a.recordedAt),
      ),
    }));
  }

  saveMedication(medication: Medication): Promise<void> {
    return this.update((snapshot) => ({
      ...snapshot,
      medications: replaceById(snapshot.medications, medication),
    }));
  }

  deleteMedication(id: string): Promise<void> {
    return this.update((snapshot) => ({
      ...snapshot,
      medications: snapshot.medications.map((item) =>
        item.id === id
          ? { ...item, deletedAt: new Date().toISOString() }
          : item,
      ),
    }));
  }

  restoreMedication(id: string): Promise<void> {
    return this.update((snapshot) => {
      const medication = snapshot.medications.find((item) => item.id === id);
      if (!medication) {
        throw new Error("Medication could not be found.");
      }
      if (
        medication.deletedAt &&
        Date.now() - new Date(medication.deletedAt).getTime() >
          MEDICATION_RECOVERY_MS
      ) {
        throw new Error("The 30-day recovery period for this medication ended.");
      }

      return {
        ...snapshot,
        medications: snapshot.medications.map((item) =>
          item.id === id ? { ...item, deletedAt: null } : item,
        ),
      };
    });
  }

  saveAppointment(appointment: Appointment): Promise<void> {
    return this.update((snapshot) => ({
      ...snapshot,
      appointments: replaceById(snapshot.appointments, appointment).sort(
        (a, b) => a.scheduledAt.localeCompare(b.scheduledAt),
      ),
    }));
  }

  deleteAppointment(id: string): Promise<void> {
    return this.update((snapshot) => ({
      ...snapshot,
      appointments: snapshot.appointments.filter((item) => item.id !== id),
    }));
  }

  saveDietRestriction(item: DietRestriction): Promise<void> {
    return this.update((snapshot) => ({
      ...snapshot,
      dietRestrictions: replaceById(snapshot.dietRestrictions, item),
    }));
  }

  deleteDietRestriction(id: string): Promise<void> {
    return this.update((snapshot) => ({
      ...snapshot,
      dietRestrictions: snapshot.dietRestrictions.filter(
        (item) => item.id !== id,
      ),
    }));
  }

  saveTestResult(item: TestResult): Promise<void> {
    if (
      !Number.isInteger(item.sizeBytes) ||
      item.sizeBytes < 0 ||
      item.sizeBytes > MAX_TEST_RESULT_BYTES
    ) {
      return Promise.reject(
        new Error("Test result file size must be a non-negative integer of 10 MB or smaller."),
      );
    }
    return this.update((snapshot) => ({
      ...snapshot,
      testResults: replaceById(snapshot.testResults, item),
    }));
  }

  deleteTestResult(id: string): Promise<void> {
    return this.update((snapshot) => ({
      ...snapshot,
      testResults: snapshot.testResults.filter((item) => item.id !== id),
    }));
  }

  private update(
    change: (snapshot: PatientDataSnapshot) => PatientDataSnapshot,
  ): Promise<void> {
    const operation = this.writeQueue.then(async () => {
      const current = parseSnapshot(await this.storage.getItem(this.storageKey));
      await this.storage.setItem(
        this.storageKey,
        JSON.stringify(change(current)),
      );
    });

    this.writeQueue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }
}
