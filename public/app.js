// University Health Center - Clinical Intake & Triage (Shadcn UI)

const state = {
  studentsList: [],
  selectedStudent: null,
  studentId: null,
  chatMessages: [],
  triageReports: [],
  queueScope: 'current', // 'current' student or 'all' clinic patients
  activeFilter: 'all',
  isProcessing: false,
  viewMode: 'split',
  selectedReportId: null,
  config: {
    provider: 'gemini',
    hasGeminiKey: false,
    hasOpenaiKey: false,
    geminiModel: 'gemini-3.5-flash-lite'
  }
};

// DOM Elements
const elements = {
  // Views
  viewDirectory: document.getElementById('view-directory'),
  viewWorkstation: document.getElementById('view-workstation'),
  studentsGrid: document.getElementById('students-grid'),
  btnBackDirectory: document.getElementById('btn-back-directory'),
  headerContextTitle: document.getElementById('header-context-title'),
  navWorkstationTabs: document.getElementById('nav-workstation-tabs'),
  openEhrBtn: document.getElementById('open-ehr-btn'),
  navStudentName: document.getElementById('nav-student-name'),
  navStudentId: document.getElementById('nav-student-id'),

  // Workstation
  chatStream: document.getElementById('chat-stream'),
  chatForm: document.getElementById('chat-form'),
  chatInput: document.getElementById('chat-input'),
  typingIndicator: document.getElementById('typing-indicator'),
  submitReportBtn: document.getElementById('submit-report-btn'),
  clearChatBtn: document.getElementById('clear-chat-btn'),
  emergencyAlertBanner: document.getElementById('emergency-alert-banner'),
  triageCardsContainer: document.getElementById('triage-cards-container'),
  dashNotifyDot: document.getElementById('dash-notify-dot'),
  studentNotifyDot: document.getElementById('student-notify-dot'),
  carePlanBanner: document.getElementById('care-plan-banner'),
  carePlanTitle: document.getElementById('care-plan-title'),
  carePlanDesc: document.getElementById('care-plan-desc'),
  modelStatusText: document.getElementById('model-status-text'),
  queuePatientScope: document.getElementById('queue-patient-scope'),
  scopeBtnCurrent: document.getElementById('scope-btn-current'),
  scopeBtnAll: document.getElementById('scope-btn-all'),

  // Metrics
  countAll: document.getElementById('count-all'),
  countEmergency: document.getElementById('count-emergency'),
  countRoutine: document.getElementById('count-routine'),
  countReviewed: document.getElementById('count-reviewed'),

  // Views switch
  viewModeSplit: document.getElementById('view-mode-split'),
  viewModeStudent: document.getElementById('view-mode-student'),
  viewModeClinician: document.getElementById('view-mode-clinician'),

  // Toast
  appToast: document.getElementById('app-toast'),
  toastMessage: document.getElementById('toast-message'),

  // Modals
  ehrModal: document.getElementById('ehr-modal'),
  closeEhrBtn: document.getElementById('close-ehr-btn'),
  ehrModalBody: document.getElementById('ehr-modal-body'),
  ehrModalSub: document.getElementById('ehr-modal-sub'),

  appointmentModal: document.getElementById('appointment-modal'),
  closeApptModalBtn: document.getElementById('close-appt-modal-btn'),
  cancelApptBtn: document.getElementById('cancel-appt-btn'),
  confirmApptBtn: document.getElementById('confirm-appt-btn'),
  apptPatientName: document.getElementById('appt-patient-name'),
  apptProvider: document.getElementById('appt-provider'),
  apptTime: document.getElementById('appt-time'),

  labModal: document.getElementById('lab-modal'),
  closeLabModalBtn: document.getElementById('close-lab-modal-btn'),
  cancelLabBtn: document.getElementById('cancel-lab-btn'),
  confirmLabBtn: document.getElementById('confirm-lab-btn'),
  labPatientName: document.getElementById('lab-patient-name'),
  labOrderPanelTitle: document.getElementById('lab-order-panel-title'),
  labOrderPanelDesc: document.getElementById('lab-order-panel-desc'),

  jsonModal: document.getElementById('json-modal'),
  closeJsonBtn: document.getElementById('close-json-btn'),
  jsonViewerContent: document.getElementById('json-viewer-content'),

  settingsModal: document.getElementById('settings-modal'),
  openSettingsBtn: document.getElementById('open-settings-btn'),
  closeSettingsBtn: document.getElementById('close-settings-btn'),
  cancelSettingsBtn: document.getElementById('cancel-settings-btn'),
  settingsForm: document.getElementById('settings-form'),
  providerSelect: document.getElementById('provider-select'),
  geminiApiKey: document.getElementById('gemini-api-key'),
  openaiApiKey: document.getElementById('openai-api-key'),
  geminiKeyStatus: document.getElementById('gemini-key-status')
};

// Initial Boot
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await fetchConfig();
  await loadStudentsList();
  await loadTriageReports();

  // Check if URL has ?student=STU-XXXX
  const urlParams = new URLSearchParams(window.location.search);
  const requestedId = urlParams.get('student');
  if (requestedId) {
    const match = state.studentsList.find(s => s.student_id.toLowerCase() === requestedId.toLowerCase());
    if (match) {
      selectStudent(match);
      return;
    }
  }

  // Otherwise show Directory
  showDirectoryView();
});

function setupEventListeners() {
  // Directory back button
  elements.btnBackDirectory.addEventListener('click', () => {
    showDirectoryView();
  });

  // Chat form submit
  elements.chatForm.addEventListener('submit', handleUserSendMessage);

  // Submit to Clinician
  elements.submitReportBtn.addEventListener('click', () => {
    forceSendTriageReport();
  });

  // Clear Chat Button
  elements.clearChatBtn.addEventListener('click', () => {
    initWelcomeChat();
    elements.emergencyAlertBanner.style.display = 'none';
    showToast('Intake session reset');
  });

  // View switchers
  elements.viewModeSplit.addEventListener('click', () => setViewMode('split'));
  elements.viewModeStudent.addEventListener('click', () => setViewMode('student'));
  elements.viewModeClinician.addEventListener('click', () => setViewMode('clinician'));

  // Scope switcher
  if (elements.scopeBtnCurrent) {
    elements.scopeBtnCurrent.addEventListener('click', () => {
      state.queueScope = 'current';
      updateScopeButtons();
      renderTriageReports();
    });
  }
  if (elements.scopeBtnAll) {
    elements.scopeBtnAll.addEventListener('click', () => {
      state.queueScope = 'all';
      updateScopeButtons();
      renderTriageReports();
    });
  }

  // Filter tabs
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.activeFilter = pill.getAttribute('data-filter');
      renderTriageReports();
    });
  });

  // EHR Modal
  elements.openEhrBtn.addEventListener('click', () => showEhrModal());
  elements.closeEhrBtn.addEventListener('click', () => { elements.ehrModal.style.display = 'none'; });

  // Appointment Modal
  elements.closeApptModalBtn.addEventListener('click', () => { elements.appointmentModal.style.display = 'none'; });
  elements.cancelApptBtn.addEventListener('click', () => { elements.appointmentModal.style.display = 'none'; });
  elements.confirmApptBtn.addEventListener('click', handleConfirmAppointment);

  // Lab Modal
  elements.closeLabModalBtn.addEventListener('click', () => { elements.labModal.style.display = 'none'; });
  elements.cancelLabBtn.addEventListener('click', () => { elements.labModal.style.display = 'none'; });
  elements.confirmLabBtn.addEventListener('click', handleConfirmLabOrder);

  // JSON Modal
  elements.closeJsonBtn.addEventListener('click', () => { elements.jsonModal.style.display = 'none'; });

  // Settings Modal
  elements.openSettingsBtn.addEventListener('click', () => showSettingsModal());
  elements.closeSettingsBtn.addEventListener('click', () => { elements.settingsModal.style.display = 'none'; });
  elements.cancelSettingsBtn.addEventListener('click', () => { elements.settingsModal.style.display = 'none'; });
  elements.settingsForm.addEventListener('submit', handleSaveSettings);
}

// Load Students Directory
async function loadStudentsList() {
  try {
    const res = await fetch('/api/students');
    const data = await res.json();
    if (data.success) {
      state.studentsList = data.students;
      renderStudentsGrid();
    }
  } catch (err) {
    console.error('Failed to load students:', err);
  }
}

// Render Root Directory: Only Name and DOB
function renderStudentsGrid() {
  const grid = elements.studentsGrid;
  grid.innerHTML = '';

  state.studentsList.forEach(student => {
    const card = document.createElement('div');
    card.className = 'student-card';
    card.onclick = () => selectStudent(student);

    card.innerHTML = `
      <div class="student-card-body">
        <div class="student-card-name">${escapeHtml(student.name)}</div>
        <div class="student-card-dob">DOB: ${escapeHtml(student.date_of_birth)}</div>
      </div>
      <div class="student-card-action">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Show Directory
function showDirectoryView() {
  state.selectedStudent = null;
  state.studentId = null;
  state.queueScope = 'all';

  elements.viewDirectory.style.display = 'flex';
  elements.viewWorkstation.style.display = 'none';
  elements.btnBackDirectory.style.display = 'none';
  elements.navWorkstationTabs.style.display = 'none';
  elements.openEhrBtn.style.display = 'none';
  elements.headerContextTitle.textContent = 'Student Directory';

  if (elements.queuePatientScope) {
    elements.queuePatientScope.textContent = 'All Patients';
  }
  if (elements.scopeBtnCurrent) {
    elements.scopeBtnCurrent.textContent = 'Current Patient';
  }
  updateScopeButtons();
  renderTriageReports();

  window.history.replaceState({}, '', window.location.pathname);
}

// Select Student & Enter Workstation (Initial View: Student Chat)
function selectStudent(student) {
  state.selectedStudent = student;
  state.studentId = student.student_id;
  state.queueScope = 'current';

  elements.viewDirectory.style.display = 'none';
  elements.viewWorkstation.style.display = 'grid';
  elements.btnBackDirectory.style.display = 'inline-flex';
  elements.navWorkstationTabs.style.display = 'flex';
  elements.openEhrBtn.style.display = 'inline-flex';
  elements.openEhrBtn.setAttribute('title', `${student.name} (${student.student_id}) • Open Medical Chart`);

  elements.navStudentName.textContent = student.name;
  elements.navStudentId.textContent = student.student_id;
  elements.headerContextTitle.textContent = `${student.first_name}'s Intake`;

  // Update Clinician Queue header scope to this student
  if (elements.queuePatientScope) {
    elements.queuePatientScope.textContent = student.name;
  }
  if (elements.scopeBtnCurrent) {
    elements.scopeBtnCurrent.textContent = student.first_name;
  }
  updateScopeButtons();

  // Update query param
  window.history.replaceState({}, '', `?student=${student.student_id}`);

  // Initial view is the chat view
  setViewMode('student');

  // Initialize personalized welcome chat
  initWelcomeChat();

  // Re-render triage queue for selected student
  renderTriageReports();

  showToast(`Loaded intake for ${student.name}`);
}

// Layout Switcher
function setViewMode(mode) {
  state.viewMode = mode;
  elements.viewModeSplit.classList.toggle('active', mode === 'split');
  elements.viewModeStudent.classList.toggle('active', mode === 'student');
  elements.viewModeClinician.classList.toggle('active', mode === 'clinician');

  elements.viewWorkstation.className = 'workspace';
  if (mode === 'split') {
    elements.viewWorkstation.classList.add('split-layout');
    if (elements.studentNotifyDot) elements.studentNotifyDot.style.display = 'none';
  } else if (mode === 'student') {
    elements.viewWorkstation.classList.add('student-only');
    if (elements.studentNotifyDot) elements.studentNotifyDot.style.display = 'none';
  } else if (mode === 'clinician') {
    elements.viewWorkstation.classList.add('clinician-only');
    elements.dashNotifyDot.style.display = 'none';
  }
}

// Toast
let toastTimeout = null;
function showToast(message) {
  if (toastTimeout) clearTimeout(toastTimeout);
  elements.toastMessage.textContent = message;
  elements.appToast.style.display = 'flex';
  toastTimeout = setTimeout(() => {
    elements.appToast.style.display = 'none';
  }, 3200);
}

// Config
async function fetchConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.success) {
      state.config = data.config;
      updateModelStatusBadge();
    }
  } catch (err) {
    console.error('Config fetch error:', err);
  }
}

function updateModelStatusBadge() {
  const p = state.config.provider;
  if (p === 'gemini') {
    elements.modelStatusText.textContent = state.config.hasGeminiKey ? 'Gemini 3.5 Flash' : 'Gemini (No Key)';
  } else if (p === 'openai') {
    elements.modelStatusText.textContent = 'OpenAI';
  } else {
    elements.modelStatusText.textContent = 'Clinical Simulator';
  }
}

// Personalized Welcome Message
function initWelcomeChat() {
  const student = state.selectedStudent || { first_name: 'there' };
  state.chatMessages = [
    {
      role: 'assistant',
      content: `Hello ${student.first_name}, I'm an AI-powered digital triage chatbot for the University Health Center. I'm here to gather details about how you're feeling today for our clinical staff. A provider will review our conversation to advise on next steps.\n\nHow can I help you today?`
    }
  ];

  // If this student already has confirmed clinician actions on their reports, add them to chat!
  const studentReports = state.triageReports.filter(r => r.student_id && r.student_id.toLowerCase() === state.studentId?.toLowerCase());
  studentReports.forEach(r => {
    if (r.actions_taken && r.actions_taken.length > 0) {
      r.actions_taken.forEach(a => {
        let title = 'Clinical Provider Action';
        let badge = 'Order Confirmed';
        let instructions = '';

        if (a.action.includes('Appointment') || a.action === 'schedule_appointment') {
          title = 'In-Person Consultation Confirmed';
          badge = 'Appointment';
          instructions = 'Please arrive at the University Health Center (Suite 200, Student Union South) 10 minutes prior to your scheduled time. Bring your student ID and health insurance card.';
        } else if (a.action.includes('Lab') || a.action === 'request_lab') {
          title = 'Diagnostic Requisition Transmitted';
          badge = 'Lab Ordered';
          instructions = 'Your clinician has ordered follow-up diagnostic testing. You may visit the Health Center Outpatient Lab (Room 110) during regular walk-in hours (Mon–Fri, 8:30 AM – 4:30 PM). No appointment required.';
        } else {
          title = 'Intake Notes Signed Off';
          badge = 'Reviewed';
          instructions = 'Your intake details have been reviewed by a licensed clinical provider and filed into your confidential student medical chart.';
        }

        state.chatMessages.push({
          role: 'clinical-event',
          actionType: a.action.includes('Appointment') || a.action === 'schedule_appointment' ? 'schedule_appointment' : a.action.includes('Lab') || a.action === 'request_lab' ? 'request_lab' : 'mark_reviewed',
          badge,
          title,
          details: a.details,
          instructions,
          timestamp: a.timestamp
        });
      });
    }
  });

  renderChatStream();
  updateCarePlanBanner();
}

// Send Message Handler
async function handleUserSendMessage(e) {
  e.preventDefault();
  const text = elements.chatInput.value.trim();
  if (!text || state.isProcessing || !state.studentId) return;

  const userMsg = { role: 'user', content: text };
  state.chatMessages.push(userMsg);
  elements.chatInput.value = '';
  renderChatStream();

  await sendChatToAPI({ forceReport: false });
}

async function forceSendTriageReport() {
  if (state.isProcessing || !state.studentId) return;
  await sendChatToAPI({ forceReport: true });
}

async function sendChatToAPI({ forceReport = false }) {
  state.isProcessing = true;
  elements.typingIndicator.style.display = 'block';
  elements.chatStream.scrollTop = elements.chatStream.scrollHeight;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: state.chatMessages.map(m => ({ role: m.role, content: m.content })),
        studentId: state.studentId,
        forceReport
      })
    });

    const data = await res.json();
    if (data.success) {
      const assistantMsg = {
        role: 'assistant',
        content: data.content,
        toolCall: data.toolCall,
        triageReport: data.triageReport,
        isEmergency: data.isEmergency
      };
      state.chatMessages.push(assistantMsg);

      if (data.isEmergency) {
        elements.emergencyAlertBanner.style.display = 'block';
      }

      if (data.triageReport) {
        await loadTriageReports();
        showToast('Summary sent to Clinician Triage Queue');
        if (state.viewMode === 'student') {
          elements.dashNotifyDot.style.display = 'block';
        }
      }
    }
  } catch (err) {
    console.error('Chat error:', err);
    state.chatMessages.push({
      role: 'assistant',
      content: 'An error occurred while connecting with the health center intake service.'
    });
  } finally {
    state.isProcessing = false;
    elements.typingIndicator.style.display = 'none';
    renderChatStream();
  }
}

// Render Chat
function renderChatStream() {
  elements.chatStream.innerHTML = '';

  state.chatMessages.forEach(msg => {
    if (msg.role === 'clinical-event') {
      const noticeCard = document.createElement('div');
      noticeCard.className = `chat-clinical-notice ${msg.actionType || ''}`;
      const timeStr = formatTime(msg.timestamp);

      noticeCard.innerHTML = `
        <div class="clinical-notice-header">
          <div class="clinical-notice-title-row">
            <span class="clinical-notice-badge">${escapeHtml(msg.badge || 'Care Order')}</span>
            <span class="clinical-notice-title">${escapeHtml(msg.title || 'Clinical Action')}</span>
          </div>
          <span class="clinical-notice-time">${timeStr}</span>
        </div>
        <div class="clinical-notice-body">
          ${escapeHtml(msg.details)}
        </div>
        ${msg.instructions ? `<div class="clinical-notice-instructions">${escapeHtml(msg.instructions)}</div>` : ''}
      `;
      elements.chatStream.appendChild(noticeCard);
      return;
    }

    const isUser = msg.role === 'user';
    const bubble = document.createElement('div');
    bubble.className = `chat-entry ${isUser ? 'user' : 'assistant'} ${msg.isEmergency ? 'emergency-alert' : ''}`;

    let formatted = escapeHtml(msg.content)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');

    let reportChipHtml = '';
    if (msg.triageReport) {
      reportChipHtml = `
        <div class="report-badge-inline">
          <span>✓ Triage summary submitted to clinician dashboard</span>
          <button class="raw-link" onclick="inspectReport('${encodeURIComponent(JSON.stringify(msg.triageReport))}')">View JSON</button>
        </div>
      `;
    }

    bubble.innerHTML = `${formatted}${reportChipHtml}`;
    elements.chatStream.appendChild(bubble);
  });

  elements.chatStream.scrollTop = elements.chatStream.scrollHeight;
}

// Clinician Dashboard Feed
async function loadTriageReports() {
  try {
    const res = await fetch('/api/triage/reports');
    const data = await res.json();
    if (data.success) {
      state.triageReports = data.reports;
      updateMetrics();
      renderTriageReports();
    }
  } catch (err) {
    console.error('Load reports error:', err);
  }
}

function updateScopeButtons() {
  if (elements.scopeBtnCurrent && elements.scopeBtnAll) {
    elements.scopeBtnCurrent.classList.toggle('active', state.queueScope === 'current');
    elements.scopeBtnAll.classList.toggle('active', state.queueScope === 'all');
  }
}

function getScopedReports() {
  if (state.queueScope === 'current' && state.studentId) {
    return state.triageReports.filter(r => r.student_id && r.student_id.toLowerCase() === state.studentId.toLowerCase());
  }
  return state.triageReports;
}

function updateMetrics() {
  const scoped = getScopedReports();
  elements.countAll.textContent = scoped.length;
  elements.countEmergency.textContent = scoped.filter(r => r.escalation_level === 'Emergency').length;
  elements.countRoutine.textContent = scoped.filter(r => r.escalation_level === 'Routine').length;
  elements.countReviewed.textContent = scoped.filter(r => r.status === 'Reviewed').length;
}

function renderTriageReports() {
  updateMetrics();
  const container = elements.triageCardsContainer;
  container.innerHTML = '';

  let filtered = getScopedReports();
  if (state.activeFilter === 'Reviewed') {
    filtered = filtered.filter(r => r.status === 'Reviewed');
  } else if (state.activeFilter !== 'all') {
    filtered = filtered.filter(r => r.escalation_level === state.activeFilter);
  }

  if (filtered.length === 0) {
    const studentLabel = state.selectedStudent ? state.selectedStudent.name : 'this category';
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem; color: #71717a; font-size: 0.8125rem;">
        No intake summaries found for ${state.queueScope === 'current' ? studentLabel : 'this category'}.
      </div>
    `;
    return;
  }

  filtered.forEach(report => {
    const card = document.createElement('article');
    card.className = `card-triage is-${report.escalation_level.toLowerCase()}`;
    card.id = `report-card-${report.id}`;

    const formattedTime = formatTime(report.timestamp);

    let actionBannerHtml = '';
    if (report.actions_taken && report.actions_taken.length > 0) {
      const latestAction = report.actions_taken[report.actions_taken.length - 1];
      actionBannerHtml = `
        <div class="action-status-alert">
          <span>✓</span>
          <span><strong>${escapeHtml(latestAction.action)}:</strong> ${escapeHtml(latestAction.details)}</span>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="card-triage-header">
        <div class="patient-info">
          <span class="patient-name">${escapeHtml(report.student_name)}</span>
          <span class="patient-id">${escapeHtml(report.student_id)}</span>
          <span class="report-time">&bull; ${formattedTime}</span>
        </div>
        <div>
          <span class="badge ${report.escalation_level}">${report.escalation_level}</span>
        </div>
      </div>

      <div class="complaint-row">
        <span class="complaint-title">${escapeHtml(report.primary_complaint || report.chief_complaint)}</span>
        <span class="duration-tag">${escapeHtml(report.duration || report.duration_and_onset)}</span>
      </div>

      <div class="ehr-context-note">
        <strong>Linked EHR Record:</strong> ${escapeHtml(report.contextual_history || report.relevant_history_notes || 'EHR background linked')}
      </div>

      <div class="symptoms-body">
        ${escapeHtml(report.symptom_details)}
      </div>

      <div class="action-recommendation">
        <strong>Suggested Action:</strong> ${escapeHtml(report.recommended_clinician_action || report.suggested_provider_action)}
      </div>

      ${actionBannerHtml}

      <div class="card-actions">
        <button class="btn btn-outline btn-sm" onclick="openAppointmentModal('${report.id}', '${escapeHtml(report.student_name)}')">
          Schedule In-Person Appointment
        </button>

        <button class="btn btn-outline btn-sm" onclick="openLabModal('${report.id}', '${escapeHtml(report.student_name)}')">
          Request Lab Order
        </button>

        <button class="btn btn-outline btn-sm ${report.status === 'Reviewed' ? 'btn-reviewed-active' : ''}" onclick="markReviewedDirect('${report.id}')">
          ✓ ${report.status === 'Reviewed' ? 'Reviewed' : 'Mark Reviewed'}
        </button>

        <button class="btn-json-view" onclick="inspectReportById('${report.id}')">
          { } JSON
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

// Appointment Modal
window.openAppointmentModal = function(reportId, patientName) {
  state.selectedReportId = reportId;
  elements.apptPatientName.textContent = `${patientName} (${reportId})`;
  elements.appointmentModal.style.display = 'flex';
};

async function handleConfirmAppointment() {
  if (!state.selectedReportId) return;
  const provider = elements.apptProvider.value;
  const time = elements.apptTime.value;
  const details = `In-person appointment booked with ${provider} for ${time}`;

  elements.appointmentModal.style.display = 'none';
  await applyClinicianAction(state.selectedReportId, 'schedule_appointment', details);
  showToast('In-person appointment booked');
}

// Lab Modal
window.openLabModal = function(reportId, patientName) {
  state.selectedReportId = reportId;
  elements.labPatientName.textContent = `${patientName} (${reportId})`;

  const student = state.selectedStudent;
  const sid = (student && student.student_id) || '';
  if (sid === 'STU-44102') {
    elements.labOrderPanelTitle.textContent = 'Repeat Spirometry & Methacholine Challenge';
    elements.labOrderPanelDesc.textContent = 'Assess airway responsiveness and post-bronchodilator reversibility.';
  } else if (sid === 'STU-92055') {
    elements.labOrderPanelTitle.textContent = 'Repeat HbA1c & Microalbuminuria Panel';
    elements.labOrderPanelDesc.textContent = 'Evaluate glycemic management and renal microvascular health.';
  } else if (sid === 'STU-31584') {
    elements.labOrderPanelTitle.textContent = 'Neurological Follow-up & Comprehensive Metabolic Screen';
    elements.labOrderPanelDesc.textContent = 'Evaluate migraine headache triggers, electrolytes, and renal panels.';
  } else if (sid === 'STU-77319') {
    elements.labOrderPanelTitle.textContent = 'Repeat Epstein-Barr Virus Panel & Hepatic Function';
    elements.labOrderPanelDesc.textContent = 'Assess post-infectious convalescent titer status and liver enzymes.';
  } else {
    elements.labOrderPanelTitle.textContent = 'Repeat CBC & Ferritin Panel';
    elements.labOrderPanelDesc.textContent = 'Re-evaluate serum ferritin, hemoglobin, and hematocrit.';
  }

  elements.labModal.style.display = 'flex';
};

async function handleConfirmLabOrder() {
  if (!state.selectedReportId) return;
  const panelName = elements.labOrderPanelTitle.textContent;
  const details = `Diagnostic Requisition: ${panelName}`;

  elements.labModal.style.display = 'none';
  await applyClinicianAction(state.selectedReportId, 'request_lab', details);
  showToast('Lab requisition transmitted');
}

// Mark Reviewed
window.markReviewedDirect = async function(reportId) {
  const details = 'Intake validated by Clinical Triage Nurse';
  await applyClinicianAction(reportId, 'mark_reviewed', details);
  showToast('Intake marked as reviewed');
};

async function applyClinicianAction(reportId, action, details) {
  try {
    const res = await fetch(`/api/triage/reports/${reportId}/action`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, details })
    });
    const data = await res.json();
    if (data.success) {
      await loadTriageReports();

      // Check if action was for the currently active student
      const updatedReport = data.report;
      if (updatedReport && state.studentId && updatedReport.student_id.toLowerCase() === state.studentId.toLowerCase()) {
        addClinicalActionToChat(action, details);
      }
    }
  } catch (err) {
    console.error('Action error:', err);
  }
}

// Add Clinical Action Card to Student Intake Chat
function addClinicalActionToChat(action, details, timestamp = new Date().toISOString()) {
  let title = 'Clinical Provider Action';
  let badge = 'Order Confirmed';
  let instructions = '';

  if (action === 'schedule_appointment') {
    title = 'In-Person Consultation Confirmed';
    badge = 'Appointment';
    instructions = 'Please arrive at the University Health Center (Suite 200, Student Union South) 10 minutes prior to your scheduled time. Bring your student ID and health insurance card.';
  } else if (action === 'request_lab') {
    title = 'Diagnostic Requisition Transmitted';
    badge = 'Lab Ordered';
    instructions = 'Your clinician has ordered follow-up diagnostic testing. You may visit the Health Center Outpatient Lab (Room 110) during regular walk-in hours (Mon–Fri, 8:30 AM – 4:30 PM). No appointment required.';
  } else if (action === 'mark_reviewed') {
    title = 'Intake Notes Signed Off';
    badge = 'Reviewed';
    instructions = 'Your intake details have been reviewed by a licensed clinical provider and filed into your confidential student medical chart.';
  }

  state.chatMessages.push({
    role: 'clinical-event',
    actionType: action,
    badge,
    title,
    details,
    instructions,
    timestamp
  });

  renderChatStream();
  updateCarePlanBanner();

  // If in clinician-only view, notify student intake tab with a badge dot
  if (state.viewMode === 'clinician' && elements.studentNotifyDot) {
    elements.studentNotifyDot.style.display = 'inline-block';
  }

  showToast('Intake view updated with clinical action');
}

// Update Top Care Plan Status Banner
function updateCarePlanBanner() {
  if (!elements.carePlanBanner) return;

  const studentReports = state.triageReports.filter(r => r.student_id && r.student_id.toLowerCase() === state.studentId?.toLowerCase());
  const allActions = [];
  studentReports.forEach(r => {
    if (r.actions_taken && r.actions_taken.length > 0) {
      allActions.push(...r.actions_taken);
    }
  });

  if (allActions.length === 0) {
    elements.carePlanBanner.style.display = 'none';
    return;
  }

  const latest = allActions[allActions.length - 1];
  elements.carePlanBanner.style.display = 'flex';
  elements.carePlanTitle.textContent = latest.action;
  elements.carePlanDesc.textContent = latest.details;
}

// Inspect JSON
window.inspectReport = function(encodedJson) {
  try {
    const obj = JSON.parse(decodeURIComponent(encodedJson));
    elements.jsonViewerContent.textContent = JSON.stringify(obj, null, 2);
    elements.jsonModal.style.display = 'flex';
  } catch (e) {
    console.error(e);
  }
};

window.inspectReportById = function(reportId) {
  const report = state.triageReports.find(r => r.id === reportId);
  if (report) {
    elements.jsonViewerContent.textContent = JSON.stringify(report, null, 2);
    elements.jsonModal.style.display = 'flex';
  }
};

// EHR Modal
async function showEhrModal() {
  if (!state.studentId) return;
  try {
    const res = await fetch(`/api/student/${state.studentId}/record`);
    const data = await res.json();
    if (!data.success) return;
    const r = data.record;

    elements.ehrModalSub.textContent = `${r.first_name} ${r.last_name} &bull; ${r.student_id} &bull; Confidential`;

    const labs = (r.recent_labs || []).map(l => `
      <div class="card card-muted" style="margin-top: 0.5rem; font-size: 0.8125rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
          <strong class="text-foreground">${escapeHtml(l.test_name)}</strong>
          <span class="text-xs text-muted-foreground">${escapeHtml(l.date)}</span>
        </div>
        <div style="color: #f87171;">${escapeHtml(l.findings)}</div>
        <div class="text-xs text-muted-foreground mt-1">${escapeHtml(l.status)}</div>
      </div>
    `).join('');

    elements.ehrModalBody.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.8125rem;">
        <div>
          <span class="text-xs text-muted-foreground block">Date of Birth</span>
          <strong class="text-foreground">${escapeHtml(r.date_of_birth)}</strong>
        </div>
        <div>
          <span class="text-xs text-muted-foreground block">Known Conditions</span>
          <strong class="text-foreground">${escapeHtml((r.medical_history || []).join(', '))}</strong>
        </div>
      </div>

      <div style="margin-top: 1.25rem;">
        <span class="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Recent Diagnostic Labs</span>
        ${labs.length > 0 ? labs : '<p class="text-xs text-muted-foreground mt-1">No prior lab panels on record.</p>'}
      </div>
    `;

    elements.ehrModal.style.display = 'flex';
  } catch (err) {
    console.error('Failed to load EHR record:', err);
  }
}

// Settings
function showSettingsModal() {
  elements.providerSelect.value = state.config.provider;
  elements.geminiApiKey.value = '';
  elements.openaiApiKey.value = '';
  if (state.config.hasGeminiKey) {
    elements.geminiKeyStatus.textContent = `Active key loaded from .env (${state.config.keyPreview || ''})`;
  } else {
    elements.geminiKeyStatus.textContent = 'No key found in .env';
  }
  elements.settingsModal.style.display = 'flex';
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const provider = elements.providerSelect.value;
  const geminiKey = elements.geminiApiKey.value.trim();
  const openaiKey = elements.openaiApiKey.value.trim();

  const payload = { provider };
  if (geminiKey) payload.geminiApiKey = geminiKey;
  if (openaiKey) payload.openaiApiKey = openaiKey;

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      state.config = data.config;
      updateModelStatusBadge();
      elements.settingsModal.style.display = 'none';
      showToast(`Provider updated: ${provider.toUpperCase()}`);
    }
  } catch (err) {
    console.error('Settings error:', err);
  }
}

// Helpers
function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d);
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
