// ============================================
// PBTstudents LMS — Backend API (Google Apps Script)
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
      case 'getAssignments':     result = handleGetAssignments(body); break;
      case 'getQuestions':       result = handleGetQuestions(body); break;
      case 'submitQuiz':         result = handleSubmitQuiz(body); break;
      case 'getScores':          result = handleGetScores(body); break;
      case 'getDashboard':       result = handleGetDashboard(body); break;
      case 'getProgress':        result = handleGetProgress(body); break;
      case 'markLessonComplete': result = handleMarkLessonComplete(body); break;
      case 'logAction':          result = handleLogAction(body); break;
      case 'getStudentReport':   result = handleGetStudentReport(body); break;

      // ── Admin Actions ──
      case 'adminGetUsers':        result = handleAdminGetUsers(body); break;
      case 'adminAddUser':         result = handleAdminAddUser(body); break;
      case 'adminUpdateUser':      result = handleAdminUpdateUser(body); break;
      case 'adminDeleteUser':      result = handleAdminDeleteUser(body); break;
      case 'adminChangePassword':  result = handleAdminChangePassword(body); break;
      case 'adminAddSubject':      result = handleAdminAddSubject(body); break;
      case 'adminAddLesson':       result = handleAdminAddLesson(body); break;
      case 'adminAddAssignment':   result = handleAdminAddAssignment(body); break;
      case 'adminAddQuestion':     result = handleAdminAddQuestion(body); break;
      case 'adminGetAllScores':    result = handleAdminGetAllScores(body); break;
      case 'adminUpdateItem':      result = handleAdminUpdateItem(body); break;
      case 'adminDeleteItem':      result = handleAdminDeleteItem(body); break;
      case 'adminGetSubmissions':  result = handleAdminGetSubmissions(body); break;
      case 'adminGradeSubmission': result = handleAdminGradeSubmission(body); break;
      case 'adminGetStudentDetail': result = handleAdminGetStudentDetail(body); break;
      case 'adminGetDashboard':    result = handleAdminGetDashboard(body); break;

      default:
        result = { status: 'error', message: 'Unknown action: ' + action };
    }

    return jsonResponse(result);

  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

// ── Also handle GET for health check ──
function doGet(e) {
  return jsonResponse({ status: 'ok', message: 'PBTstudents LMS API is running' });
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
      sheet.appendRow([
        generateId('LOG'), userId, actionType, detail, new Date().toISOString()
      ]);
    }
  } catch (e) { /* Silently fail */ }
}


// ============================================
// AUTH
// ============================================

function handleLogin(body) {
  var username = (body.username || '').trim();
  var password = (body.password || '').trim();

  if (!username || !password) {
    return { status: 'error', message: 'กรุณากรอก username และ password' };
  }

  var users = sheetToObjects('Users');
  var hashed = hashPassword(password);

  for (var i = 0; i < users.length; i++) {
    if (users[i].username === username && users[i].password_hash === hashed) {
      if (users[i].status === 'inactive') {
        return { status: 'error', message: 'บัญชีถูกระงับ กรุณาติดต่อครูผู้สอน' };
      }
      logToSheet(users[i].user_id, 'login', 'เข้าสู่ระบบ');
      return {
        status: 'success',
        user: {
          user_id: users[i].user_id,
          username: users[i].username,
          name: users[i].name,
          role: users[i].role,
          avatar_color: users[i].avatar_color
        }
      };
    }
  }

  return { status: 'error', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
}


// ============================================
// SUBJECTS
// ============================================

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


// ============================================
// LESSONS
// ============================================

function handleGetLessons(body) {
  requireAuth(body);
  var subjectId = body.subject_id;
  if (!subjectId) return { status: 'error', message: 'Missing subject_id' };

  var lessons = sheetToObjects('Lessons');
  var filtered = lessons.filter(function(l) { return l.subject_id === subjectId; });
  filtered.sort(function(a, b) { return (a.order_index || 0) - (b.order_index || 0); });

  var progress = sheetToObjects('Progress');
  for (var i = 0; i < filtered.length; i++) {
    var prog = progress.filter(function(p) {
      return p.user_id === body.user_id && p.lesson_id === filtered[i].lesson_id;
    });
    filtered[i].completed = prog.length > 0 && prog[0].status === 'completed';
  }

  return { status: 'success', lessons: filtered };
}


// ============================================
// ASSIGNMENTS
// ============================================

function handleGetAssignments(body) {
  requireAuth(body);
  var subjectId = body.subject_id;
  if (!subjectId) return { status: 'error', message: 'Missing subject_id' };

  var assignments = sheetToObjects('Assignments');
  var filtered = assignments.filter(function(a) { return a.subject_id === subjectId; });

  var scores = sheetToObjects('Scores');
  for (var i = 0; i < filtered.length; i++) {
    var userScore = scores.filter(function(s) {
      return s.user_id === body.user_id && s.assignment_id === filtered[i].assignment_id;
    });
    if (userScore.length > 0) {
      filtered[i].user_score = userScore[0].score;
      filtered[i].submitted = true;
      filtered[i].grading_status = userScore[0].grading_status || 'auto_graded';
    } else {
      filtered[i].user_score = null;
      filtered[i].submitted = false;
      filtered[i].grading_status = null;
    }
  }

  return { status: 'success', assignments: filtered };
}


// ============================================
// QUESTIONS (enhanced — supports mcq/essay/upload + images)
// ============================================

function handleGetQuestions(body) {
  requireAuth(body);
  var assignmentId = body.assignment_id;
  if (!assignmentId) return { status: 'error', message: 'Missing assignment_id' };

  var questions = sheetToObjects('Questions');
  var filtered = questions.filter(function(q) { return q.assignment_id === assignmentId; });
  filtered.sort(function(a, b) { return (a.order_index || 0) - (b.order_index || 0); });

  // Safe questions — don't send correct_answer for MCQ
  var safeQuestions = filtered.map(function(q) {
    var item = {
      question_id: q.question_id,
      assignment_id: q.assignment_id,
      question_text: q.question_text,
      question_type: q.question_type || 'mcq',
      image_url: q.image_url || '',
      max_points: Number(q.max_points) || 1
    };
    // Only include choices for MCQ
    if ((q.question_type || 'mcq') === 'mcq') {
      item.choice_a = q.choice_a;
      item.choice_b = q.choice_b;
      item.choice_c = q.choice_c;
      item.choice_d = q.choice_d;
    }
    return item;
  });

  // Get assignment info
  var assignments = sheetToObjects('Assignments');
  var assignment = null;
  for (var i = 0; i < assignments.length; i++) {
    if (assignments[i].assignment_id === assignmentId) {
      assignment = assignments[i];
      break;
    }
  }

  // Check if already submitted
  var scores = sheetToObjects('Scores');
  var existing = scores.filter(function(s) {
    return s.user_id === body.user_id && s.assignment_id === assignmentId;
  });

  // If graded, send feedback
  var feedback = null;
  if (existing.length > 0 && existing[0].feedback_json) {
    try { feedback = JSON.parse(existing[0].feedback_json); } catch(e) {}
  }

  return {
    status: 'success',
    assignment: assignment,
    questions: safeQuestions,
    already_submitted: existing.length > 0,
    previous_score: existing.length > 0 ? existing[0].score : null,
    grading_status: existing.length > 0 ? (existing[0].grading_status || 'auto_graded') : null,
    feedback: feedback
  };
}


// ============================================
// SUBMIT QUIZ (enhanced — supports essay/upload)
// ============================================

function handleSubmitQuiz(body) {
  requireAuth(body);
  var assignmentId = body.assignment_id;
  var answers = body.answers; // { Q001: 'A', Q002: 'text answer', Q003: 'https://drive.google.com/...' }

  if (!assignmentId || !answers) {
    return { status: 'error', message: 'Missing assignment_id or answers' };
  }

  var questions = sheetToObjects('Questions');
  var filtered = questions.filter(function(q) { return q.assignment_id === assignmentId; });
  filtered.sort(function(a, b) { return (a.order_index || 0) - (b.order_index || 0); });

  if (filtered.length === 0) {
    return { status: 'error', message: 'ไม่พบคำถามสำหรับข้อสอบนี้' };
  }

  // Grade MCQ automatically, mark essay/upload as pending
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
      results.push({
        question_id: q.question_id,
        question_type: 'mcq',
        user_answer: userAnswer,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        points: isCorrect ? maxPts : 0,
        max_points: maxPts
      });
    } else {
      hasManualQuestions = true;
      results.push({
        question_id: q.question_id,
        question_type: qType,
        user_answer: userAnswer,
        points: 0,
        max_points: maxPts,
        grading_status: 'pending'
      });
    }
  }

  var gradingStatus = hasManualQuestions ? 'pending' : 'auto_graded';
  var finalScore = autoScore; // For pending, only MCQ score counted initially

  // Check if already submitted — update instead of insert
  var scoresSheet = getSheet('Scores');
  var scoresData = scoresSheet.getDataRange().getValues();
  var updated = false;

  for (var r = 1; r < scoresData.length; r++) {
    if (scoresData[r][1] === body.user_id && scoresData[r][2] === assignmentId) {
      // Update existing row
      scoresSheet.getRange(r + 1, 4).setValue(finalScore);         // score
      scoresSheet.getRange(r + 1, 5).setValue(totalMaxPoints);     // max_score
      scoresSheet.getRange(r + 1, 6).setValue(JSON.stringify(answers)); // answers_json
      scoresSheet.getRange(r + 1, 7).setValue(gradingStatus);      // grading_status
      scoresSheet.getRange(r + 1, 8).setValue('');                  // feedback_json (reset)
      scoresSheet.getRange(r + 1, 9).setValue('');                  // graded_by
      scoresSheet.getRange(r + 1, 10).setValue('');                 // graded_at
      scoresSheet.getRange(r + 1, 11).setValue(new Date().toISOString()); // submitted_at
      updated = true;
      break;
    }
  }

  if (!updated) {
    scoresSheet.appendRow([
      generateId('SC'),
      body.user_id,
      assignmentId,
      finalScore,
      totalMaxPoints,
      JSON.stringify(answers),
      gradingStatus,
      '', // feedback_json
      '', // graded_by
      '', // graded_at
      new Date().toISOString()
    ]);
  }

  logToSheet(body.user_id, 'submit_quiz', 'ทำข้อสอบ ' + assignmentId + ' ได้ ' + finalScore + '/' + totalMaxPoints);

  return {
    status: 'success',
    score: finalScore,
    max_score: totalMaxPoints,
    percentage: totalMaxPoints > 0 ? Math.round((finalScore / totalMaxPoints) * 100) : 0,
    grading_status: gradingStatus,
    results: results
  };
}


// ============================================
// SCORES (enhanced — includes grading status)
// ============================================

function handleGetScores(body) {
  requireAuth(body);
  var scores = sheetToObjects('Scores');
  var userScores = scores.filter(function(s) { return s.user_id === body.user_id; });

  var assignments = sheetToObjects('Assignments');
  var subjects = sheetToObjects('Subjects');

  for (var i = 0; i < userScores.length; i++) {
    var assignment = assignments.filter(function(a) {
      return a.assignment_id === userScores[i].assignment_id;
    })[0];

    if (assignment) {
      userScores[i].assignment_title = assignment.title;
      userScores[i].subject_id = assignment.subject_id;
      userScores[i].pass_threshold = Number(assignment.pass_threshold) || 50;
      var subject = subjects.filter(function(s) { return s.subject_id === assignment.subject_id; })[0];
      userScores[i].subject_name = subject ? subject.subject_name : '';
    }

    // Parse feedback
    if (userScores[i].feedback_json) {
      try { userScores[i].feedback = JSON.parse(userScores[i].feedback_json); } catch(e) {}
    }

    // Calculate pass/fail
    var pct = userScores[i].max_score > 0
      ? Math.round((userScores[i].score / userScores[i].max_score) * 100) : 0;
    var threshold = userScores[i].pass_threshold || 50;
    userScores[i].passed = pct >= threshold;
    userScores[i].grading_status = userScores[i].grading_status || 'auto_graded';
  }

  return { status: 'success', scores: userScores };
}


// ============================================
// DASHBOARD (enhanced)
// ============================================

function handleGetDashboard(body) {
  requireAuth(body);

  var subjects = sheetToObjects('Subjects');
  var lessons = sheetToObjects('Lessons');
  var assignments = sheetToObjects('Assignments');
  var scores = sheetToObjects('Scores');
  var progress = sheetToObjects('Progress');

  var userScores = scores.filter(function(s) { return s.user_id === body.user_id; });
  var userProgress = progress.filter(function(p) { return p.user_id === body.user_id; });

  var totalScore = 0;
  var totalMaxScore = 0;
  var pendingCount = 0;
  for (var i = 0; i < userScores.length; i++) {
    totalScore += Number(userScores[i].score) || 0;
    totalMaxScore += Number(userScores[i].max_score) || 0;
    if ((userScores[i].grading_status || '') === 'pending') pendingCount++;
  }

  var avgPercent = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
  var completedLessons = userProgress.filter(function(p) { return p.status === 'completed'; }).length;
  var grade = calculateGrade(avgPercent);

  // Per-subject pass/fail
  var subjectResults = [];
  for (var s = 0; s < subjects.length; s++) {
    var sid = subjects[s].subject_id;
    var subAssignments = assignments.filter(function(a) { return a.subject_id === sid; });
    var subScores = userScores.filter(function(sc) {
      return subAssignments.some(function(a) { return a.assignment_id === sc.assignment_id; });
    });
    var subTotal = 0, subMax = 0;
    for (var j = 0; j < subScores.length; j++) {
      subTotal += Number(subScores[j].score) || 0;
      subMax += Number(subScores[j].max_score) || 0;
    }
    var subPct = subMax > 0 ? Math.round((subTotal / subMax) * 100) : 0;
    subjectResults.push({
      subject_id: sid,
      subject_name: subjects[s].subject_name,
      icon: subjects[s].icon,
      color: subjects[s].color,
      score: subTotal,
      max_score: subMax,
      percentage: subPct,
      passed: subPct >= 50,
      lesson_count: lessons.filter(function(l) { return l.subject_id === sid; }).length,
      assignment_count: subAssignments.length
    });
  }

  return {
    status: 'success',
    stats: {
      total_subjects: subjects.length,
      total_lessons: lessons.length,
      completed_lessons: completedLessons,
      total_assignments: assignments.length,
      completed_assignments: userScores.length,
      pending_grading: pendingCount,
      total_score: totalScore,
      total_max_score: totalMaxScore,
      avg_percent: avgPercent,
      grade: grade
    },
    subjects: subjectResults
  };
}


// ============================================
// STUDENT REPORT (detailed per-student view)
// ============================================

function handleGetStudentReport(body) {
  requireAuth(body);
  var scores = sheetToObjects('Scores');
  var assignments = sheetToObjects('Assignments');
  var subjects = sheetToObjects('Subjects');

  var userScores = scores.filter(function(s) { return s.user_id === body.user_id; });

  var report = [];
  for (var i = 0; i < userScores.length; i++) {
    var sc = userScores[i];
    var assignment = assignments.filter(function(a) { return a.assignment_id === sc.assignment_id; })[0];
    var subject = assignment ? subjects.filter(function(s) { return s.subject_id === assignment.subject_id; })[0] : null;

    var pct = sc.max_score > 0 ? Math.round((sc.score / sc.max_score) * 100) : 0;
    var threshold = assignment ? (Number(assignment.pass_threshold) || 50) : 50;

    var feedback = null;
    if (sc.feedback_json) {
      try { feedback = JSON.parse(sc.feedback_json); } catch(e) {}
    }

    report.push({
      assignment_id: sc.assignment_id,
      assignment_title: assignment ? assignment.title : 'Unknown',
      subject_name: subject ? subject.subject_name : '',
      score: sc.score,
      max_score: sc.max_score,
      percentage: pct,
      grade: calculateGrade(pct),
      passed: pct >= threshold,
      grading_status: sc.grading_status || 'auto_graded',
      feedback: feedback,
      submitted_at: sc.submitted_at
    });
  }

  return { status: 'success', report: report };
}


// ============================================
// PROGRESS
// ============================================

function handleGetProgress(body) {
  requireAuth(body);
  var progress = sheetToObjects('Progress');
  var userProgress = progress.filter(function(p) { return p.user_id === body.user_id; });
  return { status: 'success', progress: userProgress };
}

function handleMarkLessonComplete(body) {
  requireAuth(body);
  var lessonId = body.lesson_id;
  if (!lessonId) return { status: 'error', message: 'Missing lesson_id' };

  var sheet = getSheet('Progress');
  var data = sheet.getDataRange().getValues();
  var found = false;

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === body.user_id && data[i][1] === lessonId) {
      sheet.getRange(i + 1, 3).setValue('completed');
      sheet.getRange(i + 1, 4).setValue(new Date().toISOString());
      found = true;
      break;
    }
  }

  if (!found) {
    sheet.appendRow([body.user_id, lessonId, 'completed', new Date().toISOString()]);
  }

  logToSheet(body.user_id, 'lesson_complete', 'เรียนจบ lesson: ' + lessonId);
  return { status: 'success', message: 'บันทึกความก้าวหน้าเรียบร้อย' };
}


// ============================================
// LOGGING
// ============================================

function handleLogAction(body) {
  requireAuth(body);
  logToSheet(body.user_id, body.action_type || 'unknown', body.detail || '');
  return { status: 'success' };
}


// ============================================
// ADMIN — USER MANAGEMENT
// ============================================

function handleAdminGetUsers(body) {
  requireAdmin(body);
  var users = sheetToObjects('Users');
  return {
    status: 'success',
    users: users.map(function(u) {
      return {
        user_id: u.user_id,
        username: u.username,
        name: u.name,
        role: u.role,
        avatar_color: u.avatar_color,
        email: u.email || '',
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
  var name = (body.name || '').trim();

  if (!username || !password || !name) {
    return { status: 'error', message: 'กรุณากรอก username, password และชื่อ' };
  }

  if (password.length < 4) {
    return { status: 'error', message: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' };
  }

  // Check duplicate username
  var users = sheetToObjects('Users');
  for (var i = 0; i < users.length; i++) {
    if (users[i].username === username) {
      return { status: 'error', message: 'Username "' + username + '" ถูกใช้แล้ว' };
    }
  }

  var sheet = getSheet('Users');
  var id = generateId('U');
  sheet.appendRow([
    id, username, hashPassword(password), name,
    body.role || 'student',
    body.avatar_color || '#10b981',
    body.email || '',
    'active',
    new Date().toISOString()
  ]);

  logToSheet(body.user_id, 'admin_add_user', 'เพิ่มนักเรียน: ' + name);
  return { status: 'success', user_id: id, message: 'เพิ่มนักเรียนเรียบร้อย' };
}

function handleAdminUpdateUser(body) {
  requireAdmin(body);
  var targetUserId = (body.target_user_id || '').trim();
  if (!targetUserId) return { status: 'error', message: 'Missing target_user_id' };

  var sheet = getSheet('Users');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf('user_id');

  for (var r = 1; r < data.length; r++) {
    if (data[r][idCol] === targetUserId) {
      // Update allowed fields
      var updates = body.updates || {};
      for (var key in updates) {
        var col = headers.indexOf(key);
        if (col !== -1 && key !== 'user_id' && key !== 'password_hash') {
          sheet.getRange(r + 1, col + 1).setValue(updates[key]);
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
  var targetUserId = (body.target_user_id || '').trim();
  if (!targetUserId) return { status: 'error', message: 'Missing target_user_id' };

  // Prevent admin from deleting themselves
  if (targetUserId === body.user_id) {
    return { status: 'error', message: 'ไม่สามารถลบบัญชีตัวเองได้' };
  }

  var sheet = getSheet('Users');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf('user_id');

  for (var r = data.length - 1; r >= 1; r--) {
    if (data[r][idCol] === targetUserId) {
      sheet.deleteRow(r + 1);
      logToSheet(body.user_id, 'admin_delete_user', 'ลบ user: ' + targetUserId);
      return { status: 'success', message: 'ลบผู้ใช้เรียบร้อย' };
    }
  }

  return { status: 'error', message: 'ไม่พบผู้ใช้' };
}

function handleAdminChangePassword(body) {
  requireAdmin(body);
  var targetUserId = (body.target_user_id || '').trim();
  var newPassword = (body.new_password || '').trim();

  if (!targetUserId || !newPassword) {
    return { status: 'error', message: 'กรุณาระบุ user_id และรหัสผ่านใหม่' };
  }

  if (newPassword.length < 4) {
    return { status: 'error', message: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' };
  }

  var sheet = getSheet('Users');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf('user_id');
  var passCol = headers.indexOf('password_hash');

  var newHash = hashPassword(newPassword);

  for (var r = 1; r < data.length; r++) {
    if (data[r][idCol] === targetUserId) {
      sheet.getRange(r + 1, passCol + 1).setValue(newHash);
      logToSheet(body.user_id, 'change_password', 'เปลี่ยนรหัสผ่านของ user: ' + targetUserId);
      return { status: 'success', message: 'เปลี่ยนรหัสผ่านเรียบร้อย' };
    }
  }

  return { status: 'error', message: 'ไม่พบผู้ใช้' };
}


// ============================================
// ADMIN — CONTENT MANAGEMENT
// ============================================

function handleAdminAddSubject(body) {
  requireAdmin(body);
  var sheet = getSheet('Subjects');
  var id = generateId('SUB');
  sheet.appendRow([
    id,
    body.subject_name || '',
    body.icon || '📚',
    body.color || '#3b82f6',
    body.description || '',
    Number(body.order_index) || 0
  ]);
  return { status: 'success', subject_id: id, message: 'เพิ่มวิชาเรียบร้อย' };
}

function handleAdminAddLesson(body) {
  requireAdmin(body);
  var sheet = getSheet('Lessons');
  var id = generateId('L');
  sheet.appendRow([
    id,
    body.subject_id || '',
    body.title || '',
    body.description || '',
    body.file_url || '',
    body.file_type || 'pdf',
    body.chapter || '',
    Number(body.order_index) || 0,
    new Date().toISOString()
  ]);
  return { status: 'success', lesson_id: id, message: 'เพิ่มบทเรียนเรียบร้อย' };
}

function handleAdminAddAssignment(body) {
  requireAdmin(body);
  var sheet = getSheet('Assignments');
  var id = generateId('A');
  sheet.appendRow([
    id,
    body.subject_id || '',
    body.title || '',
    body.type || 'quiz',
    Number(body.max_score) || 0,
    body.due_date || '',
    body.description || '',
    Number(body.pass_threshold) || 50,
    new Date().toISOString()
  ]);
  return { status: 'success', assignment_id: id, message: 'เพิ่มข้อสอบ/งานเรียบร้อย' };
}

function handleAdminAddQuestion(body) {
  requireAdmin(body);
  var sheet = getSheet('Questions');
  var id = generateId('Q');
  var qType = body.question_type || 'mcq';

  sheet.appendRow([
    id,
    body.assignment_id || '',
    body.question_text || '',
    qType,
    qType === 'mcq' ? (body.choice_a || '') : '',
    qType === 'mcq' ? (body.choice_b || '') : '',
    qType === 'mcq' ? (body.choice_c || '') : '',
    qType === 'mcq' ? (body.choice_d || '') : '',
    qType === 'mcq' ? ((body.correct_answer || 'A').toUpperCase()) : '',
    body.image_url || '',
    Number(body.max_points) || 1,
    Number(body.order_index) || 0
  ]);
  return { status: 'success', question_id: id, message: 'เพิ่มคำถามเรียบร้อย' };
}


// ============================================
// ADMIN — GRADING SYSTEM
// ============================================

function handleAdminGetSubmissions(body) {
  requireAdmin(body);
  var filterStatus = body.filter_status || 'all'; // 'pending', 'graded', 'all'
  var filterAssignment = body.filter_assignment || '';

  var scores = sheetToObjects('Scores');
  var users = sheetToObjects('Users');
  var assignments = sheetToObjects('Assignments');
  var subjects = sheetToObjects('Subjects');
  var questions = sheetToObjects('Questions');

  // Filter
  var filtered = scores;
  if (filterStatus !== 'all') {
    filtered = filtered.filter(function(s) { return (s.grading_status || 'auto_graded') === filterStatus; });
  }
  if (filterAssignment) {
    filtered = filtered.filter(function(s) { return s.assignment_id === filterAssignment; });
  }

  var result = filtered.map(function(sc) {
    var user = users.filter(function(u) { return u.user_id === sc.user_id; })[0];
    var assignment = assignments.filter(function(a) { return a.assignment_id === sc.assignment_id; })[0];
    var subject = assignment ? subjects.filter(function(s) { return s.subject_id === assignment.subject_id; })[0] : null;

    // Get questions for this assignment
    var assignQuestions = questions.filter(function(q) { return q.assignment_id === sc.assignment_id; });
    assignQuestions.sort(function(a, b) { return (a.order_index || 0) - (b.order_index || 0); });

    // Parse answers
    var answersObj = {};
    if (sc.answers_json) {
      try { answersObj = JSON.parse(sc.answers_json); } catch(e) {}
    }

    // Parse feedback
    var feedbackObj = {};
    if (sc.feedback_json) {
      try { feedbackObj = JSON.parse(sc.feedback_json); } catch(e) {}
    }

    // Build question detail with answers
    var questionDetails = assignQuestions.map(function(q) {
      var qType = q.question_type || 'mcq';
      return {
        question_id: q.question_id,
        question_text: q.question_text,
        question_type: qType,
        image_url: q.image_url || '',
        max_points: Number(q.max_points) || 1,
        correct_answer: qType === 'mcq' ? q.correct_answer : null,
        user_answer: answersObj[q.question_id] || '',
        feedback: feedbackObj[q.question_id] || null
      };
    });

    return {
      score_id: sc.score_id,
      user_id: sc.user_id,
      user_name: user ? user.name : 'Unknown',
      assignment_id: sc.assignment_id,
      assignment_title: assignment ? assignment.title : 'Unknown',
      subject_name: subject ? subject.subject_name : '',
      score: sc.score,
      max_score: sc.max_score,
      grading_status: sc.grading_status || 'auto_graded',
      submitted_at: sc.submitted_at,
      questions: questionDetails
    };
  });

  return { status: 'success', submissions: result };
}

function handleAdminGradeSubmission(body) {
  requireAdmin(body);
  var scoreId = body.score_id;
  var grades = body.grades; // { Q001: { points: 2, feedback: 'ดีมาก' }, Q002: { points: 0, feedback: 'ควรอธิบายเพิ่ม' } }

  if (!scoreId || !grades) {
    return { status: 'error', message: 'Missing score_id or grades' };
  }

  var scoresSheet = getSheet('Scores');
  var scoresData = scoresSheet.getDataRange().getValues();
  var headers = scoresData[0];
  var idCol = headers.indexOf('score_id');

  for (var r = 1; r < scoresData.length; r++) {
    if (scoresData[r][idCol] === scoreId) {
      // Calculate total score from grades
      var totalScore = 0;
      var feedbackObj = {};

      // Need questions to calculate MCQ scores too
      var assignmentId = scoresData[r][headers.indexOf('assignment_id')];
      var questions = sheetToObjects('Questions');
      var assignQuestions = questions.filter(function(q) { return q.assignment_id === assignmentId; });

      var answersJson = scoresData[r][headers.indexOf('answers_json')];
      var answersObj = {};
      try { answersObj = JSON.parse(answersJson); } catch(e) {}

      var totalMaxPts = 0;
      for (var i = 0; i < assignQuestions.length; i++) {
        var q = assignQuestions[i];
        var qType = q.question_type || 'mcq';
        var maxPts = Number(q.max_points) || 1;
        totalMaxPts += maxPts;

        if (grades[q.question_id] !== undefined) {
          // Admin graded this question
          var g = grades[q.question_id];
          var pts = Number(g.points) || 0;
          pts = Math.min(pts, maxPts); // Cap at max
          pts = Math.max(pts, 0);       // Min 0
          totalScore += pts;
          feedbackObj[q.question_id] = {
            points: pts,
            max_points: maxPts,
            feedback: g.feedback || ''
          };
        } else if (qType === 'mcq') {
          // MCQ auto-graded
          var userAns = answersObj[q.question_id] || '';
          var isCorrect = userAns.toString().toUpperCase() === (q.correct_answer || '').toUpperCase();
          totalScore += isCorrect ? maxPts : 0;
          feedbackObj[q.question_id] = {
            points: isCorrect ? maxPts : 0,
            max_points: maxPts,
            feedback: ''
          };
        }
      }

      // Update score row
      scoresSheet.getRange(r + 1, headers.indexOf('score') + 1).setValue(totalScore);
      scoresSheet.getRange(r + 1, headers.indexOf('max_score') + 1).setValue(totalMaxPts);
      scoresSheet.getRange(r + 1, headers.indexOf('grading_status') + 1).setValue('graded');
      scoresSheet.getRange(r + 1, headers.indexOf('feedback_json') + 1).setValue(JSON.stringify(feedbackObj));
      scoresSheet.getRange(r + 1, headers.indexOf('graded_by') + 1).setValue(body.user_id);
      scoresSheet.getRange(r + 1, headers.indexOf('graded_at') + 1).setValue(new Date().toISOString());

      logToSheet(body.user_id, 'admin_grade', 'ตรวจข้อสอบ score_id: ' + scoreId + ' ได้ ' + totalScore + '/' + totalMaxPts);

      return {
        status: 'success',
        message: 'ตรวจข้อสอบเรียบร้อย',
        score: totalScore,
        max_score: totalMaxPts
      };
    }
  }

  return { status: 'error', message: 'ไม่พบข้อมูลคะแนน' };
}


// ============================================
// ADMIN — ANALYTICS
// ============================================

function handleAdminGetStudentDetail(body) {
  requireAdmin(body);
  var targetUserId = body.target_user_id;
  if (!targetUserId) return { status: 'error', message: 'Missing target_user_id' };

  var users = sheetToObjects('Users');
  var user = users.filter(function(u) { return u.user_id === targetUserId; })[0];
  if (!user) return { status: 'error', message: 'ไม่พบนักเรียน' };

  var scores = sheetToObjects('Scores');
  var assignments = sheetToObjects('Assignments');
  var subjects = sheetToObjects('Subjects');
  var progress = sheetToObjects('Progress');
  var lessons = sheetToObjects('Lessons');
  var logs = sheetToObjects('Logs');

  var userScores = scores.filter(function(s) { return s.user_id === targetUserId; });
  var userProgress = progress.filter(function(p) { return p.user_id === targetUserId; });
  var userLogs = logs.filter(function(l) { return l.user_id === targetUserId; });

  // Overall stats
  var totalScore = 0, totalMax = 0;
  for (var i = 0; i < userScores.length; i++) {
    totalScore += Number(userScores[i].score) || 0;
    totalMax += Number(userScores[i].max_score) || 0;
  }

  // Score details per assignment
  var scoreDetails = userScores.map(function(sc) {
    var assignment = assignments.filter(function(a) { return a.assignment_id === sc.assignment_id; })[0];
    var subject = assignment ? subjects.filter(function(s) { return s.subject_id === assignment.subject_id; })[0] : null;
    var pct = sc.max_score > 0 ? Math.round((sc.score / sc.max_score) * 100) : 0;
    var threshold = assignment ? (Number(assignment.pass_threshold) || 50) : 50;

    return {
      assignment_id: sc.assignment_id,
      assignment_title: assignment ? assignment.title : 'Unknown',
      subject_name: subject ? subject.subject_name : '',
      score: sc.score,
      max_score: sc.max_score,
      percentage: pct,
      passed: pct >= threshold,
      grading_status: sc.grading_status || 'auto_graded',
      submitted_at: sc.submitted_at
    };
  });

  // Recent activity (last 20)
  userLogs.sort(function(a, b) { return (b.timestamp || '').localeCompare(a.timestamp || ''); });
  var recentActivity = userLogs.slice(0, 20);

  var avgPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  return {
    status: 'success',
    student: {
      user_id: user.user_id,
      username: user.username,
      name: user.name,
      avatar_color: user.avatar_color,
      email: user.email || '',
      status: user.status || 'active',
      created_at: user.created_at || ''
    },
    stats: {
      total_score: totalScore,
      total_max_score: totalMax,
      avg_percent: avgPct,
      grade: calculateGrade(avgPct),
      completed_lessons: userProgress.filter(function(p) { return p.status === 'completed'; }).length,
      total_lessons: lessons.length,
      completed_assignments: userScores.length,
      total_assignments: assignments.length
    },
    scores: scoreDetails,
    activity: recentActivity
  };
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

  // Per-student summary
  var studentSummary = students.map(function(stu) {
    var stuScores = scores.filter(function(s) { return s.user_id === stu.user_id; });
    var total = 0, max = 0;
    for (var i = 0; i < stuScores.length; i++) {
      total += Number(stuScores[i].score) || 0;
      max += Number(stuScores[i].max_score) || 0;
    }
    var pct = max > 0 ? Math.round((total / max) * 100) : 0;
    return {
      user_id: stu.user_id,
      name: stu.name,
      username: stu.username,
      avatar_color: stu.avatar_color,
      avg_percent: pct,
      grade: calculateGrade(pct),
      assignments_done: stuScores.length,
      total_assignments: assignments.length
    };
  });

  // Recent logs (last 20)
  logs.sort(function(a, b) { return (b.timestamp || '').localeCompare(a.timestamp || ''); });
  var recentLogs = logs.slice(0, 20).map(function(l) {
    var user = users.filter(function(u) { return u.user_id === l.user_id; })[0];
    return {
      user_name: user ? user.name : 'Unknown',
      action_type: l.action_type,
      detail: l.detail,
      timestamp: l.timestamp
    };
  });

  return {
    status: 'success',
    stats: {
      total_students: students.length,
      total_subjects: subjects.length,
      total_lessons: lessons.length,
      total_assignments: assignments.length,
      pending_grading: pendingGrading.length,
      total_submissions: scores.length
    },
    students: studentSummary,
    pending: pendingGrading.length,
    recent_activity: recentLogs
  };
}


// ============================================
// ADMIN — GENERIC CRUD
// ============================================

function handleAdminGetAllScores(body) {
  requireAdmin(body);

  var scores = sheetToObjects('Scores');
  var users = sheetToObjects('Users');
  var assignments = sheetToObjects('Assignments');
  var subjects = sheetToObjects('Subjects');

  var enriched = scores.map(function(s) {
    var user = users.filter(function(u) { return u.user_id === s.user_id; })[0];
    var assignment = assignments.filter(function(a) { return a.assignment_id === s.assignment_id; })[0];
    var subject = assignment ? subjects.filter(function(sub) { return sub.subject_id === assignment.subject_id; })[0] : null;
    var pct = s.max_score > 0 ? Math.round((s.score / s.max_score) * 100) : 0;
    var threshold = assignment ? (Number(assignment.pass_threshold) || 50) : 50;

    return {
      score_id: s.score_id,
      user_name: user ? user.name : 'Unknown',
      user_id: s.user_id,
      assignment_title: assignment ? assignment.title : 'Unknown',
      assignment_id: s.assignment_id,
      subject_name: subject ? subject.subject_name : '',
      score: s.score,
      max_score: s.max_score,
      percentage: pct,
      passed: pct >= threshold,
      grading_status: s.grading_status || 'auto_graded',
      submitted_at: s.submitted_at
    };
  });

  return { status: 'success', scores: enriched };
}

function handleAdminUpdateItem(body) {
  requireAdmin(body);
  var sheetName = body.sheet_name;
  var idField = body.id_field;
  var idValue = body.id_value;
  var updates = body.updates;

  if (!sheetName || !idField || !idValue || !updates) {
    return { status: 'error', message: 'Missing required fields for update' };
  }

  var sheet = getSheet(sheetName);
  if (!sheet) return { status: 'error', message: 'Sheet not found: ' + sheetName };

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf(idField);
  if (idCol === -1) return { status: 'error', message: 'Column not found: ' + idField };

  for (var r = 1; r < data.length; r++) {
    if (data[r][idCol] === idValue) {
      for (var key in updates) {
        var col = headers.indexOf(key);
        if (col !== -1) {
          sheet.getRange(r + 1, col + 1).setValue(updates[key]);
        }
      }
      return { status: 'success', message: 'อัพเดทเรียบร้อย' };
    }
  }

  return { status: 'error', message: 'ไม่พบข้อมูลที่ต้องการแก้ไข' };
}

function handleAdminDeleteItem(body) {
  requireAdmin(body);
  var sheetName = body.sheet_name;
  var idField = body.id_field;
  var idValue = body.id_value;

  if (!sheetName || !idField || !idValue) {
    return { status: 'error', message: 'Missing required fields for delete' };
  }

  var sheet = getSheet(sheetName);
  if (!sheet) return { status: 'error', message: 'Sheet not found: ' + sheetName };

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf(idField);
  if (idCol === -1) return { status: 'error', message: 'Column not found: ' + idField };

  for (var r = data.length - 1; r >= 1; r--) {
    if (data[r][idCol] === idValue) {
      sheet.deleteRow(r + 1);
      return { status: 'success', message: 'ลบข้อมูลเรียบร้อย' };
    }
  }

  return { status: 'error', message: 'ไม่พบข้อมูลที่ต้องการลบ' };
}
