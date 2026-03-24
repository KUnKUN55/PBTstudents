// ============================================
// PBTstudents LMS — Google Sheets Setup Script (Phase 2)
// วิธีใช้: เปิด Google Sheets > Extensions > Apps Script > วาง code นี้ > รัน setupAllSheets()
// ⚠️ การรัน setupAllSheets() จะล้างข้อมูลทั้งหมด — backup ก่อนเสมอ!
// ============================================

function setupAllSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── 1. Users ──
  createOrResetSheet(ss, 'Users', [
    'user_id', 'student_id', 'username', 'password_hash', 
    'first_name', 'last_name', 'nickname', 'birth_date', 'citizen_id_enc',
    'role', 'avatar_color', 'status', 'created_at'
  ]);

  // ── 2. Subjects ──
  createOrResetSheet(ss, 'Subjects', [
    'subject_id', 'subject_name', 'icon', 'color', 'description', 
    'pass_threshold', 'order_index'
  ]);

  // ── 3. Lessons ──
  createOrResetSheet(ss, 'Lessons', [
    'lesson_id', 'subject_id', 'title', 'description', 'file_url', 
    'file_type', 'chapter', 'order_index', 'created_at'
  ]);

  // ── 4. Assignments ──
  createOrResetSheet(ss, 'Assignments', [
    'assignment_id', 'subject_id', 'title', 'type', 'max_score', 
    'due_date', 'description', 'pass_threshold', 'created_at'
  ]);

  // ── 5. Questions ──
  createOrResetSheet(ss, 'Questions', [
    'question_id', 'assignment_id', 'question_text', 'question_type',
    'choice_a', 'choice_b', 'choice_c', 'choice_d', 'correct_answer',
    'image_url', 'max_points', 'order_index'
  ]);

  // ── 6. Scores ──
  createOrResetSheet(ss, 'Scores', [
    'score_id', 'user_id', 'assignment_id', 'score', 'max_score',
    'answers_json', 'grading_status', 'feedback_json',
    'is_passed_override', 'graded_by', 'graded_at', 'submitted_at'
  ]);

  // ── 7. Score_History (New in Phase 2) ──
  createOrResetSheet(ss, 'Score_History', [
    'history_id', 'score_id', 'user_id', 'assignment_id', 
    'old_score', 'new_score', 'reason', 'changed_by', 'timestamp'
  ]);

  // ── 8. Profile_History (New in Phase 2) ──
  createOrResetSheet(ss, 'Profile_History', [
    'history_id', 'user_id', 'field_changed', 'old_value', 
    'new_value', 'changed_by', 'timestamp'
  ]);

  // ── 9. Logs ──
  createOrResetSheet(ss, 'Logs', [
    'log_id', 'user_id', 'action_type', 'detail', 'timestamp'
  ]);

  // ── Seed demo data ──
  seedDemoData(ss);

  SpreadsheetApp.getUi().alert('✅ สร้าง Sheets สำหรับ Phase 2 ทั้งหมดเรียบร้อยแล้ว!');
}

function createOrResetSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (sheet) {
    sheet.clearContents();
  } else {
    sheet = ss.insertSheet(name);
  }

  // Set headers
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Format header row
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1e293b');
  headerRange.setFontColor('#e2e8f0');

  // Auto-resize columns
  for (var i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }

  // Freeze header row
  sheet.setFrozenRows(1);

  return sheet;
}

function seedDemoData(ss) {
  var now = new Date().toISOString();

  // ── Demo Users ──
  var users = ss.getSheetByName('Users');
  // 'user_id', 'student_id', 'username', 'password_hash', 'first_name', 'last_name', 'nickname', 'birth_date', 'citizen_id_enc', 'role', 'avatar_color', 'status', 'created_at'
  var demoUsers = [
    ['U001', 'PBT10000', 'admin',    hashPassword('admin123'), 'แอดมิน', 'ระบบ', 'Admin', '1990-01-01', encryptCitizenId('1234567890123'), 'admin',   '#3b82f6', 'active', now],
    ['U002', 'PBT10001', 'student1', hashPassword('student1'), 'สมชาย', 'ใจดี', 'ชาย', '2005-05-15', encryptCitizenId('1111111111111'), 'student', '#10b981', 'active', now],
    ['U003', 'PBT10002', 'student2', hashPassword('student2'), 'สมหญิง', 'น่ารัก', 'หญิง', '2006-08-20', encryptCitizenId('2222222222222'), 'student', '#8b5cf6', 'active', now]
  ];
  users.getRange(2, 1, demoUsers.length, demoUsers[0].length).setValues(demoUsers);

  // ── Demo Subjects ──
  var subjects = ss.getSheetByName('Subjects');
  // 'subject_id', 'subject_name', 'icon', 'color', 'description', 'pass_threshold', 'order_index'
  var demoSubjects = [
    ['SUB001', 'ชีววิทยา',   '🧬', '#10b981', 'ติวชีววิทยา ม.ปลาย', 50, 1],
    ['SUB002', 'เคมี',       '⚗️', '#8b5cf6', 'ติวเคมี ม.ปลาย', 60, 2]
  ];
  subjects.getRange(2, 1, demoSubjects.length, demoSubjects[0].length).setValues(demoSubjects);

  // ── Demo Lessons ──
  var lessons = ss.getSheetByName('Lessons');
  var demoLessons = [
    ['L001', 'SUB001', 'เซลล์และโครงสร้างเซลล์', 'เนื้อหาเกี่ยวกับเซลล์พืชและเซลล์สัตว์', '', 'pdf', 'บทที่ 1', 1, now]
  ];
  lessons.getRange(2, 1, demoLessons.length, demoLessons[0].length).setValues(demoLessons);

  // ── Demo Assignment ──
  var assignments = ss.getSheetByName('Assignments');
  var demoAssignments = [
    ['A001', 'SUB001', 'ข้อสอบ: เซลล์และโครงสร้าง', 'quiz', 10, '', 'ข้อสอบวัดความรู้เรื่องเซลล์', 50, now]
  ];
  assignments.getRange(2, 1, demoAssignments.length, demoAssignments[0].length).setValues(demoAssignments);

  // ── Demo Questions ──
  var questions = ss.getSheetByName('Questions');
  var demoQuestions = [
    ['Q001', 'A001', 'ออร์แกเนลล์ใดทำหน้าที่สร้างพลังงาน (ATP)?', 'mcq', 'ไรโบโซม', 'ไมโทคอนเดรีย', 'กอลจิบอดี', 'ไลโซโซม', 'B', '', 2, 1],
    ['Q002', 'A001', 'เยื่อหุ้มเซลล์มีโครงสร้างเป็นแบบใด?', 'mcq', 'Fluid Mosaic', 'Double Helix', 'Beta Sheet', 'Alpha Helix', 'A', '', 2, 2]
  ];
  questions.getRange(2, 1, demoQuestions.length, demoQuestions[0].length).setValues(demoQuestions);
}

// ── Helpers for Setup ──
function hashPassword(password) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  var hash = '';
  for (var i = 0; i < raw.length; i++) {
    var byte = raw[i];
    if (byte < 0) byte += 256;
    var hex = byte.toString(16);
    if (hex.length === 1) hex = '0' + hex;
    hash += hex;
  }
  return hash;
}

// Basic Base64 encoding for Demo setup (real encryption in Code.gs)
function encryptCitizenId(citizenId) {
  if (!citizenId) return '';
  return Utilities.base64Encode(Utilities.newBlob(citizenId).getBytes());
}
