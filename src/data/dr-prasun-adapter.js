/**
 * @file dr-prasun-adapter.js
 * @description Ingestion adapter for Dr. Prasun 1 vitals (7-day smartwatch telemetry)
 * and the 4-watch blank test environment from Heitor's review deck.
 */

export const BLANK_TEST_FLEET = [
  {
    id: 'DR001',
    nickname: 'Dr prasun 1',
    location: 'India',
    region: 'Asia/Kolkata (GMT+5:30)',
    model: 'BP100CH',
    deviceId: '868132067168559',
    imei: '868132067168559',
    status: 'offline',
    statusNote: 'No upload 24h+',
    healthScore: 58,
    healthStatus: 'Needs Attention',
    steps: null,
    heartRate: 88,
    spo2: 96,
    tempC: 36.76,
    tempF: 98.2,
    phone: '07827399863',
    emergencyContact: 'Arnav Jain - SOS (07827399863)',
    dataTime: '16 Oct, 08:49',
    lastUpload: '16 Oct, 08:49',
    firmware: '78.1.100.34',
    network: 'LTE',
    operator: '404/10',
    simIccid: '8991102506501662479F',
    mac: '50:c0:10:7e:10:15',
    battery: 100,
    signalDbm: 16,
    uploads24h: 0,
    alarmsCount: 6,
    alarmType: 'SOS / Falls',
    category: 'Senior Living'
  },
  {
    id: 'HT002',
    nickname: 'Heitor',
    location: 'Atlanta, GA (USA)',
    region: 'America/New_York (EST)',
    model: 'BP100CH',
    deviceId: '860132067145912',
    imei: '860132067145912',
    status: 'online',
    statusNote: 'Active sync',
    healthScore: 88,
    healthStatus: 'Stable',
    steps: 6420,
    heartRate: 72,
    spo2: 98,
    tempC: 36.72,
    tempF: 98.1,
    phone: '+1 404-555-0192',
    emergencyContact: 'Local Support (+1 404-555-0100)',
    dataTime: 'Today, 10:14',
    lastUpload: 'Today, 10:14',
    firmware: '78.1.100.34',
    network: 'LTE',
    operator: 'AT&T 310/410',
    simIccid: '8901410321551662991A',
    mac: '50:c0:10:7e:14:22',
    battery: 84,
    signalDbm: 22,
    uploads24h: 48,
    alarmsCount: 0,
    alarmType: 'None',
    category: 'Executive Pilot'
  },
  {
    id: 'JS003',
    nickname: 'Joseph',
    location: 'Dallas, TX (USA)',
    region: 'America/Chicago (CST)',
    model: 'BP100CH',
    deviceId: '860132067147531',
    imei: '860132067147531',
    status: 'online',
    statusNote: 'Active sync',
    healthScore: 92,
    healthStatus: 'Optimal',
    steps: 7850,
    heartRate: 68,
    spo2: 99,
    tempC: 36.61,
    tempF: 97.9,
    phone: '+1 214-555-0144',
    emergencyContact: 'Medical Alert (+1 214-555-0199)',
    dataTime: 'Today, 10:18',
    lastUpload: 'Today, 10:18',
    firmware: '78.1.100.34',
    network: 'LTE',
    operator: 'Verizon 311/480',
    simIccid: '8914801121551662442B',
    mac: '50:c0:10:7e:19:80',
    battery: 92,
    signalDbm: 25,
    uploads24h: 48,
    alarmsCount: 0,
    alarmType: 'None',
    category: 'Executive Pilot'
  },
  {
    id: 'GL004',
    nickname: 'Guilherme',
    location: 'Boston, MA (USA)',
    region: 'America/New_York (EST)',
    model: 'BP100CH',
    deviceId: '860132067146247',
    imei: '860132067146247',
    status: 'online',
    statusNote: 'Active sync',
    healthScore: 84,
    healthStatus: 'Good',
    steps: 5120,
    heartRate: 75,
    spo2: 97,
    tempC: 36.89,
    tempF: 98.4,
    phone: '+1 617-555-0188',
    emergencyContact: 'Emergency Care (+1 617-555-0111)',
    dataTime: 'Today, 10:05',
    lastUpload: 'Today, 10:05',
    firmware: '78.1.100.34',
    network: 'LTE',
    operator: 'T-Mobile 310/260',
    simIccid: '8926001121551662773C',
    mac: '50:c0:10:7e:21:04',
    battery: 76,
    signalDbm: 19,
    uploads24h: 46,
    alarmsCount: 0,
    alarmType: 'None',
    category: 'Clinical Advisor'
  }
];

export const DR_PRASUN_RAW_CSV = `timestamp,heart_rate_bpm,spo2_pct,systolic_bp_mmhg,diastolic_bp_mmhg,temperature_degC,patient_id,patient_name,device_model,notes
2026-10-09T07:00:00+05:30,68,98,118,76,36.2,DR001,Dr. Prasun 1,BP100CH,Morning resting
2026-10-09T08:00:00+05:30,72,97,122,78,36.3,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-09T09:00:00+05:30,76,97,124,80,36.4,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-09T10:00:00+05:30,80,97,126,81,36.5,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-09T11:00:00+05:30,83,97,128,82,36.5,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-09T12:00:00+05:30,85,97,129,83,36.6,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-09T13:00:00+05:30,86,97,130,84,36.7,DR001,Dr. Prasun 1,BP100CH,Post-lunch
2026-10-09T14:00:00+05:30,88,97,132,85,36.7,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-09T15:00:00+05:30,90,96,134,86,36.7,DR001,Dr. Prasun 1,BP100CH,Afternoon peak
2026-10-09T16:00:00+05:30,88,97,132,85,36.7,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-09T17:00:00+05:30,85,97,130,84,36.6,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-09T18:00:00+05:30,82,97,127,82,36.5,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-09T19:00:00+05:30,78,98,122,80,36.4,DR001,Dr. Prasun 1,BP100CH,Evening
2026-10-09T20:00:00+05:30,74,98,118,77,36.3,DR001,Dr. Prasun 1,BP100CH,Evening resting
2026-10-10T07:00:00+05:30,70,98,120,77,36.2,DR001,Dr. Prasun 1,BP100CH,Morning resting
2026-10-10T08:00:00+05:30,74,97,123,79,36.3,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-10T09:00:00+05:30,79,97,126,81,36.4,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-10T10:00:00+05:30,83,97,128,82,36.5,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-10T11:00:00+05:30,86,96,130,83,36.6,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-10T12:00:00+05:30,88,96,132,84,36.6,DR001,Dr. Prasun 1,BP100CH,Post-lunch
2026-10-10T13:00:00+05:30,90,96,134,85,36.7,DR001,Dr. Prasun 1,BP100CH,Slightly active
2026-10-10T14:00:00+05:30,92,96,136,86,36.7,DR001,Dr. Prasun 1,BP100CH,Slightly active
2026-10-10T15:00:00+05:30,93,96,137,87,36.7,DR001,Dr. Prasun 1,BP100CH,Afternoon peak
2026-10-10T16:00:00+05:30,91,97,135,86,36.6,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-10T17:00:00+05:30,88,97,132,84,36.6,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-10T18:00:00+05:30,85,97,129,83,36.5,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-10T19:00:00+05:30,80,98,124,80,36.4,DR001,Dr. Prasun 1,BP100CH,Evening
2026-10-10T20:00:00+05:30,76,98,120,78,36.3,DR001,Dr. Prasun 1,BP100CH,Evening resting
2026-10-11T07:00:00+05:30,72,97,122,78,36.3,DR001,Dr. Prasun 1,BP100CH,Morning resting
2026-10-11T08:00:00+05:30,78,97,126,80,36.4,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-11T09:00:00+05:30,84,96,130,83,36.5,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-11T10:00:00+05:30,88,96,134,85,36.5,DR001,Dr. Prasun 1,BP100CH,Active
2026-10-11T11:00:00+05:30,90,96,136,86,36.6,DR001,Dr. Prasun 1,BP100CH,Active
2026-10-11T12:00:00+05:30,92,96,138,87,36.7,DR001,Dr. Prasun 1,BP100CH,Active
2026-10-11T13:00:00+05:30,93,95,140,88,36.7,DR001,Dr. Prasun 1,BP100CH,High activity
2026-10-11T14:00:00+05:30,95,95,142,89,36.8,DR001,Dr. Prasun 1,BP100CH,High activity
2026-10-11T15:00:00+05:30,96,95,143,90,36.8,DR001,Dr. Prasun 1,BP100CH,Afternoon peak - exercise
2026-10-11T16:00:00+05:30,94,96,141,88,36.7,DR001,Dr. Prasun 1,BP100CH,Cooling down
2026-10-11T17:00:00+05:30,90,96,137,86,36.6,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-11T18:00:00+05:30,86,97,132,84,36.5,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-11T19:00:00+05:30,82,97,126,81,36.4,DR001,Dr. Prasun 1,BP100CH,Evening
2026-10-11T20:00:00+05:30,78,98,122,79,36.3,DR001,Dr. Prasun 1,BP100CH,Evening resting
2026-10-12T07:00:00+05:30,66,98,115,74,36.2,DR001,Dr. Prasun 1,BP100CH,Morning resting - rest day
2026-10-12T08:00:00+05:30,70,98,118,76,36.2,DR001,Dr. Prasun 1,BP100CH,Rest day
2026-10-12T09:00:00+05:30,74,98,120,78,36.3,DR001,Dr. Prasun 1,BP100CH,Rest day
2026-10-12T10:00:00+05:30,77,97,122,79,36.4,DR001,Dr. Prasun 1,BP100CH,Rest day
2026-10-12T11:00:00+05:30,79,97,124,80,36.5,DR001,Dr. Prasun 1,BP100CH,Rest day
2026-10-12T12:00:00+05:30,81,97,126,81,36.5,DR001,Dr. Prasun 1,BP100CH,Rest day
2026-10-12T13:00:00+05:30,82,97,127,82,36.6,DR001,Dr. Prasun 1,BP100CH,Post-lunch
2026-10-12T14:00:00+05:30,83,97,128,82,36.6,DR001,Dr. Prasun 1,BP100CH,Rest day
2026-10-12T15:00:00+05:30,84,97,129,83,36.6,DR001,Dr. Prasun 1,BP100CH,Rest day
2026-10-12T16:00:00+05:30,83,97,128,82,36.6,DR001,Dr. Prasun 1,BP100CH,Rest day
2026-10-12T17:00:00+05:30,81,98,126,81,36.5,DR001,Dr. Prasun 1,BP100CH,Rest day
2026-10-12T18:00:00+05:30,79,98,124,80,36.4,DR001,Dr. Prasun 1,BP100CH,Rest day
2026-10-12T19:00:00+05:30,75,98,120,78,36.3,DR001,Dr. Prasun 1,BP100CH,Evening
2026-10-12T20:00:00+05:30,71,99,116,75,36.2,DR001,Dr. Prasun 1,BP100CH,Evening resting
2026-10-13T07:00:00+05:30,74,97,126,82,36.3,DR001,Dr. Prasun 1,BP100CH,Morning - stress day
2026-10-13T08:00:00+05:30,80,97,130,84,36.4,DR001,Dr. Prasun 1,BP100CH,Stress / high workload
2026-10-13T09:00:00+05:30,86,96,135,86,36.5,DR001,Dr. Prasun 1,BP100CH,Elevated
2026-10-13T10:00:00+05:30,90,96,138,88,36.6,DR001,Dr. Prasun 1,BP100CH,Elevated
2026-10-13T11:00:00+05:30,94,95,142,90,36.7,DR001,Dr. Prasun 1,BP100CH,Elevated
2026-10-13T12:00:00+05:30,97,95,145,92,36.8,DR001,Dr. Prasun 1,BP100CH,High stress peak
2026-10-13T13:00:00+05:30,99,95,147,93,36.8,DR001,Dr. Prasun 1,BP100CH,High stress peak
2026-10-13T14:00:00+05:30,102,94,150,94,36.9,DR001,Dr. Prasun 1,BP100CH,Maximum today - stress + exertion
2026-10-13T15:00:00+05:30,100,95,148,93,36.8,DR001,Dr. Prasun 1,BP100CH,Elevated
2026-10-13T16:00:00+05:30,96,95,144,91,36.7,DR001,Dr. Prasun 1,BP100CH,Decreasing
2026-10-13T17:00:00+05:30,91,96,138,88,36.6,DR001,Dr. Prasun 1,BP100CH,Decreasing
2026-10-13T18:00:00+05:30,86,97,133,85,36.5,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-13T19:00:00+05:30,82,97,128,82,36.4,DR001,Dr. Prasun 1,BP100CH,Evening
2026-10-13T20:00:00+05:30,78,98,124,80,36.3,DR001,Dr. Prasun 1,BP100CH,Evening resting
2026-10-14T07:00:00+05:30,70,98,120,77,36.2,DR001,Dr. Prasun 1,BP100CH,Morning resting - recovering
2026-10-14T08:00:00+05:30,74,97,124,79,36.3,DR001,Dr. Prasun 1,BP100CH,Recovering
2026-10-14T09:00:00+05:30,78,97,127,81,36.4,DR001,Dr. Prasun 1,BP100CH,Recovering
2026-10-14T10:00:00+05:30,82,97,130,83,36.5,DR001,Dr. Prasun 1,BP100CH,Recovering
2026-10-14T11:00:00+05:30,85,97,132,84,36.5,DR001,Dr. Prasun 1,BP100CH,Recovering
2026-10-14T12:00:00+05:30,87,96,134,85,36.6,DR001,Dr. Prasun 1,BP100CH,Recovering
2026-10-14T13:00:00+05:30,88,96,135,86,36.6,DR001,Dr. Prasun 1,BP100CH,Post-lunch
2026-10-14T14:00:00+05:30,90,96,137,87,36.7,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-14T15:00:00+05:30,91,96,138,87,36.7,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-14T16:00:00+05:30,89,97,136,86,36.6,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-14T17:00:00+05:30,86,97,133,84,36.5,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-14T18:00:00+05:30,83,97,129,82,36.5,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-14T19:00:00+05:30,79,98,124,80,36.4,DR001,Dr. Prasun 1,BP100CH,Evening
2026-10-14T20:00:00+05:30,75,98,120,78,36.3,DR001,Dr. Prasun 1,BP100CH,Evening resting
2026-10-15T07:00:00+05:30,71,98,118,76,36.2,DR001,Dr. Prasun 1,BP100CH,Morning resting
2026-10-15T08:00:00+05:30,75,98,122,78,36.3,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-15T09:00:00+05:30,80,97,126,81,36.4,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-15T10:00:00+05:30,84,97,129,83,36.5,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-15T11:00:00+05:30,87,97,132,84,36.5,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-15T12:00:00+05:30,89,97,134,85,36.6,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-15T13:00:00+05:30,91,96,136,86,36.6,DR001,Dr. Prasun 1,BP100CH,Post-lunch
2026-10-15T14:00:00+05:30,93,96,138,87,36.7,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-15T15:00:00+05:30,95,96,140,88,36.7,DR001,Dr. Prasun 1,BP100CH,Active
2026-10-15T16:00:00+05:30,102,96,148,92,36.8,DR001,Dr. Prasun 1,BP100CH,Exercise spike - MAXIMUM TODAY
2026-10-15T17:00:00+05:30,90,97,136,86,36.6,DR001,Dr. Prasun 1,BP100CH,Post-exercise cooling down
2026-10-15T18:00:00+05:30,85,97,131,83,36.5,DR001,Dr. Prasun 1,BP100CH,Normal
2026-10-15T19:00:00+05:30,80,98,125,80,36.4,DR001,Dr. Prasun 1,BP100CH,Evening
2026-10-15T20:00:00+05:30,75,98,120,77,36.3,DR001,Dr. Prasun 1,BP100CH,Evening resting`;

/**
 * Physiological validation bounds for clinical smart wearables.
 * Used for artifact rejection, sensor disconnect flagging, and quality score computation.
 */
export const PHYSIOLOGICAL_BOUNDS = {
  RESTING_HR: { min: 30, max: 220, unit: 'bpm', label: 'Heart Rate' },
  SPO2: { min: 70, max: 100, unit: '%', label: 'Blood Oxygen (SpO₂)' },
  SYSTOLIC_BP: { min: 60, max: 240, unit: 'mmHg', label: 'Systolic BP' },
  DIASTOLIC_BP: { min: 30, max: 140, unit: 'mmHg', label: 'Diastolic BP' },
  TEMPERATURE: { min: 30.0, max: 42.5, unit: '°C', label: 'Skin Temperature' },
  STRESS: { min: 0, max: 100, unit: 'index', label: 'Stress Index' }
};

/**
 * Validates a single telemetry data point against clinical physiological boundaries.
 * @param {string} signalKey - Key corresponding to PHYSIOLOGICAL_BOUNDS
 * @param {number|string} value - Raw measurement value
 * @returns {{ valid: boolean, reason?: string, value?: number }}
 */
export function validateTelemetryPoint(signalKey, value) {
  const bounds = PHYSIOLOGICAL_BOUNDS[signalKey];
  if (!bounds) return { valid: true, value: Number(value) };
  if (value === null || value === undefined || isNaN(Number(value))) {
    return { valid: false, reason: 'MISSING_OR_NAN' };
  }
  const num = Number(value);
  if (num < bounds.min) {
    return { valid: false, reason: `BELOW_MIN_${bounds.min}_${bounds.unit}`, value: num };
  }
  if (num > bounds.max) {
    return { valid: false, reason: `ABOVE_MAX_${bounds.max}_${bounds.unit}`, value: num };
  }
  return { valid: true, value: num };
}

/**
 * Validates blood pressure pair (checks individual bounds and ensures SBP > DBP).
 * @param {number|string} sbp - Systolic BP
 * @param {number|string} dbp - Diastolic BP
 * @returns {{ valid: boolean, reason?: string, sbp?: number, dbp?: number }}
 */
export function validateBloodPressurePair(sbp, dbp) {
  const sbpVal = validateTelemetryPoint('SYSTOLIC_BP', sbp);
  const dbpVal = validateTelemetryPoint('DIASTOLIC_BP', dbp);
  if (!sbpVal.valid || !dbpVal.valid) {
    return { valid: false, reason: 'INDIVIDUAL_BP_INVALID', sbpVal, dbpVal };
  }
  if (Number(sbp) <= Number(dbp)) {
    return { valid: false, reason: 'SBP_MUST_EXCEED_DBP', sbp: Number(sbp), dbp: Number(dbp) };
  }
  return { valid: true, sbp: Number(sbp), dbp: Number(dbp) };
}

/**
 * Validates device identifiers (IMEI, MAC, Phone).
 * @param {{ imei?: string, mac?: string, phone?: string }} identifiers
 * @returns {Record<string, { valid: boolean, value: string, type: string }>}
 */
export function validateDeviceIdentifiers({ imei, mac, phone } = {}) {
  const results = {};
  if (imei !== undefined) {
    const s = String(imei).trim();
    results.imei = {
      valid: /^\d{15}$/.test(s),
      value: s,
      type: 'IMEI (15 numeric digits)'
    };
  }
  if (mac !== undefined) {
    const s = String(mac).trim();
    results.mac = {
      valid: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(s),
      value: s,
      type: 'MAC (Standard 6-octet hex)'
    };
  }
  if (phone !== undefined) {
    const s = String(phone).trim();
    results.phone = {
      valid: /^[+0-9\s\-()]{7,20}$/.test(s),
      value: s,
      type: 'E.164 / International Phone'
    };
  }
  return results;
}

export function parseDrPrasunTelemetry(rawCsv = DR_PRASUN_RAW_CSV) {
  const lines = rawCsv.trim().split('\n');
  const header = lines[0].split(',');
  
  const hr = [];
  const spo2 = [];
  const sbp = [];
  const dbp = [];
  const temp = [];

  const quality = {
    RESTING_HR: { total: 0, valid: 0, rejected: 0, rejectedReasons: [] },
    SPO2: { total: 0, valid: 0, rejected: 0, rejectedReasons: [] },
    SYSTOLIC_BP: { total: 0, valid: 0, rejected: 0, rejectedReasons: [] },
    DIASTOLIC_BP: { total: 0, valid: 0, rejected: 0, rejectedReasons: [] },
    TEMPERATURE: { total: 0, valid: 0, rejected: 0, rejectedReasons: [] }
  };

  let totalRows = 0;
  let validRows = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length < 6) continue;
    totalRows++;

    const ts = parts[0];
    const rawHr = parseFloat(parts[1]);
    const rawSpo2 = parseFloat(parts[2]);
    const rawSbp = parseFloat(parts[3]);
    const rawDbp = parseFloat(parts[4]);
    const rawTemp = parseFloat(parts[5]);

    // Validation checks
    const vHr = validateTelemetryPoint('RESTING_HR', rawHr);
    quality.RESTING_HR.total++;
    if (vHr.valid) {
      quality.RESTING_HR.valid++;
      hr.push({ timestamp: ts, value: vHr.value });
    } else {
      quality.RESTING_HR.rejected++;
      quality.RESTING_HR.rejectedReasons.push({ timestamp: ts, reason: vHr.reason });
    }

    const vSpo2 = validateTelemetryPoint('SPO2', rawSpo2);
    quality.SPO2.total++;
    if (vSpo2.valid) {
      quality.SPO2.valid++;
      spo2.push({ timestamp: ts, value: vSpo2.value });
    } else {
      quality.SPO2.rejected++;
      quality.SPO2.rejectedReasons.push({ timestamp: ts, reason: vSpo2.reason });
    }

    const vBp = validateBloodPressurePair(rawSbp, rawDbp);
    quality.SYSTOLIC_BP.total++;
    quality.DIASTOLIC_BP.total++;
    if (vBp.valid) {
      quality.SYSTOLIC_BP.valid++;
      quality.DIASTOLIC_BP.valid++;
      sbp.push({ timestamp: ts, value: vBp.sbp });
      dbp.push({ timestamp: ts, value: vBp.dbp });
    } else {
      quality.SYSTOLIC_BP.rejected++;
      quality.DIASTOLIC_BP.rejected++;
      quality.SYSTOLIC_BP.rejectedReasons.push({ timestamp: ts, reason: vBp.reason });
    }

    const vTemp = validateTelemetryPoint('TEMPERATURE', rawTemp);
    quality.TEMPERATURE.total++;
    if (vTemp.valid) {
      quality.TEMPERATURE.valid++;
      temp.push({ timestamp: ts, value: vTemp.value });
    } else {
      quality.TEMPERATURE.rejected++;
      quality.TEMPERATURE.rejectedReasons.push({ timestamp: ts, reason: vTemp.reason });
    }

    if (vHr.valid && vSpo2.valid && vBp.valid && vTemp.valid) {
      validRows++;
    }
  }

  // Calculate coverage percentages
  Object.keys(quality).forEach(sig => {
    const s = quality[sig];
    s.coveragePercent = s.total > 0 ? Number(((s.valid / s.total) * 100).toFixed(1)) : 0;
  });

  // Generate Stress / Pressure values (matches slide 5 & 6)
  const stressCurve = [
    { time: '10:02', value: 38 },
    { time: '11:02', value: 24 },
    { time: '12:02', value: 38 },
    { time: '13:02', value: 34 },
    { time: '14:02', value: 32 },
    { time: '15:02', value: 35 },
    { time: '16:02', value: 37 },
    { time: '17:02', value: 25 },
    { time: '18:02', value: 23 }
  ];

  return {
    patient: {
      id: 'DR001',
      name: 'Dr prasun 1',
      age: 74,
      gender: 'Male',
      condition: 'Senior Living Remote Tele-Care',
      postOpDay: null,
      medications: ['Amlodipine 5mg', 'Metformin 500mg'],
      comorbidities: ['Hypertension', 'History of recurrent falls'],
      inActiveExercise: false
    },
    signals: {
      RESTING_HR: hr,
      SPO2: spo2,
      SYSTOLIC_BP: sbp,
      DIASTOLIC_BP: dbp,
      TEMPERATURE: temp
    },
    stress: {
      latestValue: 23,
      avgPressure: 31,
      stressLevel: 'Normal',
      confidencePct: 98,
      curve: stressCurve
    },
    safetyEvents: [
      { id: 'SOS-01', timestamp: '16 Oct, 08:35', type: 'Fall Impact Vector (3.8g)', action: 'Automated Alert sent to Arnav Jain' },
      { id: 'SOS-02', timestamp: '16 Oct, 08:38', type: 'SOS Physical Button Press', action: 'Resident triggered emergency dispatch' },
      { id: 'SOS-03', timestamp: '16 Oct, 08:41', type: 'Prolonged Immobility Alert', action: 'Zero step activity detected' },
      { id: 'SOS-04', timestamp: '16 Oct, 08:44', type: 'SOS Repeat Alert', action: 'Secondary escalation triggered' },
      { id: 'SOS-05', timestamp: '16 Oct, 08:47', type: 'SOS Repeat Alert', action: 'Tertiary priority escalation' },
      { id: 'SOS-06', timestamp: '16 Oct, 08:49', type: 'Watch Power / Signal Loss', action: 'Watch offline >24h transition' }
    ],
    validationSummary: {
      totalRows,
      validRows,
      invalidRows: totalRows - validRows,
      overallCoveragePercent: totalRows > 0 ? Number(((validRows / totalRows) * 100).toFixed(1)) : 0,
      signalQuality: quality,
      auditStatus: 'VALIDATED_PHYSIOLOGICAL',
      auditTimestamp: new Date().toISOString()
    }
  };
}

