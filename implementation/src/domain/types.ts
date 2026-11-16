export interface VitalsEntry {
  heartRate: number;
  systolic: number;
  diastolic: number;
  temperatureF: number;
  oxygenSaturation: number;
}

export interface RecoveryEntry {
  id: string;
  recordedAt: string;
  vitals: VitalsEntry;
  painLevel: number;
  symptoms: string;
  note: string;
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
  schedule: string;
  createdAt: string;
  reminderTimes: string[];
  deletedAt: string | null;
}

export interface Appointment {
  id: string;
  title: string;
  provider: string;
  location: string;
  scheduledAt: string;
  notes: string;
  reminderEnabled: boolean;
}

export type GuidanceKind = "diet" | "restriction";

export interface DietRestriction {
  id: string;
  kind: GuidanceKind;
  title: string;
  details: string;
  createdAt: string;
}

export interface TestResult {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  addedAt: string;
}

export interface PatientDataSnapshot {
  recoveryEntries: RecoveryEntry[];
  medications: Medication[];
  appointments: Appointment[];
  dietRestrictions: DietRestriction[];
  testResults: TestResult[];
}
