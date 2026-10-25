Task Specification: University Health Center Frontline Triage Chatbot 

1. System Overview & Core Directives 

Build a lightweight, web-based AI triage assistant for a University Health Center. The system functions analogously to an intake triage nurse: it greets the student, collects symptom history through conversational follow-ups, contextualizes against existing mock student health records (e.g., past lab results), and compiles a structured clinical intake summary for human provider review. 

 

Critical Safety Guardrails 

    No Direct Prescriptions / Formal Diagnoses: The LLM must not prescribe medication, tell students definitively to skip class, or issue definitive clinical diagnoses. 

 

    Liability & Triage Boundary: The agent only gathers, clarifies, and summarizes. All clinical action and final advice remain the explicit responsibility of the human provider. 

 

    Emergency Escalation: If red-flag symptoms are detected (e.g., severe chest pain, shortness of breath, suicidal ideation), the chatbot immediately presents emergency contact numbers (911 / Campus EMS) and advises immediate emergency care. 

 

2. Architecture & Data Contracts 

┌────────────────────────────────────────────────────────┐ 
│                   Web UI (Single-Page)                 │ 
│  ┌─────────────────────────┐  ┌──────────────────────┐ │ 
│  │   Student Chat View     │  │ Clinician Triage View│ │ 
│  └────────────┬────────────┘  └──────────▲───────────┘ │ 
└───────────────┼──────────────────────────┼─────────────┘ 
                │ HTTP / WebSocket         │ Polling / Event 
┌───────────────▼──────────────────────────┴─────────────┐ 
│                 Application Server / API                │ 
│  ┌────────────────────────┐  ┌───────────────────────┐ │ 
│  │  Mock EHR Store (JSON) │  │ LLM Orchestrator Engine││ 
│  └────────────────────────┘  └───────────────────────┘ │ 
└────────────────────────────────────────────────────────┘ 
 

Data Schemas 

A. Mock Student Health Record (data/mock_student_record.json) 

JSON 

{ 
  "student_id": "STU-88219", 
  "first_name": "Alex", 
  "last_name": "Taylor", 
  "date_of_birth": "2004-05-14", 
  "recent_labs": [ 
    { 
      "test_name": "Complete Blood Count (CBC) - Ferritin & Hemoglobin", 
      "date": "2026-02-10", 
      "findings": "Low serum ferritin (11 ng/mL, reference 20-200), mild microcytic anemia indicated.", 
      "status": "Reviewed by Dr. Chen" 
    } 
  ], 
  "medical_history": ["Mild seasonal allergies", "Iron deficiency anemia (managed)"] 
} 
 

B. Clinical Triage Summary Output (TriageReport) 

JSON 

{ 
  "student_id": "STU-88219", 
  "student_name": "Alex Taylor", 
  "timestamp": "2026-10-25T14:30:00Z", 
  "primary_complaint": "Persistent fatigue and generalized weakness", 
  "duration": "Past 2-3 weeks", 
  "contextual_history": "Mentions past low iron issues; labs from Feb 2026 show low ferritin.", 
  "symptom_details": "Tiredness worsening in afternoon, mild dizziness when standing quickly, no fever.", 
  "escalation_level": "Routine" | "Priority" | "Emergency", 
  "recommended_clinician_action": "Evaluate for repeat CBC/ferritin panel and iron supplementation." 
} 
 

3. Implementation Tasks 

Task 1: Mock EHR Store & Context Loader 

    Create data/mock_student_record.json using the schema defined above. 

 

    Implement a helper module (ehr_service.py or ehr_service.ts) that loads the record and exposes: 

 

    get_student_profile(student_id): Returns name, DOB, and medical history. 

 

    get_clinical_context(student_id): Extracts a concise text block of previous ailments and recent lab results to inject into the LLM system prompt. 

 

Task 2: LLM Intake & Triage Engine 

    System Prompt Design: 

 

    Role: University Health Center Frontline Intake Assistant. 

 

    Input Context: Inject get_clinical_context() directly into the system message. 

 

    Behavioral Rules: 

 

    Acknowledge user's reported state with empathy. 

 

    Ask targeted clarifying questions (onset, duration, severity 1–10, accompanying symptoms like fever, shortness of breath, or dizziness). 

 

    If the user mentions symptoms aligning with their history (e.g., "I'm exhausted"), acknowledge past context safely: "I see in your health record that you had some low iron levels flagged earlier this year. Have these symptoms felt similar to that?" 

 

    Explicitly state: "I'm an intake assistant gathering details for the clinical staff. A provider will review our conversation to advise on next steps." 

 

    Structured Report Extraction: 

 

    Implement a function/tool call or structured extraction step triggered once sufficient information is collected (or upon student clicking "Submit to Clinician"). 

 

    Parse conversation history into the TriageReport JSON format. 

 

Task 3: Dual-View Web Interface 

Implement a responsive web application containing two distinct panes: 

 

    Student Intake Chat Interface: 

 

    Header indicating authenticated student ("Logged in as Alex Taylor"). 

 

    Interactive chat stream (messages, input area, send button). 

 

    Visual indicators for assistant typing/processing. 

 

    Action button: "Send Report to Health Center" to finalize intake. 

 

    Clinician Triage Dashboard (Split pane or toggle view): 

 

    Feed displaying submitted TriageReport objects. 

 

    View card displaying: 

 

    Student Name & ID 

 

    Primary Complaint & Duration 

 

    Relevant Linked Lab History (from the mock record) 

 

    Structured Symptom Summary 

 

    Provider Action Buttons: Schedule In-Person Appointment, Request Lab Order, Mark Reviewed. 

4. Acceptance Criteria & Validation Flow 

Test Case 
	

Step / Input 
	

Expected Result 

1. Auth & Context Injection 
	

Launch application. 
	

Chatbot greets Alex by name; system prompt receives Feb 2026 CBC lab context. 

2. Conversational Intake 
	

Student inputs: "I've been feeling exhausted and weak lately." 
	

Chatbot does not prescribe iron; asks follow-up questions (duration, severity) and notes previous iron history. 

3. Safety Boundary 
	

Student inputs: "Should I start taking 65mg iron pills again and skip classes?" 
	

Chatbot refuses medical advice: "I cannot prescribe dosages or grant medical leave. I'm documenting this for your clinician." 

4. Report Generation 
	

Student or agent completes triage. 
	

A valid TriageReport JSON is generated and displayed on the Clinician Triage Dashboard. 

5. Red Flag Guardrail 
	

Student inputs: "I have sudden severe chest pain and can't catch my breath." 
	

Chatbot immediately responds with red-flag emergency alert and instructs to dial 911 or visit the emergency department. 

 

 

Here is the system prompt for the local LLM: 

 

System Prompt (system_prompt.md) 

Markdown 

You are the frontline Digital Intake Triage Assistant for the University Health Center. 
 
### Role & Objective 
Your role is analogous to an intake triage nurse: greet the student warmly, clarify presenting complaints, collect relevant symptom history, and cross-reference details against their existing mock health records. Once sufficient clinical details are gathered, you will invoke the `submit_triage_report` tool to transmit a structured report to the clinician dashboard. 
 
### Core Persona & Communication Rules 
- Tone: Empathetic, objective, professional, and clear. 
- Conversational cadence: Ask 1 to 2 targeted questions at a time. Avoid overwhelming the student with a wall of 10 clinical questions at once. 
- Grounding: Acknowledge existing records naturally when symptoms correspond (e.g., "I see in your record that you had low ferritin levels flagged in February. Have your current symptoms felt similar to that?"). 
 
### Critical Boundaries & Safety Guardrails 
1. No Diagnosing: Never provide a definitive diagnosis (e.g., do not say "You have anemia" or "You have mono"). Frame patterns as symptoms to explore with the provider. 
2. No Prescribing or Dosing: Never recommend specific medications, supplements, or exact dosages. If asked ("Should I take iron?"), respond that the clinician will review their records and determine appropriate treatments or lab orders. 
3. No Class Excusal Authority: You cannot issue official medical notes, excuses, or tell a student they are excused from exams or classes. State that documentation must be issued by a clinician. 
4. Hard Red Flags (Emergency Escalation): 
   - Red flag symptoms: Sudden severe chest pain, severe shortness of breath, sudden facial drooping or limb weakness, coughing up blood, anaphylaxis, or thoughts of self-harm. 
   - If detected: IMMEDIATELY stop regular intake. Provide campus emergency contacts (Campus Police / EMS: ext. 3131 or 911), instruct them to seek emergency care immediately, and call `submit_triage_report` with `escalation_level="Emergency"`. 
 
### Intake Collection Checklist 
Before completing intake, ensure you have gathered: 
- Primary symptom / chief complaint. 
- Onset and duration (when did it start, continuous vs. intermittent). 
- Severity (scale of 1–10 or impact on daily activities/sleep/classes). 
- Associated or pertinent negative symptoms (e.g., fever, dizziness, nausea, shortness of breath). 
- Prior history correlation (noting whether this matches prior recorded lab flags or diagnoses). 
 
When these details are complete, inform the student that you are sending their summary to the clinical staff for review, and invoke `submit_triage_report`. 
 

Injected Context Template 

Before initiating the session, dynamically populate and prepend this block to the assistant's system instructions: 

Markdown 

### Active Student Context 
- Student ID: STU-88219 
- Name: Alex Taylor 
- DOB: 2004-05-14 
- Known Allergies: Seasonal pollen 
- Chronic / Past Conditions: Iron deficiency anemia (managed) 
- Relevant Recent Lab History: 
  - 2026-02-10: Complete Blood Count (CBC) & Ferritin Panel 
    - Findings: Serum ferritin: 11 ng/mL (Ref: 20–200 ng/mL); Hemoglobin: 11.2 g/dL (mild microcytic anemia pattern). Reviewed by Dr. Chen. 
 

Function / Tool Schema (tools.json) 

JSON 

[ 
  { 
    "type": "function", 
    "function": { 
      "name": "submit_triage_report", 
      "description": "Submits a standardized clinical intake summary to the health center's provider dashboard after completing conversational symptom triage.", 
      "parameters": { 
        "type": "object", 
        "properties": { 
          "student_id": { 
            "type": "string", 
            "description": "Unique student identifier (e.g., STU-88219)." 
          }, 
          "student_name": { 
            "type": "string", 
            "description": "Full name of the student." 
          }, 
          "chief_complaint": { 
            "type": "string", 
            "description": "Primary symptom or reason for contacting the health center (e.g., 'Persistent fatigue and afternoon weakness')." 
          }, 
          "duration_and_onset": { 
            "type": "string", 
            "description": "Timeline of symptoms, including onset date and progression (e.g., 'Gradual onset over past 3 weeks, worsening in afternoons')." 
          }, 
          "symptom_details": { 
            "type": "string", 
            "description": "Detailed clinical characteristics: severity, functional impact, alleviating/aggravating factors, and pertinent negatives (e.g., 'Reports lightheadedness on standing; denies fever, chills, cough, or chest pain')." 
          }, 
          "relevant_history_notes": { 
            "type": "string", 
            "description": "Correlation between current symptoms and existing records/labs (e.g., 'Symptoms mirror February 2026 iron deficiency presentation; ferritin was 11 ng/mL')." 
          }, 
          "escalation_level": { 
            "type": "string", 
            "enum": ["Routine", "Priority", "Emergency"], 
            "description": "Clinical urgency tier based on reported symptoms and red flag presence." 
          }, 
          "suggested_provider_action": { 
            "type": "string", 
            "description": "Suggested non-binding clinical follow-up for the provider to consider (e.g., 'Evaluate for repeat CBC/ferritin panel; review oral iron compliance')." 
          } 
        }, 
        "required": [ 
          "student_id", 
          "student_name", 
          "chief_complaint", 
          "duration_and_onset", 
          "symptom_details", 
          "escalation_level", 
          "suggested_provider_action" 
        ], 
        "additionalProperties": false 
      } 
    } 
  } 
] 
 

 

 

I can provide my API key if necesary  