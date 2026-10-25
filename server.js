require('dotenv').config();
const express = require('express');
const path = require('path');
const { 
  get_all_students, 
  get_student_profile, 
  get_clinical_context, 
  loadStudentRecord 
} = require('./ehr_service.js');
const { LLMOrchestrator } = require('./llm_orchestrator');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory store for submitted Triage Reports
let triageReports = [];
let reportIdCounter = 1001;

function seedInitialReports() {
  triageReports = [
    {
      id: `TRG-${reportIdCounter++}`,
      student_id: 'STU-88219',
      student_name: 'Alex Taylor',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      primary_complaint: 'Persistent fatigue and generalized weakness',
      duration: 'Past 2-3 weeks',
      contextual_history: 'Mentions past low iron issues; labs from Feb 2026 show low ferritin (11 ng/mL).',
      symptom_details: 'Tiredness worsening in afternoon, mild dizziness when standing quickly, no fever.',
      escalation_level: 'Routine',
      recommended_clinician_action: 'Evaluate for repeat CBC/ferritin panel and iron supplementation.',
      status: 'New',
      clinician_notes: [],
      actions_taken: []
    },
    {
      id: `TRG-${reportIdCounter++}`,
      student_id: 'STU-44102',
      student_name: 'Jordan Rivera',
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      primary_complaint: 'Exertional wheezing and chest tightness during sprint workouts',
      duration: 'Past 10 days',
      contextual_history: 'History of exercise-induced asthma; Spirometry (Oct 2025) showed 14% post-bronchodilator reversibility; Penicillin allergy.',
      symptom_details: 'Shortness of breath and dry wheezing cough 15 minutes into track intervals; albuterol inhaler gives only partial relief; no nocturnal dyspnea.',
      escalation_level: 'Routine',
      recommended_clinician_action: 'Review inhaler technique/spacer adherence; evaluate step-up therapy with inhaled corticosteroid (ICS).',
      status: 'New',
      clinician_notes: [],
      actions_taken: []
    },
    {
      id: `TRG-${reportIdCounter++}`,
      student_id: 'STU-92055',
      student_name: 'Samira Patel',
      timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
      primary_complaint: 'Erratic glycemic swings and post-prandial hyperglycemia spikes',
      duration: 'Past 4 days',
      contextual_history: 'Type 1 Diabetes Mellitus (insulin pump managed) and Celiac disease; HbA1c 6.8% in Jan 2026.',
      symptom_details: 'Blood glucose averaging 240-280 mg/dL after campus meals; mild nausea; urine ketones negative; suspected accidental dining hall gluten cross-contamination.',
      escalation_level: 'Priority',
      recommended_clinician_action: 'Inspect pump cannula/infusion site, recheck ketones, verify gluten-free meal protocols, and adjust temporary basal rates.',
      status: 'New',
      clinician_notes: [],
      actions_taken: []
    },
    {
      id: `TRG-${reportIdCounter++}`,
      student_id: 'STU-31584',
      student_name: 'Marcus Washington',
      timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
      primary_complaint: 'Severe throbbing left temporal headache with visual aura',
      duration: 'Past 18 hours',
      contextual_history: 'Chronic migraine with visual aura; Brain MRI normal (Nov 2025); Sulfa drug allergy.',
      symptom_details: 'Flashing geometric scotoma in left visual field preceding 7/10 pulsatile head pain; severe photophobia and nausea triggered by midterm exam screen time.',
      escalation_level: 'Priority',
      recommended_clinician_action: 'Administer non-sulfa abortive triptan therapy; provide dark observation room; review acute migraine protocol.',
      status: 'New',
      clinician_notes: [],
      actions_taken: []
    },
    {
      id: `TRG-${reportIdCounter++}`,
      student_id: 'STU-77319',
      student_name: 'Chloe Dubois',
      timestamp: new Date(Date.now() - 3600000 * 20).toISOString(),
      primary_complaint: 'Afternoon exhaustion relapse and mild tender cervical adenopathy',
      duration: 'Past 2 weeks',
      contextual_history: 'Convalescent infectious mononucleosis (resolved Fall 2025, EBV IgG positive); Generalized anxiety disorder.',
      symptom_details: 'Profound fatigue recurring mid-afternoon, mild tender posterior cervical lymph nodes, neck stiffness without fever; exacerbated by exam anxiety.',
      escalation_level: 'Routine',
      recommended_clinician_action: 'Targeted physical exam for cervical adenopathy and splenomegaly; discuss fatigue recovery pace and campus wellness counseling.',
      status: 'New',
      clinician_notes: [],
      actions_taken: []
    }
  ];
}
seedInitialReports();

const orchestrator = new LLMOrchestrator();

// API Endpoints

// 1. Get All Students Directory
app.get('/api/students', (req, res) => {
  try {
    const students = get_all_students();
    res.json({ success: true, students });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get Student Profile
app.get('/api/student/:id/profile', (req, res) => {
  try {
    const profile = get_student_profile(req.params.id);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Get Clinical Context
app.get('/api/student/:id/context', (req, res) => {
  try {
    const context = get_clinical_context(req.params.id);
    res.json({ success: true, context });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Get Full Record
app.get('/api/student/:id/record', (req, res) => {
  try {
    const record = loadStudentRecord(req.params.id);
    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Chat Endpoint (Orchestrator)
app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], studentId = 'STU-88219', forceReport = false } = req.body;
    const studentProfile = get_student_profile(studentId);
    let clinicalContext = get_clinical_context(studentId);

    // Look up any clinician actions / active orders for this student
    const studentReports = triageReports.filter(r => r.student_id && r.student_id.toLowerCase() === studentId.toLowerCase());
    const actionsSummary = [];
    studentReports.forEach(r => {
      if (r.actions_taken && r.actions_taken.length > 0) {
        r.actions_taken.forEach(a => {
          actionsSummary.push(`- ${a.action}: ${a.details} (Timestamp: ${a.timestamp}, Triage Status: ${r.status})`);
        });
      }
    });

    if (actionsSummary.length > 0) {
      clinicalContext += `\n\n[CONFIRMED CLINICIAN ACTIONS & ACTIVE CARE ORDERS]:\nClinical providers have taken the following actions on this student's intake:\n${actionsSummary.join('\n')}\n(Guidance: If the student asks about their appointment, lab testing orders, or provider review, confirm these details accurately, provide clear health center check-in instructions, and provide reassurance.)`;
    }

    const response = await orchestrator.processChat({
      messages,
      clinicalContext,
      studentProfile,
      forceReportGeneration: forceReport
    });

    // If report was generated, store it in clinician dashboard feed
    if (response.triageReport) {
      const newReport = {
        id: `TRG-${reportIdCounter++}`,
        ...response.triageReport,
        status: response.triageReport.escalation_level === 'Emergency' ? 'Urgent Review' : 'New',
        clinician_notes: [],
        actions_taken: []
      };
      triageReports.unshift(newReport);
      response.savedReport = newReport;
    }

    res.json({
      success: true,
      ...response
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Get All Triage Reports for Clinician Dashboard
app.get('/api/triage/reports', (req, res) => {
  const { student_id } = req.query;
  let reports = triageReports;
  if (student_id) {
    reports = reports.filter(r => r.student_id && r.student_id.toLowerCase() === student_id.toLowerCase());
  }
  res.json({
    success: true,
    reports
  });
});

// 7. Direct Submit Triage Report
app.post('/api/triage/submit', (req, res) => {
  try {
    const reportData = req.body;
    const studentProfile = get_student_profile(reportData.student_id);
    const newReport = {
      id: `TRG-${reportIdCounter++}`,
      student_id: reportData.student_id || studentProfile.student_id,
      student_name: reportData.student_name || studentProfile.name,
      timestamp: reportData.timestamp || new Date().toISOString(),
      primary_complaint: reportData.primary_complaint || reportData.chief_complaint || 'General malaise',
      duration: reportData.duration || reportData.duration_and_onset || 'Unspecified',
      contextual_history: reportData.contextual_history || reportData.relevant_history_notes || '',
      symptom_details: reportData.symptom_details || '',
      escalation_level: reportData.escalation_level || 'Routine',
      recommended_clinician_action: reportData.recommended_clinician_action || reportData.suggested_provider_action || 'Clinical evaluation',
      status: reportData.escalation_level === 'Emergency' ? 'Urgent Review' : 'New',
      clinician_notes: [],
      actions_taken: []
    };
    triageReports.unshift(newReport);
    res.json({ success: true, report: newReport });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Clinician Action Handler (Schedule, Lab Order, Mark Reviewed)
app.patch('/api/triage/reports/:id/action', (req, res) => {
  const { id } = req.params;
  const { action, details } = req.body;

  const report = triageReports.find(r => r.id === id);
  if (!report) {
    return res.status(404).json({ success: false, error: 'Report not found' });
  }

  const timestamp = new Date().toISOString();

  if (action === 'schedule_appointment') {
    report.status = 'Appointment Scheduled';
    report.actions_taken.push({
      action: 'Schedule In-Person Appointment',
      timestamp,
      details: details || 'In-person consultation booked'
    });
  } else if (action === 'request_lab') {
    report.status = 'Lab Ordered';
    report.actions_taken.push({
      action: 'Request Lab Order',
      timestamp,
      details: details || 'Diagnostic lab requisition submitted'
    });
  } else if (action === 'mark_reviewed') {
    report.status = 'Reviewed';
    report.actions_taken.push({
      action: 'Mark Reviewed',
      timestamp,
      details: details || 'Intake reviewed by attending clinical triage nurse.'
    });
  } else {
    return res.status(400).json({ success: false, error: 'Invalid clinician action' });
  }

  res.json({ success: true, report });
});

// 9. Configuration Endpoint
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    config: orchestrator.getConfig()
  });
});

app.post('/api/config', (req, res) => {
  orchestrator.updateConfig(req.body);
  res.json({
    success: true,
    config: orchestrator.getConfig()
  });
});

// 10. Reset Endpoint
app.post('/api/reset', (req, res) => {
  seedInitialReports();
  res.json({ success: true, message: 'Triage store reset to initial state' });
});

app.listen(PORT, () => {
  console.log(`University Health Center Triage System running at http://localhost:${PORT}`);
});

module.exports = { 
  app, 
  loadStudentRecord, 
  get_all_students, 
  get_student_profile, 
  get_clinical_context,
  getStudentProfile: get_student_profile,
  getClinicalContext: get_clinical_context
};
