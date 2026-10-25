const fs = require('fs');
const path = require('path');

let cachedRecords = null;

function resolveDataFilePath(filename = 'mock_students.json') {
  const possiblePaths = [
    path.join(__dirname, 'data', filename),
    path.join(process.cwd(), 'data', filename),
    path.join(__dirname, '..', 'data', filename)
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return path.join(process.cwd(), 'data', filename);
}

function loadAllStudentRecords() {
  if (cachedRecords) {
    return cachedRecords;
  }

  // First try mock_students.json
  const studentsPath = resolveDataFilePath('mock_students.json');
  if (fs.existsSync(studentsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(studentsPath, 'utf-8'));
      if (Array.isArray(data)) {
        cachedRecords = data;
        return data;
      }
    } catch (e) {
      console.warn('Error reading mock_students.json', e);
    }
  }

  // Fallback to mock_student_record.json
  const singlePath = resolveDataFilePath('mock_student_record.json');
  if (fs.existsSync(singlePath)) {
    const data = JSON.parse(fs.readFileSync(singlePath, 'utf-8'));
    cachedRecords = [data];
    return cachedRecords;
  }

  return [];
}

function loadStudentRecord(studentId) {
  const records = loadAllStudentRecords();
  if (!studentId) {
    return records[0] || null;
  }
  const match = records.find(r => r.student_id.toLowerCase() === studentId.toLowerCase());
  return match || records[0] || null;
}

/**
 * Returns array of brief student profiles for the directory.
 */
function get_all_students() {
  const records = loadAllStudentRecords();
  return records.map(r => ({
    student_id: r.student_id,
    name: `${r.first_name} ${r.last_name}`,
    first_name: r.first_name,
    last_name: r.last_name,
    date_of_birth: r.date_of_birth,
    medical_history: r.medical_history,
    recent_labs: r.recent_labs
  }));
}

/**
 * Returns name, DOB, and medical history for a student.
 */
function get_student_profile(student_id) {
  const record = loadStudentRecord(student_id);
  if (!record) {
    return {
      student_id: student_id || 'STU-UNKNOWN',
      name: 'Unknown Student',
      first_name: 'Unknown',
      last_name: 'Student',
      date_of_birth: '',
      medical_history: [],
      recent_labs: []
    };
  }
  return {
    student_id: record.student_id,
    name: `${record.first_name} ${record.last_name}`,
    first_name: record.first_name,
    last_name: record.last_name,
    date_of_birth: record.date_of_birth,
    medical_history: record.medical_history,
    recent_labs: record.recent_labs
  };
}

/**
 * Extracts a concise text block of previous ailments and recent lab results to inject into the LLM system prompt.
 */
function get_clinical_context(student_id) {
  const record = loadStudentRecord(student_id);
  if (!record) return 'No student context available.';

  const fullName = `${record.first_name} ${record.last_name}`;
  const allergies = record.medical_history.find(h => h.toLowerCase().includes('allerg')) || 'None reported';
  const chronicConditions = record.medical_history.filter(h => !h.toLowerCase().includes('allerg')).join(', ') || 'None reported';

  let labLines = '  - No recent labs on file.';
  if (record.recent_labs && record.recent_labs.length > 0) {
    labLines = record.recent_labs.map(lab => 
      `  - ${lab.date}: ${lab.test_name}\n    - Findings: ${lab.findings} ${lab.status ? `(${lab.status})` : ''}`
    ).join('\n');
  }

  return `### Active Student Context
- Student ID: ${record.student_id}
- Name: ${fullName}
- DOB: ${record.date_of_birth}
- Known Allergies: ${allergies}
- Chronic / Past Conditions: ${chronicConditions}
- Relevant Recent Lab History:
${labLines}`.trim();
}

module.exports = {
  loadAllStudentRecords,
  loadStudentRecord,
  get_all_students,
  get_student_profile,
  get_clinical_context
};
