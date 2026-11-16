import type { VitalsEntry } from "./types";

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
  errors: string[],
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

  return { valid: errors.length === 0, errors };
}
