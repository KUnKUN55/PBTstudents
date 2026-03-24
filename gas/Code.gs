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
      case 'login':            result = handleLogin(body); break;

      // ── Student Actions ──
      case 'getSubjects':      result = handleGetSubjects(body); break;
      case 'getLessons':       result = handleGetLessons(body); break;
      case 'getAssignments':   result = handleGetAssignments(body); break;
      case 'getQuestions':     result = handleGetQuestions(body); break;
      case 'submitQuiz':       result = handleSubmitQuiz(body); break;
      case 'getScores':        result = handleGetScores(body); break;
      case 'getDashboard':     result = handleGetDashboard(body); break;
      case 'getProgress':      result = handleGetProgress(body); break;
      case 'markLessonComplete': result = handleMarkLessonComplete(body); break;
      case 'logAction':        result = handleLogAction(body); break;

      // ── Admin Actions ──
      case 'adminGetUsers':     result = handleAdminGetUsers(body); break;
      case 'adminAddSubject':   result = handleAdminAddSubject(body); break;
      case 'adminAddLesson':    result = handleAdminAddLesson(body); break;
      case 'adminAddAssignment': result = handleAdminAddAssignment(body); break;
      case 'adminAddQuestion':  result = handleAdminAddQuestion(body); break;
      case 'adminGetAllScores': result = handleAdminGetAllScores(body); break;
      case 'adminUpdateItem':   result = handleAdminUpdateItem(body); break;
      case 'adminDeleteItem':   result = handleAdminDeleteItem(body); break;

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

// ── Helper: JSON Response ──
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Helper: Get Sheet ──
function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

// ── Helper: Sheet to Array of Objects ──
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
      // Convert Date objects to ISO string
      if (val instanceof Date) {
        val = val.toISOString();
      }
      obj[headers[j]] = val;
    }
    // Skip empty rows
    if (obj[headers[0]] !== '' && obj[headers[0]] !== null && obj[headers[0]] !== undefined) {
      objects.push(obj);
    }
  }
  return objects;
}

// ── Helper: Generate ID ──
function generateId(prefix) {
  return prefix + '_' + new Date().getTime().toString(36) + Math.random().toString(36).substr(2, 4);
}

// ── Helper: SHA-256 ──
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

// ── Helper: Require Auth ──
function requireAuth(body) {
  if (!body.user_id) throw new Error('กรุณาเข้าสู่ระบบก่อน');
  return true;
}

// ── Helper: Require Admin ──
function requireAdmin(body) {
  requireAuth(body);
  if (body.role !== 'admin') throw new Error('คุณไม่มีสิทธิ์เข้าถึงส่วนนี้');
  return true;
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
      // Log login action
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
  // Sort by order_index
  subjects.sort(function(a, b) { return (a.order_index || 0) - (b.order_index || 0); });

  // Count lessons and assignments per subject
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

  // Get progress for this user
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

  // Get scores for this user
  var scores = sheetToObjects('Scores');
  for (var i = 0; i < filtered.length; i++) {
    var userScore = scores.filter(function(s) {
      return s.user_id === body.user_id && s.assignment_id === filtered[i].assignment_id;
    });
    if (userScore.length > 0) {
      filtered[i].user_score = userScore[0].score;
      filtered[i].submitted = true;
    } else {
      filtered[i].user_score = null;
      filtered[i].submitted = false;
    }
  }

  return { status: 'success', assignments: filtered };
}


// ============================================
// QUESTIONS
// ============================================

function handleGetQuestions(body) {
  requireAuth(body);
  var assignmentId = body.assignment_id;
  if (!assignmentId) return { status: 'error', message: 'Missing assignment_id' };

  var questions = sheetToObjects('Questions');
  var filtered = questions.filter(function(q) { return q.assignment_id === assignmentId; });

  // Don't send correct_answer to client
  var safeQuestions = filtered.map(function(q) {
    return {
      question_id: q.question_id,
      assignment_id: q.assignment_id,
      question_text: q.question_text,
      choice_a: q.choice_a,
      choice_b: q.choice_b,
      choice_c: q.choice_c,
      choice_d: q.choice_d
    };
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

  return {
    status: 'success',
    assignment: assignment,
    questions: safeQuestions,
    already_submitted: existing.length > 0,
    previous_score: existing.length > 0 ? existing[0].score : null
  };
}


// ============================================
// SUBMIT QUIZ
// ============================================

function handleSubmitQuiz(body) {
  requireAuth(body);
  var assignmentId = body.assignment_id;
  var answers = body.answers; // { Q001: 'A', Q002: 'B', ... }

  if (!assignmentId || !answers) {
    return { status: 'error', message: 'Missing assignment_id or answers' };
  }

  // Get questions with correct answers
  var questions = sheetToObjects('Questions');
  var filtered = questions.filter(function(q) { return q.assignment_id === assignmentId; });

  if (filtered.length === 0) {
    return { status: 'error', message: 'ไม่พบคำถามสำหรับข้อสอบนี้' };
  }

  // Grade
  var correct = 0;
  var total = filtered.length;
  var results = [];

  for (var i = 0; i < filtered.length; i++) {
    var q = filtered[i];
    var userAnswer = answers[q.question_id] || '';
    var isCorrect = userAnswer.toUpperCase() === (q.correct_answer || '').toUpperCase();
    if (isCorrect) correct++;
    results.push({
      question_id: q.question_id,
      user_answer: userAnswer,
      correct_answer: q.correct_answer,
      is_correct: isCorrect
    });
  }

  var score = correct;
  var maxScore = total;

  // Check if already submitted — update instead of insert
  var scoresSheet = getSheet('Scores');
  var scoresData = scoresSheet.getDataRange().getValues();
  var updated = false;

  for (var r = 1; r < scoresData.length; r++) {
    if (scoresData[r][1] === body.user_id && scoresData[r][2] === assignmentId) {
      // Update existing row
      scoresSheet.getRange(r + 1, 4).setValue(score);
      scoresSheet.getRange(r + 1, 5).setValue(maxScore);
      scoresSheet.getRange(r + 1, 6).setValue(JSON.stringify(answers));
      scoresSheet.getRange(r + 1, 7).setValue(new Date().toISOString());
      updated = true;
      break;
    }
  }

  if (!updated) {
    // Insert new score
    scoresSheet.appendRow([
      generateId('SC'),
      body.user_id,
      assignmentId,
      score,
      maxScore,
      JSON.stringify(answers),
      new Date().toISOString()
    ]);
  }

  // Log action
  logToSheet(body.user_id, 'submit_quiz', 'ทำข้อสอบ ' + assignmentId + ' ได้ ' + score + '/' + maxScore);

  return {
    status: 'success',
    score: score,
    max_score: maxScore,
    percentage: Math.round((score / maxScore) * 100),
    results: results
  };
}


// ============================================
// SCORES
// ============================================

function handleGetScores(body) {
  requireAuth(body);
  var scores = sheetToObjects('Scores');
  var userScores = scores.filter(function(s) { return s.user_id === body.user_id; });

  // Enrich with assignment info
  var assignments = sheetToObjects('Assignments');
  var subjects = sheetToObjects('Subjects');

  for (var i = 0; i < userScores.length; i++) {
    var assignment = assignments.filter(function(a) {
      return a.assignment_id === userScores[i].assignment_id;
    })[0];

    if (assignment) {
      userScores[i].assignment_title = assignment.title;
      userScores[i].subject_id = assignment.subject_id;
      var subject = subjects.filter(function(s) { return s.subject_id === assignment.subject_id; })[0];
      userScores[i].subject_name = subject ? subject.subject_name : '';
    }
  }

  return { status: 'success', scores: userScores };
}


// ============================================
// DASHBOARD
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

  // Stats
  var totalScore = 0;
  var totalMaxScore = 0;
  for (var i = 0; i < userScores.length; i++) {
    totalScore += Number(userScores[i].score) || 0;
    totalMaxScore += Number(userScores[i].max_score) || 0;
  }

  var avgPercent = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
  var completedLessons = userProgress.filter(function(p) { return p.status === 'completed'; }).length;

  // Grade calculation
  var grade = calculateGrade(avgPercent);

  return {
    status: 'success',
    stats: {
      total_subjects: subjects.length,
      total_lessons: lessons.length,
      completed_lessons: completedLessons,
      total_assignments: assignments.length,
      completed_assignments: userScores.length,
      total_score: totalScore,
      total_max_score: totalMaxScore,
      avg_percent: avgPercent,
      grade: grade
    },
    subjects: subjects.sort(function(a, b) { return (a.order_index || 0) - (b.order_index || 0); })
  };
}

function calculateGrade(percent) {
  if (percent >= 80) return { letter: 'A', label: 'ยอดเยี่ยม', color: '#10b981' };
  if (percent >= 70) return { letter: 'B+', label: 'ดีมาก', color: '#06b6d4' };
  if (percent >= 60) return { letter: 'B', label: 'ดี', color: '#3b82f6' };
  if (percent >= 50) return { letter: 'C+', label: 'ค่อนข้างดี', color: '#f59e0b' };
  if (percent >= 40) return { letter: 'C', label: 'พอใช้', color: '#f97316' };
  return { letter: 'D', label: 'ต้องปรับปรุง', color: '#ef4444' };
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

  // Check if entry already exists
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === body.user_id && data[i][1] === lessonId) {
      // Update existing
      sheet.getRange(i + 1, 3).setValue('completed');
      sheet.getRange(i + 1, 4).setValue(new Date().toISOString());
      found = true;
      break;
    }
  }

  if (!found) {
    // Insert new
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

function logToSheet(userId, actionType, detail) {
  try {
    var sheet = getSheet('Logs');
    if (sheet) {
      sheet.appendRow([
        generateId('LOG'),
        userId,
        actionType,
        detail,
        new Date().toISOString()
      ]);
    }
  } catch (e) {
    // Silently fail — don't break main operations for logging
  }
}


// ============================================
// ADMIN FUNCTIONS
// ============================================

function handleAdminGetUsers(body) {
  requireAdmin(body);
  var users = sheetToObjects('Users');
  // Remove password hashes
  return {
    status: 'success',
    users: users.map(function(u) {
      return {
        user_id: u.user_id,
        username: u.username,
        name: u.name,
        role: u.role,
        avatar_color: u.avatar_color
      };
    })
  };
}

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
    new Date().toISOString()
  ]);
  return { status: 'success', assignment_id: id, message: 'เพิ่มข้อสอบ/งานเรียบร้อย' };
}

function handleAdminAddQuestion(body) {
  requireAdmin(body);
  var sheet = getSheet('Questions');
  var id = generateId('Q');
  sheet.appendRow([
    id,
    body.assignment_id || '',
    body.question_text || '',
    body.choice_a || '',
    body.choice_b || '',
    body.choice_c || '',
    body.choice_d || '',
    (body.correct_answer || 'A').toUpperCase()
  ]);
  return { status: 'success', question_id: id, message: 'เพิ่มคำถามเรียบร้อย' };
}

function handleAdminGetAllScores(body) {
  requireAdmin(body);

  var scores = sheetToObjects('Scores');
  var users = sheetToObjects('Users');
  var assignments = sheetToObjects('Assignments');
  var subjects = sheetToObjects('Subjects');

  // Enrich scores
  var enriched = scores.map(function(s) {
    var user = users.filter(function(u) { return u.user_id === s.user_id; })[0];
    var assignment = assignments.filter(function(a) { return a.assignment_id === s.assignment_id; })[0];
    var subject = assignment ? subjects.filter(function(sub) { return sub.subject_id === assignment.subject_id; })[0] : null;

    return {
      score_id: s.score_id,
      user_name: user ? user.name : 'Unknown',
      assignment_title: assignment ? assignment.title : 'Unknown',
      subject_name: subject ? subject.subject_name : '',
      score: s.score,
      max_score: s.max_score,
      percentage: s.max_score > 0 ? Math.round((s.score / s.max_score) * 100) : 0,
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
  var updates = body.updates; // { column_name: value, ... }

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
