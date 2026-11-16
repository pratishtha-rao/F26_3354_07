import type {
  Appointment,
  DietRestriction,
  Medication,
  PatientDataSnapshot,
  RecoveryEntry,
  TestResult,
} from "../domain/types";

export interface PatientDataRepository {
  getSnapshot(): Promise<PatientDataSnapshot>;
  purgeExpiredMedications(): Promise<void>;
  saveRecoveryEntry(entry: RecoveryEntry): Promise<void>;
  saveMedication(medication: Medication): Promise<void>;
  deleteMedication(id: string): Promise<void>;
  restoreMedication(id: string): Promise<void>;
  saveAppointment(appointment: Appointment): Promise<void>;
  deleteAppointment(id: string): Promise<void>;
  saveDietRestriction(item: DietRestriction): Promise<void>;
  deleteDietRestriction(id: string): Promise<void>;
  saveTestResult(item: TestResult): Promise<void>;
  deleteTestResult(id: string): Promise<void>;
}
