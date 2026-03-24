// ============================================
// PBTstudents LMS — Google Sheets Setup Script
// วิธีใช้: เปิด Google Sheets > Extensions > Apps Script > วาง code นี้ > รัน setupAllSheets()
// ⚠️ การรัน setupAllSheets() จะล้างข้อมูลทั้งหมด — backup ก่อนเสมอ!
// ============================================

function setupAllSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── 1. Users ──
  createOrResetSheet(ss, 'Users', [
    'user_id', 'username', 'password_hash', 'name', 'role', 'avatar_color', 'email', 'status', 'created_at'
  ]);

  // ── 2. Subjects ──
  createOrResetSheet(ss, 'Subjects', [
    'subject_id', 'subject_name', 'icon', 'color', 'description', 'order_index'
  ]);

  // ── 3. Lessons ──
  createOrResetSheet(ss, 'Lessons', [
    'lesson_id', 'subject_id', 'title', 'description', 'file_url', 'file_type', 'chapter', 'order_index', 'created_at'
  ]);

  // ── 4. Assignments (ข้อสอบ, แบบฝึกหัด) ──
  createOrResetSheet(ss, 'Assignments', [
    'assignment_id', 'subject_id', 'title', 'type', 'max_score', 'due_date', 'description', 'pass_threshold', 'created_at'
  ]);

  // ── 5. Questions (รองรับ MCQ / Essay / Upload + รูปภาพ) ──
  createOrResetSheet(ss, 'Questions', [
    'question_id', 'assignment_id', 'question_text', 'question_type',
    'choice_a', 'choice_b', 'choice_c', 'choice_d', 'correct_answer',
    'image_url', 'max_points', 'order_index'
  ]);

  // ── 6. Scores (คะแนนสอบ + ระบบตรวจ Manual) ──
  createOrResetSheet(ss, 'Scores', [
    'score_id', 'user_id', 'assignment_id', 'score', 'max_score',
    'answers_json', 'grading_status', 'feedback_json',
    'graded_by', 'graded_at', 'submitted_at'
  ]);

  // ── 7. Logs ──
  createOrResetSheet(ss, 'Logs', [
    'log_id', 'user_id', 'action_type', 'detail', 'timestamp'
  ]);

  // ── 8. Progress ──
  createOrResetSheet(ss, 'Progress', [
    'user_id', 'lesson_id', 'status', 'last_access'
  ]);

  // ── Seed demo data ──
  seedDemoData(ss);

  SpreadsheetApp.getUi().alert('✅ สร้าง Sheets ทั้งหมดเรียบร้อยแล้ว! (8 sheets + demo data)');
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
  var demoUsers = [
    ['U001', 'admin',    hashPassword('admin123'),   'ครูพี่ติว (Admin)', 'admin',   '#3b82f6', '', 'active', now],
    ['U002', 'student1', hashPassword('student1'),   'นักเรียน 1',        'student', '#10b981', '', 'active', now],
    ['U003', 'student2', hashPassword('student2'),   'นักเรียน 2',        'student', '#8b5cf6', '', 'active', now],
    ['U004', 'student3', hashPassword('student3'),   'นักเรียน 3',        'student', '#f59e0b', '', 'active', now],
    ['U005', 'student4', hashPassword('student4'),   'นักเรียน 4',        'student', '#ec4899', '', 'active', now]
  ];
  users.getRange(2, 1, demoUsers.length, demoUsers[0].length).setValues(demoUsers);

  // ── Demo Subjects ──
  var subjects = ss.getSheetByName('Subjects');
  var demoSubjects = [
    ['SUB001', 'ชีววิทยา',   '🧬', '#10b981', 'ติวชีววิทยา ม.ปลาย',   1],
    ['SUB002', 'เคมี',       '⚗️', '#8b5cf6', 'ติวเคมี ม.ปลาย',       2],
    ['SUB003', 'ฟิสิกส์',    '⚛️', '#3b82f6', 'ติวฟิสิกส์ ม.ปลาย',    3]
  ];
  subjects.getRange(2, 1, demoSubjects.length, demoSubjects[0].length).setValues(demoSubjects);

  // ── Demo Lessons ──
  var lessons = ss.getSheetByName('Lessons');
  var demoLessons = [
    ['L001', 'SUB001', 'เซลล์และโครงสร้างเซลล์',       'เนื้อหาเกี่ยวกับเซลล์พืชและเซลล์สัตว์',           '', 'pdf',   'บทที่ 1', 1, now],
    ['L002', 'SUB001', 'การแบ่งเซลล์',                   'ไมโทซิสและไมโอซิส',                                   '', 'pdf',   'บทที่ 1', 2, now],
    ['L003', 'SUB002', 'อะตอมและตารางธาตุ',              'โครงสร้างอะตอม ตารางธาตุ และสมบัติธาตุ',            '', 'pdf',   'บทที่ 1', 1, now],
    ['L004', 'SUB003', 'การเคลื่อนที่แนวตรง',           'ระยะทาง การกระจัด ความเร็ว ความเร่ง',               '', 'pdf',   'บทที่ 1', 1, now]
  ];
  lessons.getRange(2, 1, demoLessons.length, demoLessons[0].length).setValues(demoLessons);

  // ── Demo Assignment (Quiz) — with pass_threshold ──
  var assignments = ss.getSheetByName('Assignments');
  var demoAssignments = [
    ['A001', 'SUB001', 'ข้อสอบ: เซลล์และโครงสร้าง', 'quiz', 10, '', 'ข้อสอบวัดความรู้เรื่องเซลล์', 50, now]
  ];
  assignments.getRange(2, 1, demoAssignments.length, demoAssignments[0].length).setValues(demoAssignments);

  // ── Demo Questions (with question_type, image_url, max_points, order_index) ──
  var questions = ss.getSheetByName('Questions');
  var demoQuestions = [
    ['Q001', 'A001', 'ออร์แกเนลล์ใดทำหน้าที่สร้างพลังงาน (ATP)?',        'mcq', 'ไรโบโซม',       'ไมโทคอนเดรีย', 'กอลจิบอดี',     'ไลโซโซม',      'B', '', 2, 1],
    ['Q002', 'A001', 'เยื่อหุ้มเซลล์มีโครงสร้างเป็นแบบใด?',              'mcq', 'Fluid Mosaic',  'Double Helix',  'Beta Sheet',    'Alpha Helix',  'A', '', 2, 2],
    ['Q003', 'A001', 'DNA อยู่ในส่วนใดของเซลล์?',                          'mcq', 'ไซโทพลาซึม',    'นิวเคลียส',     'ไรโบโซม',       'เยื่อหุ้มเซลล์', 'B', '', 2, 3],
    ['Q004', 'A001', 'อธิบายความแตกต่างระหว่างเซลล์พืชและเซลล์สัตว์',       'essay', '',           '',              '',             '',             '', '', 5, 4],
    ['Q005', 'A001', 'สรุปเนื้อหาบทเรียนที่ 1 (อัพโหลดสรุปแบบ Mind Map)',  'upload', '',          '',              '',             '',             '', '', 5, 5]
  ];
  questions.getRange(2, 1, demoQuestions.length, demoQuestions[0].length).setValues(demoQuestions);
}

// ── SHA-256 Hash ──
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
