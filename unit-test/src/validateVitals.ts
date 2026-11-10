// Comet Care - FR-4: Daily vitals entry with range validation.
// validateVitals() checks a patient's vitals entry before it is saved
// to the shared repository. Any value outside the accepted range is
// rejected with an error message the app can show to the patient.

export interface VitalsEntry {
  heartRate: number;        // beats per minute
  systolic: number;         // mmHg (top blood pressure number)
  diastolic: number;        // mmHg (bottom blood pressure number)
  temperatureF: number;     // degrees Fahrenheit
  oxygenSaturation: number; // SpO2 percent
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface Range {
  min: number;
  max: number;
}

export const VITAL_RANGES: Record<keyof VitalsEntry, Range> = {
  heartRate: { min: 30, max: 220 },
  systolic: { min: 70, max: 250 },
  diastolic: { min: 40, max: 150 },
  temperatureF: { min: 90, max: 110 },
  oxygenSaturation: { min: 70, max: 100 },
};

function checkRange(
  name: keyof VitalsEntry,
  value: number,
  errors: string[]
): void {
  const range = VITAL_RANGES[name];

  if (typeof value !== "number" || Number.isNaN(value)) {
    errors.push(`${name} must be a number`);
    return;
  }

  if (value < range.min || value > range.max) {
    errors.push(`${name} must be between ${range.min} and ${range.max}`);
  }
}

export function validateVitals(entry: VitalsEntry): ValidationResult {
  const errors: string[] = [];

  checkRange("heartRate", entry.heartRate, errors);
  checkRange("systolic", entry.systolic, errors);
  checkRange("diastolic", entry.diastolic, errors);
  checkRange("temperatureF", entry.temperatureF, errors);
  checkRange("oxygenSaturation", entry.oxygenSaturation, errors);

  if (entry.systolic <= entry.diastolic) {
    errors.push("systolic must be greater than diastolic");
  }

  return { valid: errors.length === 0, errors: errors };
}
