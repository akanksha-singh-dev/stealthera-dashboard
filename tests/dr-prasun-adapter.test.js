/**
 * @file dr-prasun-adapter.test.js
 * @description Comprehensive automated tests for clinical wearable telemetry validation,
 *   physiological sanity checking, device identifier verification, and fleet data parsing.
 *
 * Run with: node --test tests/dr-prasun-adapter.test.js
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BLANK_TEST_FLEET,
  PHYSIOLOGICAL_BOUNDS,
  validateTelemetryPoint,
  validateBloodPressurePair,
  validateDeviceIdentifiers,
  parseDrPrasunTelemetry,
} from '../src/data/dr-prasun-adapter.js';

// ── 1. FLEET SPECIFICATION & SCHEMA INTEGRITY ────────────────────────────────
test('BLANK_TEST_FLEET — contains all 4 review watches with unique device IDs', () => {
  assert.equal(BLANK_TEST_FLEET.length, 4);
  const ids = new Set(BLANK_TEST_FLEET.map(w => w.id));
  assert.equal(ids.size, 4, 'Each watch must have a unique identifier');

  const imeis = new Set(BLANK_TEST_FLEET.map(w => w.imei));
  assert.equal(imeis.size, 4, 'Each watch must have a unique IMEI');
});

test('BLANK_TEST_FLEET — all watches have valid device telemetry schemas', () => {
  BLANK_TEST_FLEET.forEach(w => {
    assert.ok(w.id, 'Watch must have an ID');
    assert.ok(w.nickname, 'Watch must have a nickname');
    assert.ok(w.model, 'Watch must have a hardware model');
    assert.ok(w.status === 'online' || w.status === 'offline', 'Status must be online or offline');
    assert.ok(typeof w.healthScore === 'number' && w.healthScore >= 0 && w.healthScore <= 100, 'Health score must be 0-100');
    assert.ok(w.battery >= 0 && w.battery <= 100, 'Battery must be 0-100%');
    assert.ok(typeof w.heartRate === 'number' && w.heartRate > 30, 'Heart rate must be physiological');
    assert.ok(typeof w.spo2 === 'number' && w.spo2 >= 70 && w.spo2 <= 100, 'SpO2 must be in valid range');
  });
});

// ── 2. PHYSIOLOGICAL SANITY BOUNDS ───────────────────────────────────────────
test('PHYSIOLOGICAL_BOUNDS — defined with standard clinical ranges', () => {
  assert.equal(PHYSIOLOGICAL_BOUNDS.RESTING_HR.min, 30);
  assert.equal(PHYSIOLOGICAL_BOUNDS.RESTING_HR.max, 220);
  assert.equal(PHYSIOLOGICAL_BOUNDS.SPO2.min, 70);
  assert.equal(PHYSIOLOGICAL_BOUNDS.SPO2.max, 100);
  assert.equal(PHYSIOLOGICAL_BOUNDS.TEMPERATURE.min, 30.0);
  assert.equal(PHYSIOLOGICAL_BOUNDS.TEMPERATURE.max, 42.5);
  assert.equal(PHYSIOLOGICAL_BOUNDS.SYSTOLIC_BP.min, 60);
  assert.equal(PHYSIOLOGICAL_BOUNDS.DIASTOLIC_BP.max, 140);
});

// ── 3. POINT VALIDATION ──────────────────────────────────────────────────────
test('validateTelemetryPoint — accepts valid clinical measurements', () => {
  const hrRes = validateTelemetryPoint('RESTING_HR', 72);
  assert.equal(hrRes.valid, true);
  assert.equal(hrRes.value, 72);

  const spo2Res = validateTelemetryPoint('SPO2', 98);
  assert.equal(spo2Res.valid, true);
  assert.equal(spo2Res.value, 98);

  const tempRes = validateTelemetryPoint('TEMPERATURE', 36.7);
  assert.equal(tempRes.valid, true);
  assert.equal(tempRes.value, 36.7);
});

test('validateTelemetryPoint — rejects out-of-range physiological values', () => {
  // Extreme bradycardia / artifact
  const lowHr = validateTelemetryPoint('RESTING_HR', 15);
  assert.equal(lowHr.valid, false);
  assert.match(lowHr.reason, /BELOW_MIN/);

  // Severe impossible tachycardia
  const highHr = validateTelemetryPoint('RESTING_HR', 280);
  assert.equal(highHr.valid, false);
  assert.match(highHr.reason, /ABOVE_MAX/);

  // Impossible SpO2 (>100% or sensor error)
  const highSpo2 = validateTelemetryPoint('SPO2', 105);
  assert.equal(highSpo2.valid, false);
  assert.match(highSpo2.reason, /ABOVE_MAX/);

  // Hypothermic warm-up artifact (<30°C)
  const lowTemp = validateTelemetryPoint('TEMPERATURE', 22.4);
  assert.equal(lowTemp.valid, false);
  assert.match(lowTemp.reason, /BELOW_MIN/);
});

test('validateTelemetryPoint — handles NaN, null, and non-numeric inputs safely', () => {
  assert.equal(validateTelemetryPoint('RESTING_HR', null).valid, false);
  assert.equal(validateTelemetryPoint('RESTING_HR', undefined).valid, false);
  assert.equal(validateTelemetryPoint('RESTING_HR', 'CORRUPT_SIGNAL').valid, false);
  assert.equal(validateTelemetryPoint('RESTING_HR', NaN).valid, false);
});

// ── 4. BLOOD PRESSURE PAIR VALIDATION ────────────────────────────────────────
test('validateBloodPressurePair — validates realistic blood pressures', () => {
  const norm = validateBloodPressurePair(120, 80);
  assert.equal(norm.valid, true);
  assert.equal(norm.sbp, 120);
  assert.equal(norm.dbp, 80);

  const hyper = validateBloodPressurePair('145', '92');
  assert.equal(hyper.valid, true);
  assert.equal(hyper.sbp, 145);
  assert.equal(hyper.dbp, 92);
});

test('validateBloodPressurePair — rejects when Systolic does not exceed Diastolic', () => {
  const reversed = validateBloodPressurePair(80, 120);
  assert.equal(reversed.valid, false);
  assert.equal(reversed.reason, 'SBP_MUST_EXCEED_DBP');

  const equal = validateBloodPressurePair(90, 90);
  assert.equal(equal.valid, false);
  assert.equal(equal.reason, 'SBP_MUST_EXCEED_DBP');
});

test('validateBloodPressurePair — rejects when either value is out of physiological bounds', () => {
  const badSbp = validateBloodPressurePair(300, 80);
  assert.equal(badSbp.valid, false);

  const badDbp = validateBloodPressurePair(120, 10);
  assert.equal(badDbp.valid, false);
});

// ── 5. DEVICE IDENTIFIERS VALIDATION ─────────────────────────────────────────
test('validateDeviceIdentifiers — validates IMEI (15 digits)', () => {
  const valid = validateDeviceIdentifiers({ imei: '868132067168559' });
  assert.equal(valid.imei.valid, true);

  const short = validateDeviceIdentifiers({ imei: '12345' });
  assert.equal(short.imei.valid, false);

  const alpha = validateDeviceIdentifiers({ imei: '86813206716855A' });
  assert.equal(alpha.imei.valid, false);
});

test('validateDeviceIdentifiers — validates MAC address (6 hex octets)', () => {
  const validColon = validateDeviceIdentifiers({ mac: '50:c0:10:7e:10:15' });
  assert.equal(validColon.mac.valid, true);

  const validDash = validateDeviceIdentifiers({ mac: '50-C0-10-7E-10-15' });
  assert.equal(validDash.mac.valid, true);

  const invalid = validateDeviceIdentifiers({ mac: '50:c0:10:7e:10' });
  assert.equal(invalid.mac.valid, false);
});

test('validateDeviceIdentifiers — validates phone format', () => {
  const intl = validateDeviceIdentifiers({ phone: '+1 404-555-0192' });
  assert.equal(intl.phone.valid, true);

  const local = validateDeviceIdentifiers({ phone: '07827399863' });
  assert.equal(local.phone.valid, true);

  const invalid = validateDeviceIdentifiers({ phone: 'abc-phone' });
  assert.equal(invalid.phone.valid, false);
});

// ── 6. TELEMETRY INGESTION & QUALITY AUDIT ───────────────────────────────────
test('parseDrPrasunTelemetry — ingests 7-day dataset and produces complete telemetry audit', () => {
  const telemetry = parseDrPrasunTelemetry();
  assert.ok(telemetry.patient, 'Telemetry must include patient profile');
  assert.equal(telemetry.patient.id, 'DR001');

  // Verify signal arrays
  const { signals, validationSummary } = telemetry;
  assert.ok(signals.RESTING_HR.length > 50, 'Must have at least 50 valid HR readings');
  assert.ok(signals.SPO2.length > 50, 'Must have at least 50 valid SpO2 readings');
  assert.ok(signals.SYSTOLIC_BP.length > 50, 'Must have at least 50 valid SBP readings');
  assert.ok(signals.DIASTOLIC_BP.length > 50, 'Must have at least 50 valid DBP readings');
  assert.ok(signals.TEMPERATURE.length > 50, 'Must have at least 50 valid Temperature readings');

  // Verify timestamps are ordered ISO strings
  const firstTs = new Date(signals.RESTING_HR[0].timestamp).getTime();
  const lastTs = new Date(signals.RESTING_HR[signals.RESTING_HR.length - 1].timestamp).getTime();
  assert.ok(lastTs > firstTs, 'Timestamps must be forward-progressing in time');

  // Verify validation summary
  assert.ok(validationSummary, 'Validation summary must be present');
  assert.equal(validationSummary.auditStatus, 'VALIDATED_PHYSIOLOGICAL');
  assert.equal(validationSummary.invalidRows, 0, 'Clean 7-day data must have 0 invalid rows');
  assert.equal(validationSummary.overallCoveragePercent, 100);
  assert.equal(validationSummary.signalQuality.RESTING_HR.coveragePercent, 100);
});

test('parseDrPrasunTelemetry — isolates and rejects non-physiological artifact rows', () => {
  const testCsv = `timestamp,heartRate,spo2,systolicBP,diastolicBP,tempC,deviceId,nickname,model,notes
2026-10-09T08:00:00+05:30,72,98,120,78,36.4,DR001,Dr. Prasun 1,BP100CH,Normal row
2026-10-09T09:00:00+05:30,450,98,120,78,36.4,DR001,Dr. Prasun 1,BP100CH,Extreme HR artifact
2026-10-09T10:00:00+05:30,75,40,120,78,36.4,DR001,Dr. Prasun 1,BP100CH,Sensor disconnect SpO2
2026-10-09T11:00:00+05:30,76,98,80,130,36.4,DR001,Dr. Prasun 1,BP100CH,Reversed BP
2026-10-09T12:00:00+05:30,78,97,122,80,18.0,DR001,Dr. Prasun 1,BP100CH,Ambient temp drop`;

  const res = parseDrPrasunTelemetry(testCsv);
  assert.equal(res.validationSummary.totalRows, 5);
  assert.equal(res.validationSummary.validRows, 1, 'Only 1 row was completely free of anomalies');
  assert.equal(res.validationSummary.signalQuality.RESTING_HR.rejected, 1);
  assert.equal(res.validationSummary.signalQuality.SPO2.rejected, 1);
  assert.equal(res.validationSummary.signalQuality.SYSTOLIC_BP.rejected, 1);
  assert.equal(res.validationSummary.signalQuality.TEMPERATURE.rejected, 1);
});
