/**
 * @file generate-synthetic-dataset.mjs
 * @description Deterministic synthetic cohort generator for the StealthEra Health Intelligence Layer.
 *
 * Emits four artefacts from a single seed:
 *   1. src/data/synthetic/synthetic-cohort.json   - compact grid + ground-truth labels (tooling/tests)
 *   2. src/data/synthetic/synthetic-cohort.js     - same payload as an ES module (Vite + node --test)
 *   3. src/data/synthetic-scenarios.js            - drop-in loader, same shape as patient-scenarios.js
 *   4. src/data/synthetic/e4-csv/*.csv            - Empatica E4 3-row-header files for the Mode B import path
 *   5. src/data/synthetic/synthetic-cohort.validation.json - labelled-vs-observed pipeline audit
 *
 * Run: node tools/generate-synthetic-dataset.mjs
 *
 * Shape contract with src/ui/app.js (verified before writing):
 *   { id, name, age, gender, condition, postOpDay, medications, comorbidities,
 *     inActiveExercise, scenarioDescription, telemetry: { SIGNAL: [{timestamp, value}] } }
 *
 * Time grid is stored once and shared by every patient; telemetry arrays are flat value
 * lists indexed as day * SLOTS_PER_DAY + slot. The loader expands both.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ── Deterministic RNG ────────────────────────────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeGaussian(seed) {
  const rnd = mulberry32(seed);
  return (mean = 0, sd = 1) => {
    let u = 0;
    let v = 0;
    while (u === 0) u = rnd();
    while (v === 0) v = rnd();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

// ── Shared time grid ─────────────────────────────────────────────────────────
const START_ISO = '2026-09-01';
const DAYS = 14;
const SLOTS = [3, 8, 12, 16, 20, 23];
const SLOTS_PER_DAY = SLOTS.length;
const POINTS = DAYS * SLOTS_PER_DAY;

const TIME_GRID = [];
for (let d = 0; d < DAYS; d += 1) {
  for (const h of SLOTS) {
    TIME_GRID.push(`${START_ISO}T${String(h).padStart(2, '0')}:00:00.000Z`);
    const ms = Date.parse(`${START_ISO}T00:00:00.000Z`) + (d * 24 * 60 + h * 60) * 60000;
    TIME_GRID[TIME_GRID.length - 1] = new Date(ms).toISOString();
  }
}

// Hour-of-day -> circadian offset, so circadian buckets (NIGHT/MORNING/AFTERNOON/EVENING)
// each get real within-bucket spread instead of one flat value per day.
const CIRCADIAN = {
  hr: { 3: -7, 8: -2, 12: 3, 16: 5, 20: 1, 23: -4 },
  temp: { 3: -0.45, 8: -0.2, 12: 0.15, 16: 0.3, 20: 0.1, 23: -0.25 },
  hrv: { 3: 12, 8: 2, 12: -5, 16: -7, 20: -1, 23: 6 },
};

// ── Cohort profiles ──────────────────────────────────────────────────────────
const CONDITIONS = {
  infection_ssi: 'Post-Op Right Total Knee Arthroplasty (TKA)',
  cardiac_decomp: 'Heart Failure Post-Discharge Tele-Rehab',
  cardiac_masked_beta: 'HFrEF Post-Discharge with Beta-Blocker Therapy',
  mechanical_arthrofibrosis: 'Post-Op TKA with Suspected Arthrofibrosis',
  recovery_stall_plateau: 'Post-ACL Reconstruction Rehab (Flat Plateau)',
  recovery_stall_decline: 'Post-ACL Reconstruction Rehab (Losing Gains)',
  expected_recovery: 'Post-Op Total Knee Arthroplasty (Routine Recovery)',
  progress_steep_rom: 'Post-Op TKA (Strong ROM Progression)',
  exercise_benign: 'Post-Op TKA During Active Physical Therapy',
  artifact_terminal: 'Post-Op Hip Arthroplasty with Lead-Off Transient',
  artifact_contaminated_history: 'Post-Op Hip Arthroplasty with Chronic Poor Contact',
  insufficient_data: 'Post-Op TKA with Late Device Onboarding',
  missing_signals: 'Post-Stroke Rehabilitation (Limited Sensor Suite)',
  accelerated_recovery: 'Post-ACL Reconstruction Rehab (High Performer)',
};

const MEDS = {
  cardiac_decomp: ['Metoprolol Succinate 25mg', 'Furosemide 40mg', 'Sacubitril/Valsartan'],
  cardiac_masked_beta: ['Metoprolol Succinate 50mg', 'Furosemide 20mg', 'Spironolactone 25mg'],
  expected_recovery: ['Acetaminophen 1000mg', 'Rivaroxaban 10mg'],
  progress_steep_rom: ['Acetaminophen 1000mg', 'Rivaroxaban 10mg'],
  infection_ssi: ['Acetaminophen 1000mg', 'Rivaroxaban 10mg'],
  mechanical_arthrofibrosis: ['Celecoxib 200mg', 'Acetaminophen 1000mg PRN'],
  recovery_stall_plateau: ['Ibuprofen 400mg PRN'],
  recovery_stall_decline: ['Ibuprofen 400mg PRN'],
  exercise_benign: ['Acetaminophen 1000mg'],
  artifact_terminal: ['Enoxaparin 40mg'],
  artifact_contaminated_history: ['Enoxaparin 40mg'],
  insufficient_data: ['Acetaminophen 650mg'],
  missing_signals: ['Aspirin 81mg', 'Atorvastatin 40mg'],
  accelerated_recovery: ['Ibuprofen 400mg PRN'],
};

const COMORBID = {
  cardiac_decomp: ['Heart Failure with Reduced Ejection Fraction'],
  cardiac_masked_beta: ['Hypertension', 'Type 2 Diabetes'],
  expected_recovery: ['Osteoarthritis'],
  progress_steep_rom: ['Osteoarthritis'],
  infection_ssi: ['Type 2 Diabetes', 'Obesity'],
  mechanical_arthrofibrosis: ['Osteoarthritis'],
  recovery_stall_plateau: [],
  recovery_stall_decline: [],
  exercise_benign: ['Osteoarthritis'],
  artifact_terminal: ['Peripheral Neuropathy'],
  artifact_contaminated_history: ['Peripheral Neuropathy'],
  insufficient_data: [],
  missing_signals: ['Hypertension'],
  accelerated_recovery: [],
};

// Per-signal generator: value = baseline + trend(day) + circadian(hour) + noise.
// deviationStage marks where a pathological ramp begins.
const PROFILES = {
  expected_recovery: {
    n: 6,
    postOpDay: (i) => 12 + i,
    labels: {
      intent: 'EXPECTED_RECOVERY',
      expectedBands: ['LOW', 'MODERATE'],
      expectedDrivers: ['Physiological Stability', 'Rehabilitation Progression'],
      note: "Clean recovery, but the band still straddles LOW/MODERATE: _evaluateMechanicalSynergy scores rom.isDeviation without checking direction, so a healthy rising ROM can add 35 points on its own.",
    },
    signals: {
      RESTING_HR: { base: 66, sd: 2.4, circ: 'hr' },
      TEMPERATURE: { base: 36.6, sd: 0.12, circ: 'temp' },
      HRV: { base: 44, sd: 4.5, circ: 'hrv' },
      KNEE_FLEXION_ROM: { base: 62, trend: (t) => t * 2.4, sd: 1.6 },
      PAIN_SCORE: { base: 6.4, trend: (t) => -t * 0.36, sd: 0.42 },
      DAILY_STEPS: { base: 900, trend: (t) => t * 380, sd: 140 },
      GAIT_VELOCITY: { base: 0.42, trend: (t) => t * 0.045, sd: 0.035 },
      BODY_WEIGHT: { base: 78, sd: 0.35 },
      SPO2: { base: 97, sd: 0.6 },
      SWELLING_SCORE: { base: 1.4, trend: (t) => -t * 0.06, sd: 0.25 },
    },
    clamp: { PAIN_SCORE: [0, 10], SWELLING_SCORE: [0, 10], SPO2: [90, 100] },
  },

  // Regression fixture for a known fuser behaviour: _evaluateMechanicalSynergy scores
  // `rom.isDeviation` without checking direction, so a steep, *healthy* ROM gain reads
  // as mechanical risk and lifts a clean patient to MODERATE. Labelled, not hidden.
  progress_steep_rom: {
    n: 2,
    postOpDay: (i) => 24 + i * 2,
    labels: {
      intent: 'FALSE_POSITIVE_ROM_GAIN',
      expectedBands: ['LOW', 'MODERATE'],
      expectedDrivers: ['Physiological Stability', 'Rehabilitation Progression'],
      note: 'Steeper healthy ROM gain does NOT raise the score. For a linear ramp both the median and the MAD scale with slope, so the modified Z is slope-invariant and only the noise around the ramp decides whether the mechanical index trips. Compare with expected_recovery, which trips more often than this steeper cohort.',
    },
    signals: {
      RESTING_HR: { base: 63, sd: 2.2, circ: 'hr' },
      TEMPERATURE: { base: 36.5, sd: 0.11, circ: 'temp' },
      HRV: { base: 56, sd: 4.6, circ: 'hrv' },
      KNEE_FLEXION_ROM: { base: 58, trend: (t) => t * 5.6, sd: 1.2 },
      PAIN_SCORE: { base: 5.6, trend: (t) => -t * 0.42, sd: 0.4 },
      DAILY_STEPS: { base: 1200, trend: (t) => t * 500, sd: 150 },
      GAIT_VELOCITY: { base: 0.5, trend: (t) => t * 0.055, sd: 0.03 },
      BODY_WEIGHT: { base: 70, sd: 0.3 },
      SPO2: { base: 98, sd: 0.5 },
      SWELLING_SCORE: { base: 1.1, trend: (t) => -t * 0.04, sd: 0.2 },
    },
    clamp: { PAIN_SCORE: [0, 10], SWELLING_SCORE: [0, 10], SPO2: [90, 100] },
  },

  infection_ssi: {
    n: 4,
    postOpDay: (i) => 8 + i,
    labels: { intent: 'SUBACUTE_DETERIORATION', expectedBands: ['CRITICAL'], expectedDrivers: ['Systemic Infection / Inflammation Risk'] },
    signals: {
      RESTING_HR: { base: 65, circ: 'hr', sd: 2.2, ramp: { from: 0.74, perDay: 7.4, cap: 38 } },
      TEMPERATURE: { base: 36.6, circ: 'temp', sd: 0.1, ramp: { from: 0.74, perDay: 0.42, cap: 2.2 } },
      HRV: { base: 46, circ: 'hrv', sd: 4, ramp: { from: 0.74, perDay: -2.5, floor: 8 } },
      KNEE_FLEXION_ROM: { base: 64, trend: (t) => t * 3.1, sd: 1.5, ramp: { from: 0.74, perDay: -2.2 } },
      PAIN_SCORE: { base: 6.2, trend: (t) => -t * 0.3, sd: 0.4, ramp: { from: 0.74, perDay: 0.85, cap: 5.5 } },
      DAILY_STEPS: { base: 1000, trend: (t) => t * 340, sd: 150, ramp: { from: 0.74, perDay: -180, floor: 180 } },
      BODY_WEIGHT: { base: 82, sd: 0.35 },
      SPO2: { base: 96.5, sd: 0.6 },
      SWELLING_SCORE: { base: 1.5, sd: 0.25, ramp: { from: 0.74, perDay: 0.75, cap: 8 } },
    },
    clamp: { PAIN_SCORE: [0, 10], SWELLING_SCORE: [0, 10], SPO2: [85, 100], DAILY_STEPS: [0, 30000] },
  },

  mechanical_arthrofibrosis: {
    n: 3,
    postOpDay: (i) => 16 + i,
    labels: { intent: 'MONITOR_WATCH', expectedBands: ['HIGH'], expectedDrivers: ['Mechanical Joint Impairment / Arthrofibrosis Risk'] },
    signals: {
      RESTING_HR: { base: 68, circ: 'hr', sd: 2.4 },
      TEMPERATURE: { base: 36.7, circ: 'temp', sd: 0.12 },
      HRV: { base: 41, circ: 'hrv', sd: 4.2 },
      KNEE_FLEXION_ROM: { base: 60, trend: (t) => t * 1.1, sd: 1.4, ramp: { from: 0.74, perDay: -1.8, floor: 22 } },
      PAIN_SCORE: { base: 6.6, trend: (t) => -t * 0.2, sd: 0.4, ramp: { from: 0.74, perDay: 0.62, cap: 5.0 } },
      DAILY_STEPS: { base: 1400, trend: (t) => t * 200, sd: 150 },
      GAIT_VELOCITY: { base: 0.44, trend: (t) => t * 0.02, sd: 0.03 },
      BODY_WEIGHT: { base: 76, sd: 0.35 },
      SPO2: { base: 97, sd: 0.6 },
      SWELLING_SCORE: { base: 2.6, trend: (t) => -t * 0.04, sd: 0.3 },
    },
    clamp: { PAIN_SCORE: [0, 10], SWELLING_SCORE: [0, 10], SPO2: [85, 100], DAILY_STEPS: [0, 30000] },
  },

  cardiac_decomp: {
    n: 3,
    postOpDay: (i) => 9 + i,
    labels: { intent: 'SUBACUTE_DETERIORATION', expectedBands: ['CRITICAL'], expectedDrivers: ['Cardiopulmonary Decompensation / Fluid Overload Risk'] },
    signals: {
      RESTING_HR: { base: 74, circ: 'hr', sd: 2.2, ramp: { from: 0.74, perDay: 3.4, cap: 26 } },
      TEMPERATURE: { base: 36.5, circ: 'temp', sd: 0.12 },
      HRV: { base: 34, circ: 'hrv', sd: 3.6 },
      BODY_WEIGHT: { base: 84, sd: 0.3, ramp: { from: 0.74, perDay: 0.43 } },
      SPO2: { base: 96.5, sd: 0.55, ramp: { from: 0.74, perDay: -0.6, floor: 88 } },
      DAILY_STEPS: { base: 1600, trend: (t) => t * 220, sd: 150, ramp: { from: 0.74, perDay: -120, floor: 200 } },
      PAIN_SCORE: { base: 3.6, sd: 0.4 },
      KNEE_FLEXION_ROM: { base: 70, trend: (t) => t * 2.4, sd: 1.5 },
      GAIT_VELOCITY: { base: 0.5, trend: (t) => t * 0.03, sd: 0.03 },
      SWELLING_SCORE: { base: 2.0, sd: 0.25, ramp: { from: 0.74, perDay: 0.5, cap: 8 } },
    },
    clamp: { PAIN_SCORE: [0, 10], SWELLING_SCORE: [0, 10], SPO2: [80, 100], DAILY_STEPS: [0, 30000] },
  },

  cardiac_masked_beta: {
    n: 3,
    postOpDay: (i) => 13 + i,
    labels: {
      intent: 'SUBACUTE_DETERIORATION',
      expectedBands: ['CRITICAL'],
      expectedDrivers: ['Cardiopulmonary Decompensation / Fluid Overload Risk'],
      note: 'Beta-blocker blunts the tachycardic response, so RESTING_HR stays near baseline while weight gain and desaturation carry the signal.',
    },
    signals: {
      RESTING_HR: { base: 61, circ: 'hr', sd: 2.0 },
      TEMPERATURE: { base: 36.5, circ: 'temp', sd: 0.12 },
      HRV: { base: 30, circ: 'hrv', sd: 3.2, ramp: { from: 0.74, perDay: -1.4, floor: 10 } },
      BODY_WEIGHT: { base: 72, sd: 0.28, ramp: { from: 0.74, perDay: 0.5 } },
      SPO2: { base: 96, sd: 0.5, ramp: { from: 0.74, perDay: -0.65, floor: 87 } },
      DAILY_STEPS: { base: 1500, trend: (t) => t * 180, sd: 150, ramp: { from: 0.74, perDay: -130, floor: 150 } },
      PAIN_SCORE: { base: 3.2, sd: 0.4 },
      SWELLING_SCORE: { base: 2.2, sd: 0.25, ramp: { from: 0.74, perDay: 0.62, cap: 8 } },
    },
    clamp: { PAIN_SCORE: [0, 10], SWELLING_SCORE: [0, 10], SPO2: [80, 100], DAILY_STEPS: [0, 30000] },
  },

  // Documents dead scoring path: _evaluateRecoveryStallSynergy reads signal keys named
  // KNEE_FLEXION_ROM_SHIFT / DAILY_STEPS_SHIFT, but the orchestrator stores sustained
  // shifts under `sustainedShift` on the base key. The index therefore always scores 0,
  // so a textbook recovery plateau is invisible to the current fuser.
  recovery_stall_plateau: {
    n: 3,
    postOpDay: (i) => 22 + i,
    labels: {
      intent: 'PLATEAU_UNDETECTABLE',
      expectedBands: ['LOW'],
      expectedDrivers: ['Physiological Stability'],
      note: 'True 7-day plateau in ROM, steps and gait. Scores LOW because the recovery-stall index never fires.',
    },
    signals: {
      RESTING_HR: { base: 70, circ: 'hr', sd: 2.4 },
      TEMPERATURE: { base: 36.6, circ: 'temp', sd: 0.12 },
      HRV: { base: 40, circ: 'hrv', sd: 4.2 },
      KNEE_FLEXION_ROM: { base: 62, trend: (t) => t * 3.0, sd: 1.3, flat: { from: 0.5 } },
      PAIN_SCORE: { base: 6.0, trend: (t) => -t * 0.32, sd: 0.42, flat: { from: 0.5, hold: 4.6 } },
      DAILY_STEPS: { base: 900, trend: (t) => t * 340, sd: 150, flat: { from: 0.5, hold: 1500 } },
      GAIT_VELOCITY: { base: 0.44, trend: (t) => t * 0.04, sd: 0.03, flat: { from: 0.5, hold: 0.62 } },
      BODY_WEIGHT: { base: 74, sd: 0.35 },
      SPO2: { base: 97, sd: 0.6 },
      SWELLING_SCORE: { base: 2.6, sd: 0.25, flat: { from: 0.5, hold: 3.1 } },
    },
    clamp: { PAIN_SCORE: [0, 10], SWELLING_SCORE: [0, 10], SPO2: [90, 100], DAILY_STEPS: [0, 30000] },
  },

  recovery_stall_decline: {
    n: 2,
    postOpDay: (i) => 26 + i * 2,
    labels: {
      intent: 'MONITOR_WATCH',
      expectedBands: ['MODERATE', 'HIGH'],
      expectedDrivers: ['Rehabilitation Progression', 'Mechanical Joint Impairment / Arthrofibrosis Risk', 'Physiological Stability'],
      note: 'Loss of previously gained ROM plus falling activity. Reaches the care team only through the mechanical index; the recovery-stall index never fires. Where the composite lands in 25-29 the riskLevel reads MODERATE but _classifyTrajectory still returns EXPECTED_RECOVERY / Physiological Stability, because its first branch starts at 30.',
    },
    signals: {
      RESTING_HR: { base: 70, circ: 'hr', sd: 2.4 },
      TEMPERATURE: { base: 36.6, circ: 'temp', sd: 0.12 },
      HRV: { base: 40, circ: 'hrv', sd: 4.2, ramp: { from: 0.74, perDay: -1.0, floor: 12 } },
      KNEE_FLEXION_ROM: { base: 64, trend: (t) => t * 3.2, sd: 1.3, ramp: { from: 0.74, perDay: -1.7, floor: 28 } },
      PAIN_SCORE: { base: 5.6, trend: (t) => -t * 0.3, sd: 0.42, ramp: { from: 0.74, perDay: 0.42, cap: 7.6 } },
      DAILY_STEPS: { base: 1000, trend: (t) => t * 360, sd: 150, ramp: { from: 0.74, perDay: -150, floor: 300 } },
      GAIT_VELOCITY: { base: 0.46, trend: (t) => t * 0.04, sd: 0.03 },
      BODY_WEIGHT: { base: 74, sd: 0.35 },
      SPO2: { base: 97, sd: 0.6 },
      SWELLING_SCORE: { base: 2.2, sd: 0.28 },
    },
    clamp: { PAIN_SCORE: [0, 10], SWELLING_SCORE: [0, 10], SPO2: [90, 100], DAILY_STEPS: [0, 30000] },
  },

  exercise_benign: {
    n: 2,
    postOpDay: (i) => 14 + i,
    inActiveExercise: true,
    labels: {
      intent: 'EXPECTED_RECOVERY',
      expectedBands: ['LOW'],
      expectedDrivers: ['Physiological Stability'],
      note: 'Terminal HR spike is expected exertion physiology; the context fuser reclassifies it before scoring.',
    },
    signals: {
      RESTING_HR: { base: 64, circ: 'hr', sd: 2.0, spikeLast: 58 },
      TEMPERATURE: { base: 36.6, circ: 'temp', sd: 0.12 },
      HRV: { base: 52, circ: 'hrv', sd: 4.0 },
      KNEE_FLEXION_ROM: { base: 66, trend: (t) => t * 3.8, sd: 1.5 },
      PAIN_SCORE: { base: 5.8, trend: (t) => -t * 0.38, sd: 0.4 },
      DAILY_STEPS: { base: 1000, trend: (t) => t * 420, sd: 150 },
      GAIT_VELOCITY: { base: 0.45, trend: (t) => t * 0.05, sd: 0.03 },
      SPO2: { base: 97.5, sd: 0.5 },
      BODY_WEIGHT: { base: 71, sd: 0.3 },
      SWELLING_SCORE: { base: 1.2, trend: (t) => -t * 0.05, sd: 0.22 },
    },
    clamp: { PAIN_SCORE: [0, 10], SWELLING_SCORE: [0, 10], SPO2: [90, 100], DAILY_STEPS: [0, 30000] },
  },

  // detectAcuteDeviation only ever runs on the *latest* reading, so artifacts must land
  // there to exercise isArtifactNoise at all.
  artifact_terminal: {
    n: 2,
    postOpDay: (i) => 10 + i,
    labels: {
      intent: 'ARTIFACT_REJECTION',
      expectedBands: ['LOW'],
      expectedDrivers: ['Physiological Stability'],
      note: 'Terminal reading is a lead-off / motion artifact on four signals. Detector must report ARTIFACT_NOISE and hold risk at LOW.',
      terminalArtifacts: { RESTING_HR: 268, TEMPERATURE: 44.6, HRV: 1650, SPO2: 41 },
    },
    signals: {
      RESTING_HR: { base: 67, circ: 'hr', sd: 2.2 },
      TEMPERATURE: { base: 36.6, circ: 'temp', sd: 0.11 },
      HRV: { base: 43, circ: 'hrv', sd: 4.0 },
      PAIN_SCORE: { base: 5.4, trend: (t) => -t * 0.3, sd: 0.45 },
      KNEE_FLEXION_ROM: { base: 63, trend: (t) => t * 2.0, sd: 1.4 },
      DAILY_STEPS: { base: 950, trend: (t) => t * 300, sd: 160 },
      SPO2: { base: 97, sd: 0.6 },
      BODY_WEIGHT: { base: 79, sd: 0.3 },
    },
    clamp: { PAIN_SCORE: [0, 10], DAILY_STEPS: [0, 30000] },
  },

  // Counterpart: artifacts scattered through history are never filtered out of the
  // baseline itself, so median/MAD are computed on contaminated data.
  artifact_contaminated_history: {
    n: 2,
    postOpDay: (i) => 11 + i,
    labels: {
      intent: 'BASELINE_CONTAMINATION',
      expectedBands: ['LOW'],
      expectedDrivers: ['Physiological Stability'],
      note: '12% non-physiological readings spread across history. The baseline engine has no artifact filter, so median/MAD absorb them.',
      artifactRate: 0.12,
    },
    signals: {
      RESTING_HR: { base: 67, circ: 'hr', sd: 2.2 },
      TEMPERATURE: { base: 36.6, circ: 'temp', sd: 0.11 },
      HRV: { base: 43, circ: 'hrv', sd: 4.0 },
      PAIN_SCORE: { base: 5.4, trend: (t) => -t * 0.3, sd: 0.45 },
      KNEE_FLEXION_ROM: { base: 63, trend: (t) => t * 2.0, sd: 1.4 },
      DAILY_STEPS: { base: 950, trend: (t) => t * 300, sd: 160 },
      SPO2: { base: 97, sd: 0.6 },
      BODY_WEIGHT: { base: 79, sd: 0.3 },
    },
    clamp: { PAIN_SCORE: [0, 10], DAILY_STEPS: [0, 30000] },
  },

  insufficient_data: {
    n: 3,
    postOpDay: (i) => 5 + i,
    points: 8,
    labels: {
      intent: 'INSUFFICIENT_BASELINE',
      expectedBands: ['LOW', 'MODERATE'],
      expectedDrivers: ['Physiological Stability', 'Rehabilitation Progression'],
      note: 'Only 8 readings (device onboarded late). MAD estimated from 8 points is unstable, so a clean patient can still be pushed to MODERATE by noise. Below the 30-record baseline floor the score should not be trusted either way.',
    },
    signals: {
      RESTING_HR: { base: 69, circ: 'hr', sd: 2.6 },
      TEMPERATURE: { base: 36.6, circ: 'temp', sd: 0.13 },
      HRV: { base: 45, circ: 'hrv', sd: 4.6 },
      PAIN_SCORE: { base: 6.0, trend: (t) => -t * 0.3, sd: 0.5 },
      DAILY_STEPS: { base: 800, trend: (t) => t * 300, sd: 170 },
    },
    clamp: { PAIN_SCORE: [0, 10], DAILY_STEPS: [0, 30000] },
  },

  missing_signals: {
    n: 3,
    postOpDay: (i) => 18 + i,
    labels: {
      intent: 'PARTIAL_COVERAGE',
      expectedBands: ['LOW'],
      expectedDrivers: ['Physiological Stability'],
      note: 'No joint, gait, weight or PROM sensors in this suite. Absent signals must stay absent, never imputed.',
    },
    signals: {
      RESTING_HR: { base: 71, circ: 'hr', sd: 2.6 },
      TEMPERATURE: { base: 36.6, circ: 'temp', sd: 0.13 },
      HRV: { base: 39, circ: 'hrv', sd: 4.4 },
      SPO2: { base: 96.5, sd: 0.7 },
      DAILY_STEPS: { base: 1100, trend: (t) => t * 250, sd: 160 },
    },
    clamp: { SPO2: [90, 100], DAILY_STEPS: [0, 30000] },
  },

  accelerated_recovery: {
    n: 2,
    postOpDay: (i) => 20 + i * 2,
    labels: { intent: 'ACCELERATED_RECOVERY', expectedBands: ['LOW'], expectedDrivers: ['Physiological Stability'] },
    signals: {
      RESTING_HR: { base: 58, circ: 'hr', sd: 2.2 },
      TEMPERATURE: { base: 36.5, circ: 'temp', sd: 0.11 },
      HRV: { base: 68, circ: 'hrv', sd: 5.0 },
      KNEE_FLEXION_ROM: { base: 72, trend: (t) => t * 5.2, sd: 1.3 },
      PAIN_SCORE: { base: 5.2, trend: (t) => -t * 0.52, sd: 0.35 },
      DAILY_STEPS: { base: 1600, trend: (t) => t * 620, sd: 150 },
      GAIT_VELOCITY: { base: 0.55, trend: (t) => t * 0.062, sd: 0.03 },
      BODY_WEIGHT: { base: 70, sd: 0.3 },
      SPO2: { base: 98, sd: 0.5 },
      SWELLING_SCORE: { base: 1.0, trend: (t) => -t * 0.05, sd: 0.2 },
    },
    clamp: { PAIN_SCORE: [0, 10], SWELLING_SCORE: [0, 10], SPO2: [90, 100], DAILY_STEPS: [0, 30000] },
  },
};

const ARTIFACT_POOL = {
  RESTING_HR: [245, 18, 0, 310],
  TEMPERATURE: [21.5, 44.8, 0],
  HRV: [1400, 0.4, 2800],
  SPO2: [41, 63, 12],
  PAIN_SCORE: [],
};

const ROUND = {
  RESTING_HR: 1,
  TEMPERATURE: 2,
  HRV: 1,
  KNEE_FLEXION_ROM: 1,
  PAIN_SCORE: 1,
  DAILY_STEPS: 0,
  GAIT_VELOCITY: 3,
  BODY_WEIGHT: 1,
  SPO2: 1,
  SWELLING_SCORE: 1,
};

const FIRST_NAMES = ['Amara', 'Bilal', 'Celine', 'Dmitri', 'Elin', 'Farid', 'Greta', 'Henrik',
  'Ines', 'Jonas', 'Kavi', 'Lena', 'Mateo', 'Noor', 'Ola', 'Petra',
  'Quinn', 'Rosa', 'Samir', 'Tara', 'Umar', 'Vera', 'Wren', 'Xenia', 'Yusuf', 'Zara'];
const LAST_NAMES = ['Alvarsson', 'Bhatt', 'Costa', 'Dvoak', 'Eriksen', 'Fontaine', 'Gallagher',
  'Haddad', 'Ivanov', 'Jansen', 'Kowalski', 'Lindqvist', 'Moreau', 'Novak',
  'Okafor', 'Pereira', 'Reyes', 'Sorensen', 'Takahashi', 'Vasquez'];

// ── Series builder ───────────────────────────────────────────────────────────
function buildSignalSeries(signalKey, spec, gauss, artifactRate, rnd, pointCount = POINTS) {
  const out = [];
  for (let i = 0; i < pointCount; i += 1) {
    const iso = TIME_GRID[i];
    const hour = Number(iso.slice(11, 13));
    const dayF = Math.floor(i / SLOTS_PER_DAY);
    const dayProgress = dayF / (DAYS - 1);

    let value = spec.base;
    if (spec.trend) value += spec.trend(dayF);
    if (spec.circ) value += CIRCADIAN[spec.circ][hour] ?? 0;

    if (spec.ramp && dayProgress >= spec.ramp.from) {
      // Normalised progress through the deviation window, accelerated so the terminal
      // reading sits well outside a baseline median still set by the healthy majority.
      const t = (dayProgress - spec.ramp.from) / (1 - spec.ramp.from);
      let add = Math.pow(t, spec.ramp.power ?? 1.4) * spec.ramp.perDay * DAYS;
      if (spec.ramp.cap !== undefined) add = Math.min(add, spec.ramp.cap);
      if (spec.ramp.floor !== undefined) value = Math.max(value + add, spec.ramp.floor);
      else value += add;
    }

    if (spec.flat && dayProgress >= spec.flat.from) {
      const plateauDay = Math.floor(spec.flat.from * (DAYS - 1));
      const hold = spec.flat.hold ?? spec.base + (spec.trend ? spec.trend(plateauDay) : 0);
      value = hold + (spec.circ ? CIRCADIAN[spec.circ][hour] ?? 0 : 0);
    }

    value = gauss(value, spec.sd);
    out.push({ signalKey, iso, value, dayF, dayProgress });
  }

  if (spec.spikeLast) {
    const last = out[out.length - 1];
    const hour = Number(last.iso.slice(11, 13));
    last.value = spec.base + (CIRCADIAN[spec.circ]?.[hour] ?? 0) + spec.spikeLast;
  }

  if (artifactRate > 0) {
    const pool = ARTIFACT_POOL[signalKey] || [];
    if (pool.length > 0) {
      for (const point of out) {
        if (rnd() < artifactRate) {
          point.value = pool[Math.floor(rnd() * pool.length)];
          point.isArtifact = true;
        }
      }
    }
  }

  return out;
}

function summarise(series, clamp) {
  return series.map((p) => {
    const digits = ROUND[p.signalKey] ?? 1;
    if (p.isArtifact) return Number(p.value.toFixed(digits));
    let v = p.value;
    const limits = clamp[p.signalKey];
    if (limits) v = Math.min(Math.max(v, limits[0]), limits[1]);
    return Number(v.toFixed(digits));
  });
}

// ── Cohort assembly ──────────────────────────────────────────────────────────
const { DeviationDetector } = await import(
  new URL('../src/core/deviation-detector.js', import.meta.url).href
);
const detector = new DeviationDetector();

function countArtifactReadings(telemetry) {
  let n = 0;
  for (const [signalKey, values] of Object.entries(telemetry)) {
    for (const v of values) if (detector.isArtifactNoise(v, signalKey)) n += 1;
  }
  return n;
}

function buildCohort(seed) {
  const rnd = mulberry32(seed);
  const gauss = makeGaussian(seed);
  const patients = [];
  let serial = 0;

  for (const [archetype, profile] of Object.entries(PROFILES)) {
    for (let i = 0; i < profile.n; i += 1) {
      serial += 1;
      const pid = `SYN-${String(serial).padStart(3, '0')}`;
      const given = FIRST_NAMES[Math.floor(rnd() * FIRST_NAMES.length)];
      const family = LAST_NAMES[Math.floor(rnd() * LAST_NAMES.length)];
      const artifactRate = profile.labels.artifactRate ?? 0;
      const pointCount = profile.points ?? POINTS;

      const telemetry = {};
      for (const [signalKey, spec] of Object.entries(profile.signals)) {
        const series = buildSignalSeries(signalKey, spec, gauss, artifactRate, rnd, pointCount);
        telemetry[signalKey] = summarise(series, profile.clamp ?? {});
      }

      const terminalArtifacts = profile.labels.terminalArtifacts ?? {};
      for (const [signalKey, artifactValue] of Object.entries(terminalArtifacts)) {
        if (telemetry[signalKey]) {
          const arr = telemetry[signalKey];
          arr[arr.length - 1] = artifactValue;
        }
      }

      patients.push({
        id: pid,
        name: `${given} ${family}`,
        age: 42 + Math.floor(rnd() * 38),
        gender: rnd() < 0.5 ? 'Female' : 'Male',
        condition: CONDITIONS[archetype],
        postOpDay: profile.postOpDay(i),
        medications: MEDS[archetype],
        comorbidities: COMORBID[archetype],
        inActiveExercise: profile.inActiveExercise === true,
        archetype,
        scenarioDescription: profile.labels.intent.replace(/_/g, ' '),
        pointCount,
        artifactRate,
        artifactReadingCount: countArtifactReadings(telemetry),
        telemetry,
      });
    }
  }
  return patients;
}

// ── E4-format export ─────────────────────────────────────────────────────────
function toE4Csv(startUnix, hz, values) {
  const lines = [startUnix.toFixed(6), hz.toFixed(6)];
  for (const v of values) lines.push(v.toFixed(2));
  return `${lines.join('\r\n')}\r\n`;
}

function toIbiCsv(startUnix, beats) {
  const lines = [startUnix.toFixed(6)];
  for (const b of beats) lines.push(`${b.rel.toFixed(6)},${(b.ibiMs / 1000).toFixed(6)}`);
  return `${lines.join('\r\n')}\r\n`;
}

function buildE4Sessions(patients, seed) {
  const gauss = makeGaussian(seed + 7777);
  const rnd = mulberry32(seed + 1234);
  const sessions = [];
  // Two synthetic subjects, mirroring the bundled 1.5-3 h single-session shape.
  const picks = [
    { subjectId: 'S901', label: 'Final', archetype: 'expected_recovery' },
    { subjectId: 'S902', label: 'Final', archetype: 'infection_ssi' },
  ];

  for (const pick of picks) {
    const source = patients.find((p) => p.archetype === pick.archetype);
    if (!source) continue;
    const startUnix = Date.parse('2026-09-14T13:30:00.000Z') / 1000;
    const seconds = 5400 + Math.floor(rnd() * 3600);

    let hr = 72;
    const hrValues = [];
    for (let s = 0; s < seconds; s += 1) {
      const block = s / seconds;
      const stress = block > 0.35 && block < 0.62 ? 14 : 0;
      hr += gauss(0, 0.35) + (hrValues.length === 0 ? 0 : 0);
      hr = Math.min(Math.max(hr, 55), 145);
      hrValues.push(Number((hr + stress + gauss(0, 2.1)).toFixed(2)));
    }

    let temp = 33.4;
    const tempValues = [];
    const tempHz = 4;
    const tempCount = seconds * tempHz;
    for (let s = 0; s < tempCount; s += 1) {
      temp += gauss(0, 0.012);
      temp = Math.min(Math.max(temp, 25.2), 38.5);
      tempValues.push(Number(temp.toFixed(2)));
    }

    const beats = [];
    let rel = 0;
    let t = startUnix;
    while (rel < seconds) {
      const hrNow = hrValues[Math.floor(rel)] ?? 72;
      const ibiMs = Math.min(1900, Math.max(380, (60000 / hrNow) + gauss(0, 14)));
      beats.push({ rel, ibiMs });
      rel += ibiMs / 1000;
      t += ibiMs / 1000;
    }

    sessions.push({
      subjectId: pick.subjectId,
      sessionLabel: pick.label,
      archetype: pick.archetype,
      sourcePatientId: source.id,
      startISO: new Date(startUnix * 1000).toISOString(),
      durationSeconds: seconds,
      files: {
        [`S${pick.subjectId.slice(1)}_${pick.label}_HR.csv`]: toE4Csv(startUnix, 1, hrValues),
        [`S${pick.subjectId.slice(1)}_${pick.label}_TEMP.csv`]: toE4Csv(startUnix, tempHz, tempValues),
        [`S${pick.subjectId.slice(1)}_${pick.label}_IBI.csv`]: toIbiCsv(startUnix, beats),
      },
    });
  }
  return sessions;
}

// ── Emit ─────────────────────────────────────────────────────────────────────
const SEED = 20260921;
const patients = buildCohort(SEED);
const e4Sessions = buildE4Sessions(patients, SEED);

const cohort = {
  meta: {
    name: 'StealthEra Synthetic Rehabilitation Cohort',
    version: '1.0.0',
    seed: SEED,
    generatedFrom: 'tools/generate-synthetic-dataset.mjs',
    dataOrigin: 'SYNTHETIC — generated, not patient data. Not for clinical use.',
    days: DAYS,
    slotsPerDay: SLOTS_PER_DAY,
    slotHoursUtc: SLOTS,
    timeGrid: TIME_GRID,
    patientCount: patients.length,
    archetypes: Object.fromEntries(
      Object.entries(PROFILES).map(([k, v]) => [k, {
        count: v.n,
        ...v.labels,
        signals: Object.keys(v.signals),
      }]),
    ),
    signalKeys: [...new Set(patients.flatMap((p) => Object.keys(p.telemetry)))],
  },
  patients,
  e4Sessions: e4Sessions.map((s) => ({
    subjectId: s.subjectId,
    sessionLabel: s.sessionLabel,
    archetype: s.archetype,
    startISO: s.startISO,
    durationSeconds: s.durationSeconds,
    fileNames: Object.keys(s.files),
  })),
};

const OUT_DIR = join(ROOT, 'src/data/synthetic');
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'synthetic-cohort.json'), `${JSON.stringify(cohort, null, 2)}\n`);

// Module form of the same payload: JSON imports need attributes under plain Node ESM but
// are fine in Vite. Emitting a JS module keeps one payload loadable by both paths.
writeFileSync(
  join(OUT_DIR, 'synthetic-cohort.js'),
  `/* Generated by tools/generate-synthetic-dataset.mjs (seed ${SEED}) - SYNTHETIC DATA, do not edit. */\nexport const SYNTHETIC_COHORT = ${JSON.stringify(cohort, null, 2)};\n`,
);

const E4_DIR = join(OUT_DIR, 'e4-csv');
mkdirSync(E4_DIR, { recursive: true });
for (const session of e4Sessions) {
  for (const [name, text] of Object.entries(session.files)) {
    writeFileSync(join(E4_DIR, name), text);
  }
}

const scenarioModule = `/**
 * @file synthetic-scenarios.js
 * @description Generated loader for the synthetic rehabilitation cohort.
 *
 * SYNTHETIC DATA - generated by tools/generate-synthetic-dataset.mjs (seed ${SEED}).
 * Not patient data. Not for clinical use.
 *
 * Output shape matches src/data/patient-scenarios.js so the intelligence layer
 * and dashboard can consume either source unchanged.
 *
 * Do not edit by hand - regenerate instead.
 */

import { SYNTHETIC_COHORT as COHORT } from './synthetic/synthetic-cohort.js';

/** @returns {{timestamp: string, value: number}[]} expanded time series */
function expand(values) {
  return values.map((value, i) => ({
    timestamp: COHORT.meta.timeGrid[i],
    value,
  }));
}

/**
 * @param {Object} [filter]
 * @param {string[]} [filter.archetypes] - restrict to named archetypes
 * @param {number} [filter.limit]
 * @returns {Array} Patient scenarios in pipeline shape
 */
export function getSyntheticScenarios(filter = {}) {
  let list = COHORT.patients;
  if (filter.archetypes?.length) {
    const wanted = new Set(filter.archetypes);
    list = list.filter((p) => wanted.has(p.archetype));
  }
  if (filter.limit) list = list.slice(0, filter.limit);

  return list.map((p) => ({
    id: p.id,
    name: p.name,
    age: p.age,
    gender: p.gender,
    condition: p.condition,
    postOpDay: p.postOpDay,
    medications: p.medications,
    comorbidities: p.comorbidities,
    inActiveExercise: p.inActiveExercise,
    archetype: p.archetype,
    scenarioDescription: p.scenarioDescription,
    dataOrigin: COHORT.meta.dataOrigin,
    telemetry: Object.fromEntries(
      Object.entries(p.telemetry).map(([key, values]) => [key, expand(values)]),
    ),
  }));
}

/** Ground-truth labels per patient, for scoring classifier behaviour. */
export function getSyntheticGroundTruth() {
  return Object.fromEntries(
    Object.entries(COHORT.meta.archetypes).map(([archetype, spec]) => [archetype, {
      intent: spec.intent,
      expectedBands: spec.expectedBands,
      expectedDrivers: spec.expectedDrivers,
      note: spec.note ?? null,
      patientIds: COHORT.patients.filter((p) => p.archetype === archetype).map((p) => p.id),
    }]),
  );
}

/** Bundled synthetic Empatica E4 sessions (Mode B import path). */
export function getSyntheticE4Sessions() {
  return COHORT.e4Sessions;
}

export const SYNTHETIC_COHORT_META = COHORT.meta;
export default getSyntheticScenarios;
`;

writeFileSync(join(ROOT, 'src/data/synthetic-scenarios.js'), scenarioModule);

console.log(`cohort: ${patients.length} patients, ${cohort.meta.signalKeys.length} signal keys`);
console.log(`time grid: ${DAYS} days x ${SLOTS_PER_DAY} slots = ${TIME_GRID.length} points`);
for (const [k, v] of Object.entries(PROFILES)) {
  console.log(`  ${k.padEnd(26)} n=${v.n}  ${v.labels.intent}`);
}
console.log(`e4 sessions: ${e4Sessions.length} -> ${e4Sessions.flatMap((s) => Object.keys(s.files)).join(', ')}`);

// ── Self-validation: run the real pipeline over the cohort it just generated ──
async function validateAgainstPipeline() {
  const { LongitudinalHealthIntelligenceLayer } = await import(
    new URL('../src/core/health-intelligence-layer.js', import.meta.url).href
  );
  const layer = new LongitudinalHealthIntelligenceLayer();
  const rows = [];

  for (const p of patients) {
    const telemetryData = Object.fromEntries(
      Object.entries(p.telemetry).map(([key, values]) => [
        key,
        values.map((value, i) => ({ timestamp: TIME_GRID[i], value })),
      ]),
    );
    const result = layer.analyzePatient({
      patient: {
        id: p.id,
        name: p.name,
        postOpDay: p.postOpDay,
        medications: p.medications,
        comorbidities: p.comorbidities,
        inActiveExercise: p.inActiveExercise,
      },
      telemetryData,
    });

    const intent = PROFILES[p.archetype].labels;
    const artifactCount = Object.entries(result.detectedDeviations)
      .filter(([, d]) => d.severity === 'ARTIFACT_NOISE')
      .length;

    rows.push({
      id: p.id,
      archetype: p.archetype,
      expectedBand: intent.expectedBands.join('|'),
      observedBand: result.fuserReport.riskLevel,
      expectedDriver: intent.expectedDrivers.join('|'),
      observedDriver: result.fuserReport.primaryDriver,
      observedTrajectory: result.fuserReport.trajectoryClassification,
      compositeRisk: result.fuserReport.compositeRiskScore,
      indexScores: Object.fromEntries(
        Object.entries(result.fuserReport.synergyIndices).map(([k, i]) => [k, i.score]),
      ),
      latestSeverities: Object.fromEntries(
        Object.entries(result.detectedDeviations).map(([k, d]) => [k, d.severity]),
      ),
      flaggedIndices: Object.values(result.fuserReport.synergyIndices)
        .filter((i) => i.isFlagged)
        .map((i) => i.name),
      artifactSignalsRejected: artifactCount,
      bandMatch: intent.expectedBands.includes(result.fuserReport.riskLevel),
      driverMatch: intent.expectedDrivers.includes(result.fuserReport.primaryDriver),
    });
  }

  const bandHits = rows.filter((r) => r.bandMatch).length;
  const driverHits = rows.filter((r) => r.driverMatch).length;

  console.log('\nvalidation (labels are design intent; observed = actual pipeline output)');
  console.log(`  band agreement   ${bandHits}/${rows.length}  (${(bandHits / rows.length * 100).toFixed(0)}%)`);
  console.log(`  driver agreement ${driverHits}/${rows.length}  (${(driverHits / rows.length * 100).toFixed(0)}%)`);

  const byArchetype = {};
  for (const r of rows) {
    (byArchetype[r.archetype] ??= []).push(r);
  }
  for (const [arch, group] of Object.entries(byArchetype)) {
    const obs = group.map((g) => `${g.observedBand}:${g.compositeRisk}`);
    const unique = [...new Set(obs)];
    console.log(`  ${arch.padEnd(26)} exp=${String(group[0].expectedBand).padEnd(8)} obs=${unique.join('|')}  driver=${group.filter((g) => g.driverMatch).length}/${group.length}`);
  }

  writeFileSync(
    join(OUT_DIR, 'synthetic-cohort.validation.json'),
    `${JSON.stringify({ generatedFrom: 'tools/generate-synthetic-dataset.mjs', seed: SEED, bandAgreement: bandHits, driverAgreement: driverHits, total: rows.length, rows }, null, 2)}\n`,
  );
  console.log(`  wrote src/data/synthetic/synthetic-cohort.validation.json`);
}

await validateAgainstPipeline();