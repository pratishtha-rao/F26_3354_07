import { validateVitals, VitalsEntry } from "./validateVitals";

function makeNormalEntry(): VitalsEntry {
  return {
    heartRate: 72,
    systolic: 120,
    diastolic: 80,
    temperatureF: 98.6,
    oxygenSaturation: 98,
  };
}

describe("validateVitals (FR-4)", function () {
  test("TC-1: accepts a normal vitals entry", function () {
    const result = validateVitals(makeNormalEntry());

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("TC-2: rejects a heart rate above the allowed range", function () {
    const entry = makeNormalEntry();
    entry.heartRate = 250;

    const result = validateVitals(entry);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("heartRate must be between 30 and 220");
  });

  test("TC-3: rejects systolic that is not greater than diastolic", function () {
    const entry = makeNormalEntry();
    entry.systolic = 80;
    entry.diastolic = 90;

    const result = validateVitals(entry);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("systolic must be greater than diastolic");
  });

  test("TC-4: accepts values exactly on the range boundaries", function () {
    const entry = makeNormalEntry();
    entry.heartRate = 30;
    entry.oxygenSaturation = 100;

    const result = validateVitals(entry);

    expect(result.valid).toBe(true);
  });

  test("TC-5: rejects oxygen saturation above 100%", function () {
    const entry = makeNormalEntry();
    entry.oxygenSaturation = 101;

    const result = validateVitals(entry);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("oxygenSaturation must be between 70 and 100");
  });

  test("TC-6: rejects a missing (non-number) temperature", function () {
    const entry = makeNormalEntry();
    entry.temperatureF = NaN;

    const result = validateVitals(entry);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("temperatureF must be a number");
  });

  test("TC-7: reports every invalid field, not just the first", function () {
    const entry = makeNormalEntry();
    entry.heartRate = 10;
    entry.temperatureF = 120;

    const result = validateVitals(entry);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(2);
  });
});
