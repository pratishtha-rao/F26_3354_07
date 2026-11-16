import {
  LocalPatientDataRepository,
  type KeyValueStore,
} from "../../implementation/src/repositories/LocalPatientDataRepository";
import type {
  Appointment,
  DietRestriction,
  Medication,
  RecoveryEntry,
  TestResult,
} from "../../implementation/src/domain/types";

class MemoryStore implements KeyValueStore {
  private readonly values = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }
}

const medication: Medication = {
  id: "med-1",
  name: "Medication",
  dose: "1 tablet",
  schedule: "Morning",
  createdAt: "2026-01-01T10:00:00.000Z",
  reminderTimes: ["08:00"],
  deletedAt: null,
};

const appointment: Appointment = {
  id: "visit-1",
  title: "Follow-up",
  provider: "Care team",
  location: "Clinic",
  scheduledAt: "2026-02-01T10:00:00.000Z",
  notes: "",
  reminderEnabled: true,
};

const dietRestriction: DietRestriction = {
  id: "diet-1",
  kind: "diet",
  title: "Low sodium",
  details: "Follow the discharge instructions.",
  createdAt: "2026-01-01T10:00:00.000Z",
};

const testResult: TestResult = {
  id: "result-1",
  title: "Blood work",
  fileName: "results.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1024,
  storageKey: "local:result-1",
  addedAt: "2026-01-03T10:00:00.000Z",
};

const recoveryEntry: RecoveryEntry = {
  id: "recovery-1",
  recordedAt: "2026-01-02T10:00:00.000Z",
  vitals: {
    heartRate: 72,
    systolic: 120,
    diastolic: 80,
    temperatureF: 98.6,
    oxygenSaturation: 98,
  },
  painLevel: 1,
  symptoms: "",
  note: "Feeling well",
};

describe("LocalPatientDataRepository", () => {
  test("persists recovery entries and supports medication and appointment CRUD", async () => {
    const storage = new MemoryStore();
    const repository = new LocalPatientDataRepository(storage, "test-data");

    await repository.saveRecoveryEntry(recoveryEntry);
    await repository.saveMedication(medication);
    await repository.saveAppointment(appointment);
    await repository.saveDietRestriction(dietRestriction);
    await repository.saveTestResult(testResult);
    await repository.saveMedication({ ...medication, dose: "2 tablets" });

    let snapshot = await new LocalPatientDataRepository(
      storage,
      "test-data",
    ).getSnapshot();
    expect(snapshot.recoveryEntries).toEqual([recoveryEntry]);
    expect(snapshot.medications).toEqual([{ ...medication, dose: "2 tablets" }]);
    expect(snapshot.appointments).toEqual([appointment]);
    expect(snapshot.dietRestrictions).toEqual([dietRestriction]);
    expect(snapshot.testResults).toEqual([testResult]);

    await repository.deleteMedication(medication.id);
    await repository.deleteAppointment(appointment.id);
    await repository.deleteDietRestriction(dietRestriction.id);
    await repository.deleteTestResult(testResult.id);
    snapshot = await repository.getSnapshot();
    expect(snapshot.medications[0]?.deletedAt).not.toBeNull();
    expect(snapshot.appointments).toEqual([]);
    expect(snapshot.dietRestrictions).toEqual([]);
    expect(snapshot.testResults).toEqual([]);
    await repository.restoreMedication(medication.id);
    expect((await repository.getSnapshot()).medications[0]?.deletedAt).toBeNull();
  });

  test("queues concurrent writes so no entries are lost", async () => {
    const repository = new LocalPatientDataRepository(
      new MemoryStore(),
      "concurrent-data",
    );

    await Promise.all([
      repository.saveMedication(medication),
      repository.saveAppointment(appointment),
      repository.saveRecoveryEntry(recoveryEntry),
    ]);

    const snapshot = await repository.getSnapshot();
    expect(snapshot.medications).toHaveLength(1);
    expect(snapshot.appointments).toHaveLength(1);
    expect(snapshot.recoveryEntries).toHaveLength(1);
  });

  test("reports invalid saved data instead of silently replacing it", async () => {
    const storage = new MemoryStore();
    await storage.setItem("corrupt-data", "not-json");
    const repository = new LocalPatientDataRepository(storage, "corrupt-data");

    await expect(repository.getSnapshot()).rejects.toThrow();
  });

  test("rejects oversized test-result metadata and expired medication restores", async () => {
    const repository = new LocalPatientDataRepository(
      new MemoryStore(),
      "limits-data",
    );
    await expect(
      repository.saveTestResult({
        ...testResult,
        sizeBytes: 10 * 1024 * 1024 + 1,
      }),
    ).rejects.toThrow("10 MB or smaller");

    await repository.saveMedication({
      ...medication,
      deletedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await expect(repository.restoreMedication(medication.id)).rejects.toThrow(
      "30-day recovery period",
    );
  });

  test("migrates existing local data and purges deleted medications after 30 days", async () => {
    const storage = new MemoryStore();
    await storage.setItem(
      "legacy-data",
      JSON.stringify({
        recoveryEntries: [],
        medications: [
          { ...medication, reminderTimes: undefined, deletedAt: undefined },
          {
            ...medication,
            id: "expired-medication",
            deletedAt: "2025-01-01T00:00:00.000Z",
          },
        ],
        appointments: [{ ...appointment, reminderEnabled: undefined }],
      }),
    );
    const repository = new LocalPatientDataRepository(storage, "legacy-data");

    let snapshot = await repository.getSnapshot();
    expect(snapshot.medications[0]?.reminderTimes).toEqual([]);
    expect(snapshot.medications[0]?.deletedAt).toBeNull();
    expect(snapshot.appointments[0]?.reminderEnabled).toBe(true);

    await repository.purgeExpiredMedications();
    snapshot = await repository.getSnapshot();
    expect(snapshot.medications.map((item) => item.id)).toEqual(["med-1"]);
  });
});
