// ============================================
// PBTstudents LMS — Backend API (Phase 2)
// Deploy: Extensions > Apps Script > Deploy > Web App > Anyone
// ============================================

// ── Entry Point ──
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action || '';
    var result;

    switch (action) {
      // ── Auth ──
      case 'login':               result = handleLogin(body); break;

      // ── Student Actions ──
      case 'getSubjects':         result = handleGetSubjects(body); break;
      case 'getLessons':          result = handleGetLessons(body); break;
      case 'getAssignments':      result = handleGetAssignments(body); break;
      case 'getQuestions':        result = handleGetQuestions(body); break;
      case 'submitQuiz':          result = handleSubmitQuiz(body); break;
      case 'getScores':           result = handleGetScores(body); break;
      case 'getDashboard':        result = handleGetDashboard(body); break;
      case 'getProgress':         result = handleGetProgress(body); break;
      case 'markLessonComplete':  result = handleMarkLessonComplete(body); break;
      case 'logAction':           result = handleLogAction(body); break;
      case 'getStudentReport':    result = handleGetStudentReport(body); break;
      case 'updateMyProfile':     result = handleUpdateMyProfile(body); break;

      // ── Admin Actions ──
      case 'adminGetUsers':          result = handleAdminGetUsers(body); break;
      case 'adminAddUser':           result = handleAdminAddUser(body); break;
      case 'adminUpdateUser':        result = handleAdminUpdateUser(body); break;
      case 'adminDeleteUser':        result = handleAdminDeleteUser(body); break;
      case 'adminChangePassword':    result = handleAdminChangePassword(body); break;
      case 'adminAddSubject':        result = handleAdminAddSubject(body); break;
      case 'adminAddLesson':         result = handleAdminAddLesson(body); break;
      case 'adminAddAssignment':     result = handleAdminAddAssignment(body); break;
      case 'adminAddQuestion':       result = handleAdminAddQuestion(body); break;
      case 'adminGetAllScores':      result = handleAdminGetAllScores(body); break;
      case 'adminUpdateItem':        result = handleAdminUpdateItem(body); break;
      case 'adminDeleteItem':        result = handleAdminDeleteItem(body); break;
      case 'adminGetSubmissions':    result = handleAdminGetSubmissions(body); break;
      case 'adminGradeSubmission':   result = handleAdminGradeSubmission(body); break;
      case 'adminAdjustScore':       result = handleAdminAdjustScore(body); break;
      case 'adminGetStudentDetail':  result = handleAdminGetStudentDetail(body); break;
      case 'adminGetDashboard':      result = handleAdminGetDashboard(body); break;

      default:
        result = { status: 'error', message: 'Unknown action: ' + action };
    }

    return jsonResponse(result);

  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function doGet(e) {
  return jsonResponse({ status: 'ok', message: 'PBTstudents LMS API Phase 2 is running' });
}


// ============================================
// HELPERS
// ============================================

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function sheetToObjects(sheetName) {
  var sheet = getSheet(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var objects = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = data[i][j];
      if (val instanceof Date) val = val.toISOString();
      obj[headers[j]] = val;
    }
    if (obj[headers[0]] !== '' && obj[headers[0]] !== null && obj[headers[0]] !== undefined) {
      objects.push(obj);
    }
  }
  return objects;
}

function generateId(prefix) {
  return prefix + '_' + new Date().getTime().toString(36) + Math.random().toString(36).substr(2, 4);
}

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

function encryptCitizenId(id) {
  if (!id) return '';
  return Utilities.base64Encode(Utilities.newBlob(id).getBytes(), Utilities.Charset.UTF_8);
}

function decryptCitizenId(encoded) {
  if (!encoded) return '';
  try {
    return Utilities.newBlob(Utilities.base64Decode(encoded)).getDataAsString();
  } catch(e) { return ''; }
}

function maskCitizenId(id) {
  if (!id || id.length < 13) return id;
  return id.substring(0, 4) + '-XXXX-XXXX-' + id.substring(12);
}

function generatePBTStudentId() {
  var users = sheetToObjects('Users');
  var maxNum = 10000;
  for (var i = 0; i < users.length; i++) {
    var sid = users[i].student_id || '';
    if (sid.startsWith('PBT')) {
      var num = parseInt(sid.replace('PBT', ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  return 'PBT' + (maxNum + 1);
}

function requireAuth(body) {
  if (!body.user_id) throw new Error('กรุณาเข้าสู่ระบบก่อน');
  return true;
}

function requireAdmin(body) {
  requireAuth(body);
  if (body.role !== 'admin') throw new Error('คุณไม่มีสิทธิ์เข้าถึงส่วนนี้');
  return true;
}

function calculateGrade(percent) {
  if (percent >= 80) return { letter: 'A', label: 'ยอดเยี่ยม', color: '#10b981' };
  if (percent >= 70) return { letter: 'B+', label: 'ดีมาก', color: '#06b6d4' };
  if (percent >= 60) return { letter: 'B', label: 'ดี', color: '#3b82f6' };
  if (percent >= 50) return { letter: 'C+', label: 'ค่อนข้างดี', color: '#f59e0b' };
  if (percent >= 40) return { letter: 'C', label: 'พอใช้', color: '#f97316' };
  return { letter: 'D', label: 'ต้องปรับปรุง', color: '#ef4444' };
}

function logToSheet(userId, actionType, detail) {
  try {
    var sheet = getSheet('Logs');
    if (sheet) {
      sheet.appendRow([generateId('LOG'), userId, actionType, detail, new Date().toISOString()]);
    }
  } catch (e) { /* Silently fail */ }
}

function logProfileHistory(userId, fieldChanged, oldValue, newValue, changedBy) {
  try {
    var sheet = getSheet('Profile_History');
    if (sheet) {
      sheet.appendRow([generateId('PH'), userId, fieldChanged, oldValue, newValue, changedBy, new Date().toISOString()]);
    }
  } catch (e) {}
}


// ============================================
// AUTH
// ============================================

function handleLogin(body) {
  var username = (body.username || '').trim();
  var password = (body.password || '').trim();

  if (!username || !password) return { status: 'error', message: 'กรุณากรอก username และ password' };

  var users = sheetToObjects('Users');
  var hashed = hashPassword(password);

  for (var i = 0; i < users.length; i++) {
    if (users[i].username === username && users[i].password_hash === hashed) {
      if (users[i].status === 'inactive') return { status: 'error', message: 'บัญชีถูกระงับ กรุณาติดต่อครูผู้สอน' };
      
      logToSheet(users[i].user_id, 'login', 'เข้าสู่ระบบ');
      return {
        status: 'success',
        user: {
          user_id: users[i].user_id,
          student_id: users[i].student_id,
          username: users[i].username,
          name: (users[i].first_name || '') + ' ' + (users[i].last_name || ''),
          first_name: users[i].first_name,
          last_name: users[i].last_name,
          nickname: users[i].nickname,
          role: users[i].role,
          avatar_color: users[i].avatar_color
        }
      };
    }
  }
  return { status: 'error', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
}

// ============================================
// STUDENT ACTIONS
// ============================================

function handleUpdateMyProfile(body) {
  requireAuth(body);
  var updates = body.updates || {};
  
  var sheet = getSheet('Users');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf('user_id');

  for (var r = 1; r < data.length; r++) {
    if (data[r][idCol] === body.user_id) {
      var allowedFields = ['first_name', 'last_name', 'nickname'];
      for (var i = 0; i < allowedFields.length; i++) {
        var key = allowedFields[i];
        if (updates[key] !== undefined) {
          var col = headers.indexOf(key);
          if (col !== -1) {
            var oldVal = data[r][col];
            sheet.getRange(r + 1, col + 1).setValue(updates[key]);
            logProfileHistory(body.user_id, key, oldVal, updates[key], body.user_id);
          }
        }
      }
      
      if (updates.password && updates.password.length >= 4) {
        var passCol = headers.indexOf('password_hash');
        sheet.getRange(r + 1, passCol + 1).setValue(hashPassword(updates.password));
        logProfileHistory(body.user_id, 'password', '***', '***', body.user_id);
      }

      logToSheet(body.user_id, 'update_profile', 'นักเรียนแก้ไข profile');
      return { status: 'success', message: 'อัพเดทโปรไฟล์เรียบร้อย' };
    }
  }
  return { status: 'error', message: 'ไม่พบผู้ใช้' };
}

function handleGetSubjects(body) {
  requireAuth(body);
  var subjects = sheetToObjects('Subjects');
  subjects.sort(function(a, b) { return (a.order_index || 0) - (b.order_index || 0); });

  var lessons = sheetToObjects('Lessons');
  var assignments = sheetToObjects('Assignments');

  for (var i = 0; i < subjects.length; i++) {
    var sid = subjects[i].subject_id;
    subjects[i].lesson_count = lessons.filter(function(l) { return l.subject_id === sid; }).length;
    subjects[i].assignment_count = assignments.filter(function(a) { return a.subject_id === sid; }).length;
  }
  return { status: 'success', subjects: subjects };
}

function handleGetLessons(body) {
  requireAuth(body);
  var subjectId = body.subject_id;
  var lessons = sheetToObjects('Lessons');
  var filtered = lessons.filter(function(l) { return l.subject_id === subjectId; });
  filtered.sort(function(a, b) { return (a.order_index || 0) - (b.order_index || 0); });

  var progress = sheetToObjects('Progress');
  for (var i = 0; i < filtered.length; i++) {
    var prog = progress.filter(function(p) { return p.user_id === body.user_id && p.lesson_id === filtered[i].lesson_id; });
    filtered[i].completed = prog.length > 0 && prog[0].status === 'completed';
  }
  return { status: 'success', lessons: filtered };
}

function handleGetAssignments(body) {
  requireAuth(body);
  var assignments = sheetToObjects('Assignments');
  var filtered = assignments.filter(function(a) { return a.subject_id === body.subject_id; });
  var scores = sheetToObjects('Scores');
  var history = sheetToObjects('Score_History'); // Get history to flag overrides

  for (var i = 0; i < filtered.length; i++) {
    var userScore = scores.filter(function(s) { return s.user_id === body.user_id && s.assignment_id === filtered[i].assignment_id; });
    if (userScore.length > 0) {
      var sc = userScore[0];
      filtered[i].user_score = sc.score;
      filtered[i].submitted = true;
      filtered[i].grading_status = sc.grading_status || 'auto_graded';
      // Check if overridden
      var h = history.filter(function(x) { return x.score_id === sc.score_id; });
      filtered[i].is_adjusted = h.length > 0; 
      filtered[i].is_passed_override = sc.is_passed_override !== '' ? sc.is_passed_override : null;
    } else {
      filtered[i].user_score = null;
      filtered[i].submitted = false;
      filtered[i].grading_status = null;
      filtered[i].is_adjusted = false;
    }
  }
  return { status: 'success', assignments: filtered };
}

function handleGetQuestions(body) {
  requireAuth(body);
  var assignmentId = body.assignment_id;
  var questions = sheetToObjects('Questions');
  var filtered = questions.filter(function(q) { return q.assignment_id === assignmentId; });
  filtered.sort(function(a, b) { return (a.order_index || 0) - (b.order_index || 0); });

  var safeQuestions = filtered.map(function(q) {
    var item = {
      question_id: q.question_id, assignment_id: q.assignment_id,
      question_text: q.question_text, question_type: q.question_type || 'mcq',
      image_url: q.image_url || '', max_points: Number(q.max_points) || 1
    };
    if ((q.question_type || 'mcq') === 'mcq') {
      item.choice_a = q.choice_a; item.choice_b = q.choice_b;
      item.choice_c = q.choice_c; item.choice_d = q.choice_d;
    }
    return item;
  });

  var assignments = sheetToObjects('Assignments');
  var assignment = assignments.filter(function(a) { return a.assignment_id === assignmentId; })[0] || null;

  var scores = sheetToObjects('Scores');
  var existing = scores.filter(function(s) { return s.user_id === body.user_id && s.assignment_id === assignmentId; });

  var feedback = null, isPassedOverride = null;
  if (existing.length > 0) {
    if (existing[0].feedback_json) { try { feedback = JSON.parse(existing[0].feedback_json); } catch(e) {} }
    isPassedOverride = existing[0].is_passed_override;
  }

  return {
    status: 'success',
    assignment: assignment,
    questions: safeQuestions,
    already_submitted: existing.length > 0,
    previous_score: existing.length > 0 ? existing[0].score : null,
    grading_status: existing.length > 0 ? (existing[0].grading_status || 'auto_graded') : null,
    is_passed_override: isPassedOverride !== '' ? isPassedOverride : null,
    feedback: feedback
  };
}

function handleSubmitQuiz(body) {
  requireAuth(body);
  var assignmentId = body.assignment_id;
  var answers = body.answers;
  if (!assignmentId || !answers) return { status: 'error', message: 'Missing assignment_id or answers' };

  var questions = sheetToObjects('Questions');
  var filtered = questions.filter(function(q) { return q.assignment_id === assignmentId; });
  if (filtered.length === 0) return { status: 'error', message: 'ไม่พบคำถามสำหรับข้อสอบนี้' };

  var autoScore = 0;
  var totalMaxPoints = 0;
  var hasManualQuestions = false;
  var results = [];

  for (var i = 0; i < filtered.length; i++) {
    var q = filtered[i];
    var qType = q.question_type || 'mcq';
    var userAnswer = answers[q.question_id] || '';
    var maxPts = Number(q.max_points) || 1;
    totalMaxPoints += maxPts;

    if (qType === 'mcq') {
      var isCorrect = userAnswer.toString().toUpperCase() === (q.correct_answer || '').toUpperCase();
      if (isCorrect) autoScore += maxPts;
      results.push({ question_id: q.question_id, question_type: 'mcq', user_answer: userAnswer, correct_answer: q.correct_answer, is_correct: isCorrect, points: isCorrect ? maxPts : 0, max_points: maxPts });
    } else {
      hasManualQuestions = true;
      results.push({ question_id: q.question_id, question_type: qType, user_answer: userAnswer, points: 0, max_points: maxPts, grading_status: 'pending' });
    }
  }

  var gradingStatus = hasManualQuestions ? 'pending' : 'auto_graded';
  var finalScore = autoScore;

  var scoresSheet = getSheet('Scores');
  var scoresData = scoresSheet.getDataRange().getValues();
  var updated = false;

  for (var r = 1; r < scoresData.length; r++) {
    if (scoresData[r][1] === body.user_id && scoresData[r][2] === assignmentId) {
      scoresSheet.getRange(r + 1, 4).setValue(finalScore); 
      scoresSheet.getRange(r + 1, 5).setValue(totalMaxPoints);
      scoresSheet.getRange(r + 1, 6).setValue(JSON.stringify(answers));
      scoresSheet.getRange(r + 1, 7).setValue(gradingStatus);
      scoresSheet.getRange(r + 1, 8).setValue('');
      scoresSheet.getRange(r + 1, 9).setValue(''); // No override
      scoresSheet.getRange(r + 1, 10).setValue(''); // graded_by
      scoresSheet.getRange(r + 1, 11).setValue(''); // graded_at
      scoresSheet.getRange(r + 1, 12).setValue(new Date().toISOString());
      updated = true;
      break;
    }
  }

  if (!updated) {
    scoresSheet.appendRow([generateId('SC'), body.user_id, assignmentId, finalScore, totalMaxPoints, JSON.stringify(answers), gradingStatus, '', '', '', '', new Date().toISOString()]);
  }

  logToSheet(body.user_id, 'submit_quiz', 'ทำข้อสอบ ' + assignmentId + ' ได้ ' + finalScore + '/' + totalMaxPoints);

  return {
    status: 'success', score: finalScore, max_score: totalMaxPoints,
    percentage: totalMaxPoints > 0 ? Math.round((finalScore / totalMaxPoints) * 100) : 0,
    grading_status: gradingStatus, results: results
  };
}

function handleGetScores(body) {
  requireAuth(body);
  var scores = sheetToObjects('Scores');
  var userScores = scores.filter(function(s) { return s.user_id === body.user_id; });
  var assignments = sheetToObjects('Assignments');
  var subjects = sheetToObjects('Subjects');
  var history = sheetToObjects('Score_History'); // Check for edits

  for (var i = 0; i < userScores.length; i++) {
    var sc = userScores[i];
    var assignment = assignments.filter(function(a) { return a.assignment_id === sc.assignment_id; })[0];
    if (assignment) {
      sc.assignment_title = assignment.title;
      sc.subject_id = assignment.subject_id;
      sc.pass_threshold = Number(assignment.pass_threshold) || 50;
      var subject = subjects.filter(function(s) { return s.subject_id === assignment.subject_id; })[0];
      sc.subject_name = subject ? subject.subject_name : '';
    }
    if (sc.feedback_json) { try { sc.feedback = JSON.parse(sc.feedback_json); } catch(e) {} }

    // History flag
    var h = history.filter(function(x) { return x.score_id === sc.score_id; });
    sc.is_adjusted = h.length > 0;

    // Pass Logic
    var pct = sc.max_score > 0 ? Math.round((sc.score / sc.max_score) * 100) : 0;
    var threshold = sc.pass_threshold || 50;
    if (sc.is_passed_override && sc.is_passed_override !== '') {
      sc.passed = sc.is_passed_override.toString() === 'true'; // Manual override!
    } else {
      sc.passed = pct >= threshold;
    }
    sc.percentage = pct;
    sc.grading_status = sc.grading_status || 'auto_graded';
  }
  return { status: 'success', scores: userScores };
}

function handleGetDashboard(body) {
  return handleAdminGetStudentDetail({ user_id: body.user_id, target_user_id: body.user_id, role: 'student' }); 
}

function handleGetStudentReport(body) {
  var data = handleAdminGetStudentDetail({ user_id: body.user_id, target_user_id: body.user_id, role: 'admin' });
  return { status: 'success', report: data.scores };
}

function handleGetProgress(body) {
  requireAuth(body);
  var progress = sheetToObjects('Progress');
  var userProgress = progress.filter(function(p) { return p.user_id === body.user_id; });
  return { status: 'success', progress: userProgress };
}

function handleMarkLessonComplete(body) {
  requireAuth(body);
  var sheet = getSheet('Progress');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === body.user_id && data[i][1] === body.lesson_id) {
      sheet.getRange(i + 1, 3).setValue('completed');
      sheet.getRange(i + 1, 4).setValue(new Date().toISOString());
      return { status: 'success' };
    }
  }
  sheet.appendRow([body.user_id, body.lesson_id, 'completed', new Date().toISOString()]);
  return { status: 'success' };
}

function handleLogAction(body) {
  requireAuth(body);
  logToSheet(body.user_id, body.action_type, body.detail);
  return { status: 'success' };
}


// ============================================
// ADMIN — USER MANAGEMENT Phase 2
// ============================================

function handleAdminGetUsers(body) {
  requireAdmin(body);
  var users = sheetToObjects('Users');
  return {
    status: 'success',
    users: users.map(function(u) {
      var citizen_id = decryptCitizenId(u.citizen_id_enc);
      return {
        user_id: u.user_id,
        student_id: u.student_id,
        username: u.username,
        first_name: u.first_name || '',
        last_name: u.last_name || '',
        name: (u.first_name || '') + ' ' + (u.last_name || ''),
        nickname: u.nickname || '',
        birth_date: u.birth_date || '',
        citizen_id_masked: maskCitizenId(citizen_id),
        role: u.role,
        avatar_color: u.avatar_color,
        status: u.status || 'active',
        created_at: u.created_at || ''
      };
    })
  };
}

function handleAdminAddUser(body) {
  requireAdmin(body);
  var username = (body.username || '').trim();
  var password = (body.password || '').trim();
  var firstName = (body.first_name || '').trim();
  var lastName = (body.last_name || '').trim();

  if (!username || !password || !firstName) return { status: 'error', message: 'กรุณากรอก username, password และชื่อจริง' };
  
  var users = sheetToObjects('Users');
  if (users.filter(function(u) { return u.username === username; }).length > 0) {
    return { status: 'error', message: 'Username ถูกใช้แล้ว' };
  }

  var studentId = body.role === 'admin' ? generatePBTStudentId() : generatePBTStudentId();
  var citizenEnc = encryptCitizenId(body.citizen_id || '');
  var id = generateId('U');

  // 'user_id', 'student_id', 'username', 'password_hash', 'first_name', 'last_name', 'nickname', 'birth_date', 'citizen_id_enc', 'role', 'avatar_color', 'status', 'created_at'
  var sheet = getSheet('Users');
  sheet.appendRow([
    id, studentId, username, hashPassword(password), 
    firstName, lastName, body.nickname || '', body.birth_date || '', citizenEnc,
    body.role || 'student', body.avatar_color || '#10b981', 'active', new Date().toISOString()
  ]);

  logToSheet(body.user_id, 'admin_add_user', 'เพิ่มนักเรียน: ' + studentId);
  return { status: 'success', user_id: id, message: 'เพิ่มนักเรียน ID: ' + studentId + ' เรียบร้อย' };
}

function handleAdminUpdateUser(body) {
  requireAdmin(body);
  var targetUserId = body.target_user_id;
  if (!targetUserId) return { status: 'error', message: 'Missing target_user_id' };

  var sheet = getSheet('Users');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf('user_id');

  for (var r = 1; r < data.length; r++) {
    if (data[r][idCol] === targetUserId) {
      var updates = body.updates || {};
      for (var key in updates) {
        if (key === 'citizen_id') {
          var col = headers.indexOf('citizen_id_enc');
          if (col !== -1) {
            var oldEnc = data[r][col];
            var newEnc = encryptCitizenId(updates[key]);
            sheet.getRange(r + 1, col + 1).setValue(newEnc);
            logProfileHistory(targetUserId, 'citizen_id', '***', '***', body.user_id);
          }
        } else if (key !== 'user_id' && key !== 'password_hash' && key !== 'student_id') {
          var col = headers.indexOf(key);
          if (col !== -1) {
            var oldVal = data[r][col];
            sheet.getRange(r + 1, col + 1).setValue(updates[key]);
            logProfileHistory(targetUserId, key, oldVal, updates[key], body.user_id);
          }
        }
      }
      logToSheet(body.user_id, 'admin_update_user', 'แก้ไขข้อมูล user: ' + targetUserId);
      return { status: 'success', message: 'อัพเดทข้อมูลเรียบร้อย' };
    }
  }
  return { status: 'error', message: 'ไม่พบผู้ใช้' };
}

function handleAdminDeleteUser(body) {
  requireAdmin(body);
  if (body.target_user_id === body.user_id) return { status: 'error', message: 'ไม่สามารถลบบัญชีตัวเองได้' };
  
  var sheet = getSheet('Users');
  var data = sheet.getDataRange().getValues();
  var idCol = data[0].indexOf('user_id');
  for (var r = data.length - 1; r >= 1; r--) {
    if (data[r][idCol] === body.target_user_id) {
      sheet.deleteRow(r + 1);
      return { status: 'success', message: 'ลบผู้ใช้เรียบร้อย' };
    }
  }
  return { status: 'error', message: 'ไม่พบผู้ใช้' };
}

function handleAdminChangePassword(body) {
  requireAdmin(body);
  if (!body.target_user_id || !body.new_password) return { status: 'error', message: 'Missing fields' };
  
  var sheet = getSheet('Users');
  var data = sheet.getDataRange().getValues();
  var idCol = data[0].indexOf('user_id');
  var passCol = data[0].indexOf('password_hash');

  for (var r = 1; r < data.length; r++) {
    if (data[r][idCol] === body.target_user_id) {
      sheet.getRange(r + 1, passCol + 1).setValue(hashPassword(body.new_password));
      logProfileHistory(body.target_user_id, 'password', '***', '***', body.user_id);
      return { status: 'success', message: 'เปลี่ยนรหัสผ่านเรียบร้อย' };
    }
  }
  return { status: 'error', message: 'ไม่พบผู้ใช้' };
}

// ============================================
// ADMIN — CONTENT MANAGEMENT
// ============================================

function handleAdminAddSubject(body) { requireAdmin(body); var sheet = getSheet('Subjects'); var id = generateId('SUB'); sheet.appendRow([id, body.subject_name||'', body.icon||'📚', body.color||'#3b82f6', body.description||'', Number(body.pass_threshold)||50, Number(body.order_index)||0]); return { status: 'success', subject_id: id }; }
function handleAdminAddLesson(body) { requireAdmin(body); var sheet = getSheet('Lessons'); var id = generateId('L'); sheet.appendRow([id, body.subject_id||'', body.title||'', body.description||'', body.file_url||'', body.file_type||'pdf', body.chapter||'', Number(body.order_index)||0, new Date().toISOString()]); return { status: 'success', lesson_id: id }; }
function handleAdminAddAssignment(body) { requireAdmin(body); var sheet = getSheet('Assignments'); var id = generateId('A'); sheet.appendRow([id, body.subject_id||'', body.title||'', body.type||'quiz', Number(body.max_score)||0, body.due_date||'', body.description||'', Number(body.pass_threshold)||50, new Date().toISOString()]); return { status: 'success', assignment_id: id }; }
function handleAdminAddQuestion(body) { requireAdmin(body); var sheet = getSheet('Questions'); var id = generateId('Q'); var qType = body.question_type||'mcq'; sheet.appendRow([id, body.assignment_id||'', body.question_text||'', qType, qType==='mcq'?body.choice_a:'', qType==='mcq'?body.choice_b:'', qType==='mcq'?body.choice_c:'', qType==='mcq'?body.choice_d:'', qType==='mcq'?(body.correct_answer||'A').toUpperCase():'', body.image_url||'', Number(body.max_points)||1, Number(body.order_index)||0]); return { status: 'success', question_id: id }; }
function handleAdminUpdateItem(body) { requireAdmin(body); var sheet = getSheet(body.sheet_name); if(!sheet) return {status:'error'}; var data=sheet.getDataRange().getValues(); var headers=data[0]; var idCol=headers.indexOf(body.id_field); for(var r=1;r<data.length;r++){ if(data[r][idCol]===body.id_value){ for(var key in body.updates){ var col=headers.indexOf(key); if(col!==-1) sheet.getRange(r+1,col+1).setValue(body.updates[key]); } return {status:'success'}; } } return {status:'error'}; }
function handleAdminDeleteItem(body) { requireAdmin(body); var sheet = getSheet(body.sheet_name); if(!sheet) return {status:'error'}; var data=sheet.getDataRange().getValues(); var idCol=data[0].indexOf(body.id_field); for(var r=data.length-1;r>=1;r--){ if(data[r][idCol]===body.id_value){ sheet.deleteRow(r+1); return {status:'success'}; } } return {status:'error'}; }


// ============================================
// ADMIN — GRADING & SCORE ADJUSTMENT Phase 2
// ============================================

function handleAdminGetAllScores(body) {
  requireAdmin(body);
  var scores = sheetToObjects('Scores');
  var users = sheetToObjects('Users');
  var assignments = sheetToObjects('Assignments');
  var subjects = sheetToObjects('Subjects');
  var history = sheetToObjects('Score_History');

  var enriched = scores.map(function(s) {
    var user = users.filter(function(u) { return u.user_id === s.user_id; })[0];
    var assignment = assignments.filter(function(a) { return a.assignment_id === s.assignment_id; })[0];
    var subject = assignment ? subjects.filter(function(sub) { return sub.subject_id === assignment.subject_id; })[0] : null;
    var pct = s.max_score > 0 ? Math.round((s.score / s.max_score) * 100) : 0;
    var threshold = assignment ? (Number(assignment.pass_threshold) || 50) : 50;

    var isPassed = pct >= threshold;
    if (s.is_passed_override && s.is_passed_override !== '') isPassed = s.is_passed_override.toString() === 'true';

    return {
      score_id: s.score_id,
      user_name: user ? (user.first_name + ' ' + user.last_name) : 'Unknown',
      student_id: user ? user.student_id : '',
      user_id: s.user_id,
      assignment_title: assignment ? assignment.title : 'Unknown',
      assignment_id: s.assignment_id,
      subject_name: subject ? subject.subject_name : '',
      score: s.score,
      max_score: s.max_score,
      percentage: pct,
      passed: isPassed,
      is_passed_override: s.is_passed_override !== '' ? s.is_passed_override : null,
      is_adjusted: history.filter(function(h) { return h.score_id === s.score_id; }).length > 0,
      grading_status: s.grading_status || 'auto_graded',
      submitted_at: s.submitted_at
    };
  });
  return { status: 'success', scores: enriched };
}

function handleAdminGetSubmissions(body) {
  var allObj = handleAdminGetAllScores(body);
  if (allObj.status !== 'success') return allObj;
  
  var filterStatus = body.filter_status || 'all';
  var filtered = allObj.scores;
  if(filterStatus !== 'all') filtered = filtered.filter(function(s) { return s.grading_status === filterStatus; });
  
  // Attach questions and answers for grading view
  var questions = sheetToObjects('Questions');
  var rawScores = sheetToObjects('Scores');
  
  for (var i = 0; i < filtered.length; i++) {
    var raw = rawScores.filter(function(r) { return r.score_id === filtered[i].score_id; })[0];
    var assignQuestions = questions.filter(function(q) { return q.assignment_id === filtered[i].assignment_id; });
    var answersObj = {}, feedbackObj = {};
    if(raw.answers_json) { try { answersObj = JSON.parse(raw.answers_json); } catch(e){} }
    if(raw.feedback_json) { try { feedbackObj = JSON.parse(raw.feedback_json); } catch(e){} }
    
    filtered[i].questions = assignQuestions.map(function(q) {
      return {
        question_id: q.question_id, question_text: q.question_text, question_type: q.question_type || 'mcq',
        image_url: q.image_url || '', max_points: Number(q.max_points)||1,
        correct_answer: (q.question_type||'mcq') === 'mcq' ? q.correct_answer : null,
        user_answer: answersObj[q.question_id] || '', feedback: feedbackObj[q.question_id] || null
      };
    });
  }
  
  return { status: 'success', submissions: filtered };
}

function handleAdminGradeSubmission(body) {
  requireAdmin(body);
  var scoreId = body.score_id, grades = body.grades;
  if (!scoreId || !grades) return { status: 'error' };

  var scoresSheet = getSheet('Scores');
  var data = scoresSheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf('score_id');

  for (var r = 1; r < data.length; r++) {
    if (data[r][idCol] === scoreId) {
      var assignmentId = data[r][headers.indexOf('assignment_id')];
      var questions = sheetToObjects('Questions');
      var assignQuestions = questions.filter(function(q) { return q.assignment_id === assignmentId; });
      var answersObj = {};
      try { answersObj = JSON.parse(data[r][headers.indexOf('answers_json')]); } catch(e) {}

      var totalScore = 0, totalMaxPts = 0, feedbackObj = {};
      
      for (var i = 0; i < assignQuestions.length; i++) {
        var q = assignQuestions[i], qType = q.question_type || 'mcq', maxPts = Number(q.max_points) || 1;
        totalMaxPts += maxPts;

        if (grades[q.question_id] !== undefined) {
          var pts = Math.max(0, Math.min(Number(grades[q.question_id].points)||0, maxPts));
          totalScore += pts;
          feedbackObj[q.question_id] = { points: pts, max_points: maxPts, feedback: grades[q.question_id].feedback || '' };
        } else if (qType === 'mcq') {
          var isCorrect = (answersObj[q.question_id] || '').toString().toUpperCase() === (q.correct_answer || '').toUpperCase();
          totalScore += isCorrect ? maxPts : 0;
          feedbackObj[q.question_id] = { points: isCorrect ? maxPts : 0, max_points: maxPts, feedback: '' };
        }
      }

      scoresSheet.getRange(r + 1, headers.indexOf('score') + 1).setValue(totalScore);
      scoresSheet.getRange(r + 1, headers.indexOf('max_score') + 1).setValue(totalMaxPts);
      scoresSheet.getRange(r + 1, headers.indexOf('grading_status') + 1).setValue('graded');
      scoresSheet.getRange(r + 1, headers.indexOf('feedback_json') + 1).setValue(JSON.stringify(feedbackObj));
      scoresSheet.getRange(r + 1, headers.indexOf('graded_by') + 1).setValue(body.user_id);
      scoresSheet.getRange(r + 1, headers.indexOf('graded_at') + 1).setValue(new Date().toISOString());

      return { status: 'success', score: totalScore, max_score: totalMaxPts };
    }
  }
  return { status: 'error' };
}

function handleAdminAdjustScore(body) {
  requireAdmin(body);
  var scoreId = body.score_id, newScore = body.new_score, reason = body.reason, isPassedOverride = body.is_passed_override;
  if (!scoreId || newScore === undefined || !reason) return { status: 'error', message: 'Missing score_id, new_score, or reason' };

  var scoresSheet = getSheet('Scores');
  var data = scoresSheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf('score_id');

  for (var r = 1; r < data.length; r++) {
    if (data[r][idCol] === scoreId) {
      var oldScore = data[r][headers.indexOf('score')];
      var userId = data[r][headers.indexOf('user_id')];
      var assignmentId = data[r][headers.indexOf('assignment_id')];

      scoresSheet.getRange(r + 1, headers.indexOf('score') + 1).setValue(newScore);
      
      // Handle override toggle. If it's an empty string, we set it back to empty (auto pass/fail). 
      // If it's pure boolean or string boolean, set it.
      if (isPassedOverride !== undefined) {
        scoresSheet.getRange(r + 1, headers.indexOf('is_passed_override') + 1).setValue(isPassedOverride);
      }

      var historySheet = getSheet('Score_History');
      if (historySheet) {
        historySheet.appendRow([generateId('SH'), scoreId, userId, assignmentId, oldScore, newScore, reason, body.user_id, new Date().toISOString()]);
      }

      logToSheet(body.user_id, 'adjust_score', 'ปรับแก้คะแนนย้อนหลัง ' + scoreId);
      return { status: 'success', message: 'ปรับแก้คะแนนและบันทึกประวัติเรียบร้อย' };
    }
  }
  return { status: 'error', message: 'ไม่พบข้อมูลคะแนน' };
}

// ============================================
// ADMIN — ANALYTICS Phase 2
// ============================================

function handleAdminGetStudentDetail(body) {
  requireAuth(body);
  var targetUserId = body.target_user_id;

  var users = sheetToObjects('Users');
  var user = users.filter(function(u) { return u.user_id === targetUserId; })[0];
  if (!user) return { status: 'error', message: 'ไม่พบนักเรียน' };

  var adminBody = { user_id: body.user_id, role: 'admin' };
  var allScoresResult = handleAdminGetAllScores(adminBody);
  var userScores = [];
  if (allScoresResult.status === 'success') {
    userScores = allScoresResult.scores.filter(function(s) { return s.user_id === targetUserId; });
  }

  var progress = sheetToObjects('Progress');
  var lessons = sheetToObjects('Lessons');
  var assignments = sheetToObjects('Assignments');
  var logs = sheetToObjects('Logs');

  var userProgress = progress.filter(function(p) { return p.user_id === targetUserId; });
  var userLogs = logs.filter(function(l) { return l.user_id === targetUserId; });

  var totalScore = 0, totalMax = 0;
  for (var i = 0; i < userScores.length; i++) {
    totalScore += Number(userScores[i].score) || 0;
    totalMax += Number(userScores[i].max_score) || 0;
  }

  userLogs.sort(function(a, b) { return (b.timestamp || '').localeCompare(a.timestamp || ''); });
  
  // Calculate avg percentage properly
  var avgPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  var statsObj = {
    total_score: totalScore, total_max_score: totalMax, avg_percent: avgPct,
    grade: calculateGrade(avgPct),
    completed_lessons: userProgress.filter(function(p) { return p.status === 'completed'; }).length,
    total_lessons: lessons.length,
    completed_assignments: userScores.length,
    total_assignments: assignments.length
  };

  if (body.role === 'admin') {
    return {
      status: 'success',
      student: {
        user_id: user.user_id, student_id: user.student_id, username: user.username,
        name: (user.first_name || '') + ' ' + (user.last_name || ''),
        avatar_color: user.avatar_color, email: user.email || '', status: user.status || 'active'
      },
      stats: statsObj,
      scores: userScores,
      activity: userLogs.slice(0, 20)
    };
  } else {
    // Send back to dashboard
    var subjects = sheetToObjects('Subjects');
    var subjectResults = [];
    for (var s = 0; s < subjects.length; s++) {
      var sid = subjects[s].subject_id;
      var subAssignments = assignments.filter(function(a) { return a.subject_id === sid; });
      var subScores = userScores.filter(function(sc) { return sc.subject_id === sid || subAssignments.some(function(a) { return a.assignment_id === sc.assignment_id; }); });
      var subTotal = 0, subMax = 0;
      for (var j = 0; j < subScores.length; j++) { subTotal += Number(subScores[j].score)||0; subMax += Number(subScores[j].max_score)||0; }
      var subPct = subMax > 0 ? Math.round((subTotal / subMax) * 100) : 0;
      var passThreshold = Number(subjects[s].pass_threshold) || 50;

      subjectResults.push({
        subject_id: sid, subject_name: subjects[s].subject_name, icon: subjects[s].icon, color: subjects[s].color,
        score: subTotal, max_score: subMax, percentage: subPct, passed: subPct >= passThreshold,
        lesson_count: lessons.filter(function(l) { return l.subject_id === sid; }).length,
        assignment_count: subAssignments.length
      });
    }

    return {
      status: 'success',
      stats: {
        total_subjects: subjects.length, total_lessons: lessons.length, completed_lessons: statsObj.completed_lessons,
        total_assignments: assignments.length, completed_assignments: statsObj.completed_assignments,
        pending_grading: userScores.filter(function(x){return x.grading_status==='pending';}).length,
        total_score: totalScore, total_max_score: totalMax, avg_percent: avgPct, grade: calculateGrade(avgPct)
      },
      subjects: subjectResults
    };
  }
}

function handleAdminGetDashboard(body) {
  requireAdmin(body);
  var users = sheetToObjects('Users');
  var subjects = sheetToObjects('Subjects');
  var lessons = sheetToObjects('Lessons');
  var assignments = sheetToObjects('Assignments');
  var scores = sheetToObjects('Scores');
  var logs = sheetToObjects('Logs');

  var students = users.filter(function(u) { return u.role === 'student' && (u.status || 'active') === 'active'; });
  var pendingGrading = scores.filter(function(s) { return (s.grading_status || '') === 'pending'; });

  var studentSummary = students.map(function(stu) {
    var stuScores = scores.filter(function(s) { return s.user_id === stu.user_id; });
    var total = 0, max = 0;
    for (var i = 0; i < stuScores.length; i++) { total += Number(stuScores[i].score)||0; max += Number(stuScores[i].max_score)||0; }
    var pct = max > 0 ? Math.round((total / max) * 100) : 0;
    return {
      user_id: stu.user_id, student_id: stu.student_id, name: (stu.first_name || '') + ' ' + (stu.last_name || ''),
      avatar_color: stu.avatar_color, avg_percent: pct, grade: calculateGrade(pct),
      assignments_done: stuScores.length, total_assignments: assignments.length
    };
  });

  logs.sort(function(a, b) { return (b.timestamp || '').localeCompare(a.timestamp || ''); });
  var recentLogs = logs.slice(0, 20).map(function(l) {
    var user = users.filter(function(u) { return u.user_id === l.user_id; })[0];
    return { user_name: user ? (user.first_name + ' ' + user.last_name) : 'Unknown', action_type: l.action_type, detail: l.detail, timestamp: l.timestamp };
  });

  return {
    status: 'success',
    stats: { total_students: students.length, total_subjects: subjects.length, total_lessons: lessons.length, total_assignments: assignments.length, pending_grading: pendingGrading.length, total_submissions: scores.length },
    students: studentSummary, recent_activity: recentLogs
  };
}
