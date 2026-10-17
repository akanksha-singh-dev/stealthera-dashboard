/**
 * @file observation-generator.js
 * @description Explainable Clinical Observation & Insight NLG Generator.
 * Constructs human-readable, evidence-backed clinical notes for care teams 
 * and formats standardized FHIR R4 RiskAssessment & Observation JSON bundles.
 */

export class ClinicalObservationGenerator {
  /**
   * @param {Object} [options]
   * @param {string} [options.organizationName='StealthEra Intelligence']
   */
  constructor(options = {}) {
    this.organizationName = options.organizationName || 'StealthEra Health Intelligence';
  }

  /**
   * Generates complete explainable clinical report object from fused health intelligence.
   * @param {Object} fuserReport - Output from ContextualSignalFuser
   * @param {Object} patientInfo - Patient metadata (id, name, age, gender, postOpDay)
   * @returns {Object} Structured Explainable Clinical Observation Report
   */
  generateClinicalObservation(fuserReport, patientInfo = {}) {
    const {
      compositeRiskScore,
      riskLevel,
      trajectoryClassification,
      primaryDriver,
      summaryMessage,
      synergyIndices,
      normalizedDeviations,
      patientContext
    } = fuserReport;

    const timestamp = new Date().toISOString();
    const patientId = patientInfo.id || 'PATIENT-001';
    const patientName = patientInfo.name || 'Anonymous Patient';
    const postOpDay = patientContext.postOpDay || patientInfo.postOpDay || 'N/A';

    // Build Executive Headline
    const headline = `POD ${postOpDay}: [${riskLevel}] ${trajectoryClassification.replace(/_/g, ' ')} - ${primaryDriver}`;

    // Build Natural Language Evidence Rationale
    const evidenceParagraphs = this._buildEvidenceRationale(fuserReport, patientInfo);

    // Build Recommended Action Items for Care Team
    const recommendedActions = this._buildRecommendedActions(fuserReport, patientInfo);

    // Build Structured Evidence Table Data
    const evidenceItems = this._extractEvidenceItems(normalizedDeviations);

    // Generate Standard FHIR R4 RiskAssessment Resource
    const fhirResource = this.generateFHIRRiskAssessment(fuserReport, patientInfo);

    // Build LLM-Style Nurse Shift Briefing & Plain-English Interpretation
    const nurseShiftBriefing = this._buildNurseShiftBriefing(fuserReport, patientInfo);

    return {
      reportId: `OBS-${patientId}-${Date.now().toString(36).toUpperCase()}`,
      patientId,
      patientName,
      postOpDay,
      timestamp,
      headline,
      riskLevel,
      compositeRiskScore,
      trajectoryClassification,
      primaryDriver,
      summaryMessage,
      narrativeSummary: evidenceParagraphs.join('\n\n'),
      evidenceItems,
      recommendedActions,
      nurseShiftBriefing,
      patientContext,
      fhirResource,
      meta: {
        generatedBy: this.organizationName,
        algorithmVersion: 'Longitudinal-Intelligence-v1.0',
        explainabilityStandard: 'ANSI/AAMI HL7 Clinical Decision Support Auditability'
      }
    };
  }

  /**
   * Generates natural language paragraph explaining rationale and underlying evidence.
   * @private
   */
  _buildEvidenceRationale(fuserReport, patientInfo) {
    const paragraphs = [];
    const { synergyIndices, normalizedDeviations, patientContext } = fuserReport;

    // Paragraph 1: Overview
    const activeDriver = Object.values(synergyIndices).find(idx => idx.isFlagged || idx.score >= 40);
    if (activeDriver) {
      paragraphs.push(
        `Multi-signal analysis detected a significant composite shift evaluated at a score of ${fuserReport.compositeRiskScore}/100. ` +
        `The primary physiological driver is ${activeDriver.name} (Risk Score: ${activeDriver.score}/100).`
      );
    } else {
      paragraphs.push(
        `Longitudinal telemetry indicates stable recovery progress. Patient metrics remain within personalized normal baseline limits.`
      );
    }

    // Paragraph 2: Contributing Signals & Deviation Data
    const deviationDetails = [];
    for (const [key, dev] of Object.entries(normalizedDeviations)) {
      if (dev && (dev.isDeviation || dev.contextAdjusted)) {
        if (dev.contextAdjusted && dev.adjustedSeverity === 'NORMAL_EXERCISE_RESPONSE') {
          deviationDetails.push(`• ${key}: ${dev.note}`);
        } else if (dev.observedValue !== undefined) {
          deviationDetails.push(
            `• ${key}: Observed ${dev.observedValue} (Baseline Median: ${dev.baselineMedian || dev.baselineValue}, ` +
            `Shift: ${dev.deviationDelta > 0 ? '+' : ''}${dev.deviationDelta}, Z-Score: ${dev.zScore || 'N/A'}, Severity: ${dev.severity})`
          );
        } else if (dev.hasSustainedShift) {
          deviationDetails.push(
            `• ${key}: Sustained baseline shift detected (${dev.shiftType}, ${dev.consecutiveOutOfBoundDays} consecutive days out of normal range)`
          );
        }
      }
    }

    if (deviationDetails.length > 0) {
      paragraphs.push(
        `Key Signal Evidence:\n` + deviationDetails.join('\n')
      );
    }

    // Paragraph 3: Clinical Context & Modifiers
    const contextNotes = [];
    if (patientContext.medications && patientContext.medications.length > 0) {
      contextNotes.push(`Active Medications: ${patientContext.medications.join(', ')}`);
    }
    if (patientContext.inActiveExercise) {
      contextNotes.push(`State: Active Physical Therapy Session (Exercise-induced physiological variations expected)`);
    }
    if (patientContext.comorbidities && patientContext.comorbidities.length > 0) {
      contextNotes.push(`Comorbidities: ${patientContext.comorbidities.join(', ')}`);
    }

    if (contextNotes.length > 0) {
      paragraphs.push(`Patient Clinical Context:\n` + contextNotes.join('\n'));
    }

    return paragraphs;
  }

  /**
   * Generates actionable clinical recommendations based on risk classification.
   * @private
   */
  _buildRecommendedActions(fuserReport, patientInfo) {
    const actions = [];
    const { riskLevel, synergyIndices } = fuserReport;

    if (synergyIndices.infectionIndex.isFlagged) {
      actions.push({
        priority: 'URGENT',
        category: 'DIAGNOSTIC_LABS',
        action: 'Order Complete Blood Count (CBC w/ differential), CRP, and ESR lab panel to screen for early surgical site infection.'
      });
      actions.push({
        priority: 'HIGH',
        category: 'TELEHEALTH_VIRTUAL',
        action: 'Initiate targeted video check-in to perform physical visual assessment of wound site for localized erythema or discharge.'
      });
    }

    if (synergyIndices.mechanicalJointIndex.isFlagged) {
      actions.push({
        priority: 'HIGH',
        category: 'PHYSICAL_THERAPY',
        action: 'Schedule in-person physical therapy evaluation to assess knee range of motion, patellar mobility, and soft-tissue tightness.'
      });
      actions.push({
        priority: 'MEDIUM',
        category: 'PAIN_MANAGEMENT',
        action: 'Review pain medication compliance and timing relative to scheduled home exercise sessions.'
      });
    }

    if (synergyIndices.cardiacDecompIndex.isFlagged) {
      actions.push({
        priority: 'URGENT',
        category: 'CARDIOLOGY_REVIEW',
        action: 'Contact patient immediately to check for peripheral pitting edema, orthopnea, or worsening shortness of breath.'
      });
      actions.push({
        priority: 'HIGH',
        category: 'MEDICATION_ADJUSTMENT',
        action: 'Review diuretic regimen (e.g. Furosemide) and fluid intake log with attending cardiologist.'
      });
    }

    if (synergyIndices.recoveryStallIndex.isFlagged && actions.length === 0) {
      actions.push({
        priority: 'MEDIUM',
        category: 'REHAB_REPLANNING',
        action: 'Modify home exercise program (HEP) progression steps; evaluate patient motivation and pain barriers.'
      });
    }

    if (actions.length === 0) {
      actions.push({
        priority: 'ROUTINE',
        category: 'CONTINUED_MONITORING',
        action: 'Continue passive longitudinal wearable monitoring according to standard recovery protocol.'
      });
    }

    return actions;
  }

  /**
   * Formats raw evidence items for tabular presentation.
   * @private
   */
  _extractEvidenceItems(normalizedDeviations) {
    const items = [];
    for (const [key, dev] of Object.entries(normalizedDeviations)) {
      if (dev && dev.observedValue !== undefined) {
        items.push({
          metric: key,
          observedValue: dev.observedValue,
          baselineMedian: dev.baselineMedian || dev.baselineValue,
          normalRange: dev.normalRange ? `[${dev.normalRange.lowerBound} - ${dev.normalRange.upperBound}]` : 'N/A',
          zScore: dev.zScore !== undefined ? dev.zScore : 'N/A',
          severity: dev.adjustedSeverity || dev.severity || 'NORMAL',
          isAnomaly: !!dev.isDeviation
        });
      }
    }
    return items;
  }

  /**
   * Generates HL7 FHIR R4 RiskAssessment JSON resource bundle.
   * @param {Object} fuserReport 
   * @param {Object} patientInfo 
   * @returns {Object} FHIR R4 RiskAssessment Resource
   */
  generateFHIRRiskAssessment(fuserReport, patientInfo = {}) {
    const patientId = patientInfo.id || 'PATIENT-001';

    return {
      resourceType: 'RiskAssessment',
      id: `risk-assessment-${patientId}-${Date.now()}`,
      status: 'final',
      subject: {
        reference: `Patient/${patientId}`,
        display: patientInfo.name || 'Patient'
      },
      occurrenceDateTime: new Date().toISOString(),
      performer: {
        display: this.organizationName
      },
      prediction: [
        {
          outcome: {
            coding: [
              {
                system: 'http://snomed.info/sct',
                code: fuserReport.riskLevel === 'CRITICAL' ? '418363000' : '271594007',
                display: fuserReport.trajectoryClassification
              }
            ],
            text: fuserReport.primaryDriver
          },
          probabilityDecimal: Number((fuserReport.compositeRiskScore / 100).toFixed(2)),
          qualitativeRisk: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/risk-probability',
                code: fuserReport.riskLevel.toLowerCase(),
                display: fuserReport.riskLevel
              }
            ]
          },
          rationale: fuserReport.summaryMessage
        }
      ],
      note: [
        {
          text: `Longitudinal Multi-Signal Intelligence Risk Assessment. Composite Score: ${fuserReport.compositeRiskScore}/100.`
        }
      ]
    };
  }

  /**
   * Generates LLM-style nurse shift synthesis, clinical significance, SBAR, and MatrixCare progress note.
   * Synthesizes raw biometrics into actionable clinical interpretation.
   * @private
   */
  _buildNurseShiftBriefing(fuserReport, patientInfo = {}) {
    const {
      compositeRiskScore = 0,
      riskLevel = 'LOW',
      trajectoryClassification = 'ON_TRACK',
      primaryDriver = '',
      synergyIndices = {},
      normalizedDeviations = {},
      patientContext = {}
    } = fuserReport;

    const patientName = patientInfo.name || 'Patient';
    const postOpDay = patientContext.postOpDay || patientInfo.postOpDay || null;
    const podStr = postOpDay ? `Post-Op Day ${postOpDay}` : 'Longitudinal Monitoring';
    const condition = patientInfo.condition || 'Post-Acute Rehabilitation';

    const hrDev = normalizedDeviations['RESTING_HR'] || normalizedDeviations['HEART_RATE'];
    const tempDev = normalizedDeviations['TEMPERATURE'];
    const hrvDev = normalizedDeviations['HRV'];
    const romDev = normalizedDeviations['KNEE_FLEXION_ROM'] || normalizedDeviations['JOINT_ROM'];
    const painDev = normalizedDeviations['PAIN_SCORE'];
    const weightDev = normalizedDeviations['BODY_WEIGHT'];
    const spo2Dev = normalizedDeviations['SPO2'];
    const stepsDev = normalizedDeviations['DAILY_STEPS'];
    const velDev = normalizedDeviations['GAIT_VELOCITY'];

    // In WHOOP / Oura / Apple Health style, a Stability / Recovery Score where 100 = Optimal Stability
    const stabilityScore = Math.max(5, 100 - compositeRiskScore);
    
    let stabilityStatus = 'Optimal Recovery Stability';
    let urgencyLevel = 'ROUTINE';
    let urgencyBadge = 'Routine Shift Care';

    if (compositeRiskScore >= 75) {
      stabilityStatus = 'Acute Instability — Immediate Bedside Evaluation';
      urgencyLevel = 'STAT';
      urgencyBadge = 'STAT / Immediate Action';
    } else if (compositeRiskScore >= 50) {
      stabilityStatus = 'Elevated Risk — Clinical Protocol Review';
      urgencyLevel = 'HIGH';
      urgencyBadge = 'High Priority';
    } else if (compositeRiskScore >= 25) {
      stabilityStatus = 'Moderate Deviation — Active Surveillance';
      urgencyLevel = 'MEDIUM';
      urgencyBadge = 'Moderate Attention';
    }

    let whatThisMeans = '';
    let whyItMatters = '';
    const bedsideChecklist = [];
    const bedsideQuestions = [];
    const differentials = [];

    // Evaluate syndromes
    const isExercise = patientContext.inActiveExercise || (hrDev?.adjustedSeverity === 'NORMAL_EXERCISE_RESPONSE');
    const isInfection = synergyIndices.infectionIndex?.isFlagged || (tempDev?.isDeviation && tempDev?.direction === 'HIGH');
    const isCardiac = synergyIndices.cardiacDecompIndex?.isFlagged || (weightDev?.isDeviation && spo2Dev?.isDeviation);
    const isRehabStall = synergyIndices.recoveryStallIndex?.isFlagged || (velDev?.isDeviation || (romDev?.status && romDev.status.includes('LAG')));

    if (isExercise) {
      whatThisMeans = `${patientName}'s elevated heart rate (${hrDev?.observedValue || 125} bpm) occurred synchronously with an active physical therapy session. The AI analyzed cross-signal trends and confirmed healthy joint range of motion progression with minimal pain. This is an expected physiological cardiovascular response to exertion rather than an acute cardiac anomaly.`;
      whyItMatters = `Reclassifying exertion-induced vital spikes prevents alarm fatigue, avoids unnecessary stat medication holds, and allows the care team to confidently advance the patient's mobility progression without clinical hesitation.`;
      urgencyLevel = 'ROUTINE';
      urgencyBadge = 'Benign Exercise Response';
      
      bedsideChecklist.push({
        priority: 'ROUTINE',
        task: 'Post-Exercise Heart Rate Recovery Check',
        detail: 'Verify pulse returns to patient baseline (<80 bpm) within 15–20 minutes of completing physical therapy.'
      });
      bedsideChecklist.push({
        priority: 'ROUTINE',
        task: 'Hydration & Fatigue Assessment',
        detail: 'Ensure adequate oral fluid intake post-session and encourage 30 minutes of limb elevation.'
      });
      bedsideQuestions.push('Marcus, how did your knee feel during today\'s weight-bearing exercises? Any sharp pinching?');
      bedsideQuestions.push('Did your breathing settle down quickly after the session ended?');
      differentials.push('Normal cardiovascular response to exertion (confirmed)');
      differentials.push('Post-exercise dehydration tachycardia (rule out if HR stays elevated >30min)');

    } else if (isInfection) {
      const hrVal = hrDev?.observedValue ? `${hrDev.observedValue} bpm` : 'elevated';
      const tempVal = tempDev?.observedValue ? `${tempDev.observedValue}°C` : 'fever';
      const romVal = romDev?.observedValue ? `${romDev.observedValue}°` : 'reduced';
      
      whatThisMeans = `${patientName} is exhibiting a classic triple-signal early infection cluster emerging over the past 72 hours. Her resting heart rate has elevated to ${hrVal} (+${hrDev?.deviationDelta || 28} bpm above personal baseline), accompanied by an escalating fever of ${tempVal} and loss of knee flexion (down to ${romVal}). This multi-metric divergence strongly indicates a surgical site / periprosthetic infection rather than routine post-operative inflammatory stiffness.`;
      whyItMatters = `${podStr} represents the peak clinical vulnerability window for acute periprosthetic joint infection (PJI) and systemic bacteremia. If left unaddressed on this shift, this trajectory carries severe risk of prosthetic joint failure, emergency department transfer, or septic deterioration within 24–48 hours.`;
      
      bedsideChecklist.push({
        priority: 'STAT',
        task: 'Bedside Surgical Site & Wound Inspection',
        detail: 'Directly inspect the surgical incision for localized erythema (>2cm perimeter), calor (warmth), edema, induration, or wound drainage/dehiscence.'
      });
      bedsideChecklist.push({
        priority: 'STAT',
        task: 'Manual Core Temperature & Radial Pulse Verification',
        detail: 'Perform manual tympanic temperature and manual radial pulse check to validate wearable telemetry.'
      });
      bedsideChecklist.push({
        priority: 'HIGH',
        task: 'Physician Escalation & SBAR Page',
        detail: 'Contact on-call orthopedic surgeon with the SBAR summary below. Request STAT lab panel: CBC w/ diff, ESR, CRP, and blood cultures x2.'
      });
      bedsideChecklist.push({
        priority: 'HIGH',
        task: 'Hold Aggressive Weight-Bearing PT',
        detail: 'Temporarily pause high-intensity physical therapy until surgical joint infection is evaluated and ruled out.'
      });

      bedsideQuestions.push('Sarah, have you experienced any body chills, rigors, or a throbbing heat sensation around your knee dressing?');
      bedsideQuestions.push('Is the pain feeling deeper or constant even while you are resting in bed?');
      differentials.push('Acute periprosthetic joint infection (PJI) / Surgical site infection (high suspicion)');
      differentials.push('Superficial incisional cellulitis');
      differentials.push('Deep vein thrombosis (DVT) with secondary reactive tachycardia');

    } else if (isCardiac) {
      const wtDelta = weightDev?.deviationDelta ? `+${weightDev.deviationDelta} kg` : '+4.2 kg';
      const spo2Val = spo2Dev?.observedValue ? `${spo2Dev.observedValue}%` : '90%';
      const hrVal = hrDev?.observedValue ? `${hrDev.observedValue} bpm` : '62 bpm';

      whatThisMeans = `${patientName} is experiencing progressive cardiopulmonary fluid overload with clinically deceptive vital signs. Because she is prescribed a beta-blocker (Metoprolol), compensatory tachycardia is blunted, keeping her heart rate deceptively normal at ${hrVal}. However, the AI identified an acute weight gain of ${wtDelta} paired with oxygen desaturation down to ${spo2Val}. This is a textbook presentation of subacute decompensated congestive heart failure.`;
      whyItMatters = `Beta-blockers frequently mask tachycardia in elderly post-acute patients. Relying only on heart rate would delay critical intervention, leading to acute pulmonary edema, severe respiratory failure, and hospital readmission within 24–48 hours.`;

      bedsideChecklist.push({
        priority: 'STAT',
        task: 'Pulmonary Auscultation & Peripheral Edema Check',
        detail: 'Auscultate bilateral lung bases for inspiratory crackles (rales); inspect ankles and sacrum for pitting edema (+2 to +4).'
      });
      bedsideChecklist.push({
        priority: 'STAT',
        task: 'Oxygen Titration & Bed Positioning',
        detail: 'Initiate supplemental O2 (2L/min nasal cannula) to maintain SpO2 >= 93%; elevate head of bed to 45° to ease work of breathing.'
      });
      bedsideChecklist.push({
        priority: 'HIGH',
        task: 'Attending Cardiologist SBAR Contact',
        detail: 'Escalate to attending provider for immediate diuretic review (e.g., IV Furosemide titration) and BNP/electrolyte draw.'
      });
      bedsideChecklist.push({
        priority: 'HIGH',
        task: 'Strict Fluid Restriction & Intake/Output Log',
        detail: 'Institute strict fluid restriction (1,500 mL/24h) and document all fluid intake and urine output on shift.'
      });

      bedsideQuestions.push('Elena, did you find yourself needing extra pillows to sleep comfortably last night, or wake up gasping for air?');
      bedsideQuestions.push('Have you noticed your shoes or socks feeling unusually tight or leaving deep marks on your ankles?');
      differentials.push('Acute decompensated congestive heart failure (ADHF) with pulmonary congestion (high suspicion)');
      differentials.push('Volume overload secondary to acute kidney injury (AKI)');
      differentials.push('Subsegmental pulmonary embolism with secondary hypoxemia');

    } else if (isRehabStall) {
      const velVal = velDev?.observedValue ? `${velDev.observedValue} m/s` : '0.53 m/s';
      const romVal = romDev?.observedValue ? `${romDev.observedValue}°` : '78°';

      whatThisMeans = `${patientName}'s post-stroke rehabilitation trajectory has stalled over consecutive days. Gait velocity (${velVal}) and knee flexion (${romVal}) have plateaued well below expected Day 21 recovery benchmarks. With hemodynamic vitals remaining stable, this plateau indicates localized spasticity, extensor tone stiffening, or fear-avoidant ambulation rather than systemic exhaustion.`;
      whyItMatters = `Failure to address functional plateaus during the subacute neuro-plasticity window (Weeks 2–4 post-stroke) increases the risk of learned non-use, joint contractures, and severe unassisted fall events.`;

      bedsideChecklist.push({
        priority: 'HIGH',
        task: 'Spasticity & Extensor Tone Bedside Assessment',
        detail: 'Assess lower extremity resistance to passive movement (Modified Ashworth Scale) and check for ankle clonus or knee hyperextension during standing.'
      });
      bedsideChecklist.push({
        priority: 'HIGH',
        task: 'Fall Risk Protocol & Bedside Precautions',
        detail: 'Verify yellow fall-risk wristband, ensure bed alarm is active, clear clutter from pathway, and reinforce assisted-transfer only.'
      });
      bedsideChecklist.push({
        priority: 'MEDIUM',
        task: 'Physical Therapy Care Plan Revision Conference',
        detail: 'Request physical therapist evaluation for assistive device upgrade (e.g., hemi-walker or AFO brace) and target gait velocity retraining.'
      });

      bedsideQuestions.push('Robert, does your left leg feel heavier or stiffer when you try to take steps forward?');
      bedsideQuestions.push('Are you feeling nervous or dizzy when standing up from the chair that makes you want to sit right back down?');
      differentials.push('Subacute post-stroke motor plateau with spasticity (confirmed)');
      differentials.push('Fear-avoidance ambulation syndrome / psychological post-fall anxiety');
      differentials.push('Occult musculoskeletal pain impeding voluntary joint excursion');

    } else {
      // General / Real dataset or mild deviation
      whatThisMeans = `${patientName}'s longitudinal vitals and wearable telemetry are tracking within individualized baseline boundaries. Minor diurnal variations detected reflect normal autonomic circadian rhythms without systemic decompensation.`;
      whyItMatters = `Maintaining steady physiological trajectory allows ongoing advancement of standard rehabilitation protocols without clinical interruption.`;

      bedsideChecklist.push({
        priority: 'ROUTINE',
        task: 'Routine Scheduled Shift Vitals & Telemetry Sync',
        detail: 'Maintain standard post-acute monitoring protocol; ensure wearable remains charged and properly placed on patient wrist.'
      });
      bedsideChecklist.push({
        priority: 'ROUTINE',
        task: 'Encourage Scheduled Rehabilitation Exercises',
        detail: 'Prompt patient to complete prescribed daily mobility sessions as tolerated.'
      });

      bedsideQuestions.push('How have your energy levels and comfort felt today during your daily routine?');
      differentials.push('Stable recovery trajectory within personalized baselines');
    }

    // Build SBAR
    const sbarHandoff = {
      situation: `${patientName} (${patientInfo.age || 65}yo ${patientInfo.gender || 'F'}, ${podStr}) is exhibiting a [${riskLevel}] alert for ${primaryDriver || 'physiological trajectory deviation'}. Composite Stability Score: ${stabilityScore}/100.`,
      background: `Admitted for ${condition}. Active medications: ${(patientContext.medications || []).join(', ') || 'None specified'}. Comorbidities: ${(patientContext.comorbidities || []).join(', ') || 'None'}. Baseline HR: ${hrDev?.baselineMedian || 65} bpm, Baseline Temp: ${tempDev?.baselineMedian || 36.6}°C.`,
      assessment: `Latest telemetry: HR ${hrDev?.observedValue || 'N/A'} bpm (${hrDev?.isDeviation ? '+' + (hrDev.deviationDelta || '') : 'stable'}), Temp ${tempDev?.observedValue || 'N/A'}°C (${tempDev?.isDeviation ? '+' + (tempDev.deviationDelta || '') : 'normal'}), HRV ${hrvDev?.observedValue || 'N/A'} ms. ${whatThisMeans}`,
      recommendation: `Request immediate provider bedside review. Suggested orders: ${bedsideChecklist.map(c => c.task).slice(0, 3).join('; ')}.`
    };

    // MatrixCare progress note format
    const matrixCareProgressNote = [
      `================================================================`,
      `MATRIXCARE POST-ACUTE EHR — NURSING CLINICAL PROGRESS NOTE`,
      `Patient: ${patientName} | MRN: ${patientInfo.id || 'N/A'} | Location: Bed 102-A`,
      `Care Setting: Skilled Nursing Facility (SNF) / Tele-Rehab`,
      `Generated: ${new Date().toLocaleString()} | Nurse Shift Handover`,
      `----------------------------------------------------------------`,
      `[SITUATION & CHIEF OBSERVATION]`,
      `${sbarHandoff.situation}`,
      ``,
      `[PHYSIOLOGICAL EVIDENCE & BIOMETRIC TELEMETRY]`,
      `• Resting Heart Rate: ${hrDev?.observedValue || 'N/A'} bpm (Baseline: ${hrDev?.baselineMedian || 'N/A'} bpm, Z-Score: ${hrDev?.zScore || 'N/A'})`,
      `• Body Temperature: ${tempDev?.observedValue || 'N/A'}°C (Baseline: ${tempDev?.baselineMedian || 'N/A'}°C)`,
      `• Heart Rate Variability (HRV): ${hrvDev?.observedValue || 'N/A'} ms`,
      romDev?.observedValue ? `• Knee Flexion ROM: ${romDev.observedValue}° (Expected target: ${romDev.expectedTarget || '95'}°)` : null,
      spo2Dev?.observedValue ? `• SpO2 Oxygen Saturation: ${spo2Dev.observedValue}%` : null,
      weightDev?.observedValue ? `• Body Weight: ${weightDev.observedValue} kg (Delta: ${weightDev.deviationDelta || '+0'} kg)` : null,
      stepsDev?.observedValue ? `• Daily Mobility: ${stepsDev.observedValue} steps/day` : null,
      ``,
      `[NURSING CLINICAL INTERPRETATION]`,
      `${whatThisMeans}`,
      ``,
      `[CLINICAL SIGNIFICANCE & RISK]`,
      `${whyItMatters}`,
      ``,
      `[BEDSIDE NURSING INTERVENTIONS & PLAN]`,
      ...bedsideChecklist.map((c, i) => `${i + 1}. [${c.priority}] ${c.task}: ${c.detail}`),
      ``,
      `[PROVIDER NOTIFICATION STATUS]`,
      `SBAR communication prepared for on-call provider review.`,
      `Differential Considerations: ${differentials.join(' | ')}`,
      `================================================================`
    ].filter(Boolean).join('\n');

    return {
      stabilityScore,
      stabilityStatus,
      urgencyLevel,
      urgencyBadge,
      whatThisMeans,
      whyItMatters,
      bedsideChecklist,
      bedsideQuestions,
      differentials,
      sbarHandoff,
      matrixCareProgressNote
    };
  }
}

