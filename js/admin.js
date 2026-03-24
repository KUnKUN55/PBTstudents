/* ============================================
   PBTstudents LMS — Admin Panel Logic
   ============================================ */

if (!requireAdmin()) { /* redirects */ }

var cachedSubjects = [];
var cachedAssignments = [];
var currentChangeUserId = '';
var currentChangeUserName = '';
var currentGradingData = null;
window.submissionPool = {};

document.addEventListener('DOMContentLoaded', function() {
  renderNavbar();
  initTabs();
  loadAdminDashboard();
  loadAdminData();

  document.querySelector('[data-tab="tabGrading"]').addEventListener('click', loadSubmissions);
  document.querySelector('[data-tab="tabScores"]').addEventListener('click', loadAllScores);
  document.querySelector('[data-tab="tabDash"]').addEventListener('click', loadAdminDashboard);
  document.querySelector('[data-tab="tabStudents"]').addEventListener('click', loadUsers);
});

// ── Helpers ──
function escapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
function getGrade(pct) {
  if (pct >= 80) return { letter: 'A', label: 'ยอดเยี่ยม', color: '#10b981' };
  if (pct >= 70) return { letter: 'B+', label: 'ดีมาก', color: '#06b6d4' };
  if (pct >= 60) return { letter: 'B', label: 'ดี', color: '#3b82f6' };
  if (pct >= 50) return { letter: 'C+', label: 'ค่อนข้างดี', color: '#f59e0b' };
  if (pct >= 40) return { letter: 'C', label: 'พอใช้', color: '#f97316' };
  return { letter: 'D', label: 'ต้องปรับปรุง', color: '#ef4444' };
}
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function getId(id) { return document.getElementById(id); } // Replaced conflicting $$

// ============================================
// ADMIN DASHBOARD
// ============================================
async function loadAdminDashboard() {
  try {
    var data = await apiAdminGetDashboard();
    if (data.status !== 'success') throw new Error(data.message);
    var s = data.stats;

    getId('adminStatsGrid').innerHTML =
      statCard('👥', s.total_students, 'นักเรียน') +
      statCard('📚', s.total_subjects, 'วิชา') +
      statCard('🟡', s.pending_grading, 'รอตรวจ') +
      statCard('📝', s.total_submissions, 'งานที่ส่ง');

    // Student summary table
    var students = data.students || [];
    if (students.length === 0) {
      getId('adminStudentSummary').innerHTML = '<div class="empty-state"><p>ยังไม่มีนักเรียน</p></div>';
    } else {
      var html = '<div class="table-container"><table class="table"><thead><tr>' +
        '<th>ชื่อ</th><th>คะแนนเฉลี่ย</th><th>เกรด</th><th>งานที่ทำ</th><th>ดู</th></tr></thead><tbody>';
      for (var i = 0; i < students.length; i++) {
        var st = students[i];
        html += '<tr><td><strong>' + escapeHtml(st.name) + '</strong></td>' +
          '<td>' + st.avg_percent + '%</td>' +
          '<td><span style="color:' + st.grade.color + ';font-weight:700">' + st.grade.letter + '</span></td>' +
          '<td>' + st.assignments_done + '/' + st.total_assignments + '</td>' +
          '<td><button class="btn btn-primary btn-sm" onclick="viewStudentDetail(\'' + st.user_id + '\')" style="font-size:.8rem">📋 ดู</button></td></tr>';
      }
      html += '</tbody></table></div>';
      getId('adminStudentSummary').innerHTML = html;
    }

    // Recent activity
    var logs = data.recent_activity || [];
    if (logs.length === 0) {
      getId('adminRecentActivity').innerHTML = '<div class="empty-state"><p>ยังไม่มีกิจกรรม</p></div>';
    } else {
      var lhtml = '<div class="card">';
      for (var j = 0; j < Math.min(logs.length, 10); j++) {
        var l = logs[j];
        lhtml += '<div style="padding:8px 0;border-bottom:1px solid var(--border-color);font-size:.85rem">' +
          '<strong>' + escapeHtml(l.user_name) + '</strong> — ' + escapeHtml(l.detail || l.action_type) +
          '<span style="float:right;color:var(--text-secondary);font-size:.75rem">' + formatDate(l.timestamp) + '</span></div>';
      }
      lhtml += '</div>';
      getId('adminRecentActivity').innerHTML = lhtml;
    }
  } catch (err) {
    getId('adminStatsGrid').innerHTML = '<div class="empty-state" style="grid-column:1/-1"><p>⚠️ ' + (err.message || 'โหลดไม่สำเร็จ') + '</p></div>';
  }
}

function statCard(icon, num, label) {
  return '<div class="card admin-stat animate-in"><div class="stat-num">' + icon + ' ' + num + '</div><div class="stat-lbl">' + label + '</div></div>';
}

// ============================================
// LOAD SUBJECTS (shared data)
// ============================================
async function loadAdminData() {
  try {
    var subData = await apiGetSubjects();
    cachedSubjects = subData.subjects || [];
    renderSubjectsList(cachedSubjects);
    populateSubjectDropdowns();
    await loadAssignmentDropdown();
  } catch (err) {
    showToast('โหลดข้อมูลไม่สำเร็จ: ' + err.message, 'error');
  }
}

function populateSubjectDropdowns() {
  var ids = ['lessonSubject', 'assignSubject'];
  for (var d = 0; d < ids.length; d++) {
    var sel = getId(ids[d]);
    if (!sel) continue;
    sel.innerHTML = '<option value="">-- เลือกวิชา --</option>';
    for (var i = 0; i < cachedSubjects.length; i++) {
      var s = cachedSubjects[i];
      sel.innerHTML += '<option value="' + s.subject_id + '">' + (s.icon||'') + ' ' + s.subject_name + '</option>';
    }
  }
}

async function loadAssignmentDropdown() {
  var sel = getId('qAssignment');
  sel.innerHTML = '<option value="">-- เลือกข้อสอบ --</option>';
  cachedAssignments = [];
  for (var i = 0; i < cachedSubjects.length; i++) {
    try {
      var aData = await apiGetAssignments(cachedSubjects[i].subject_id);
      var arr = aData.assignments || [];
      for (var j = 0; j < arr.length; j++) {
        cachedAssignments.push(arr[j]);
        sel.innerHTML += '<option value="' + arr[j].assignment_id + '">' + cachedSubjects[i].subject_name + ' → ' + arr[j].title + '</option>';
      }
    } catch (e) {}
  }
}

// ============================================
// SUBJECTS
// ============================================
function renderSubjectsList(subjects) {
  var c = getId('subjectsList');
  if (subjects.length === 0) { c.innerHTML = '<div class="empty-state"><p>📭 ยังไม่มีวิชา</p></div>'; return; }
  var html = '<div class="table-container"><table class="table"><thead><tr><th>ไอคอน</th><th>ชื่อ</th><th>คำอธิบาย</th><th>บทเรียน</th><th>ข้อสอบ</th><th>จัดการ</th></tr></thead><tbody>';
  for (var i = 0; i < subjects.length; i++) {
    var s = subjects[i];
    html += '<tr><td style="font-size:1.5rem">' + (s.icon||'📚') + '</td><td><strong>' + escapeHtml(s.subject_name) + '</strong></td>' +
      '<td style="color:var(--text-secondary);font-size:.85rem">' + escapeHtml(s.description||'-') + '</td>' +
      '<td><span class="badge badge-blue">' + (s.lesson_count||0) + '</span></td>' +
      '<td><span class="badge badge-purple">' + (s.assignment_count||0) + '</span></td>' +
      '<td><button class="btn btn-danger btn-sm" onclick="deleteItem(\'Subjects\',\'subject_id\',\'' + s.subject_id + '\')">🗑️</button></td></tr>';
  }
  html += '</tbody></table></div>';
  c.innerHTML = html;
}

// ============================================
// CRUD ACTIONS
// ============================================
async function addSubject(e) {
  e.preventDefault(); var btn = e.target.querySelector('button[type="submit"]'); btn.disabled = true;
  try {
    var r = await apiAdminAddSubject({ subject_name: getId('subName').value.trim(), icon: getId('subIcon').value.trim()||'📚', color: getId('subColor').value, description: getId('subDesc').value.trim(), order_index: getId('subOrder').value });
    if (r.status === 'success') { showToast('เพิ่มวิชาเรียบร้อย! ✅','success'); e.target.reset(); getId('subIcon').value='📚'; getId('subColor').value='#3b82f6'; loadAdminData(); }
    else throw new Error(r.message);
  } catch(err) { showToast(err.message||'เพิ่มไม่สำเร็จ','error'); }
  btn.disabled = false;
}

async function addLesson(e) {
  e.preventDefault(); var btn = e.target.querySelector('button[type="submit"]'); btn.disabled = true;
  try {
    var r = await apiAdminAddLesson({ subject_id: getId('lessonSubject').value, title: getId('lessonTitle').value.trim(), description: getId('lessonDesc').value.trim(), file_url: getId('lessonFile').value.trim(), file_type: getId('lessonFileType').value, chapter: getId('lessonChapter').value.trim(), order_index: getId('lessonOrder').value });
    if (r.status === 'success') { showToast('เพิ่มบทเรียนเรียบร้อย! ✅','success'); e.target.reset(); }
    else throw new Error(r.message);
  } catch(err) { showToast(err.message||'เพิ่มไม่สำเร็จ','error'); }
  btn.disabled = false;
}

async function addAssignment(e) {
  e.preventDefault(); var btn = e.target.querySelector('button[type="submit"]'); btn.disabled = true;
  try {
    var r = await apiAdminAddAssignment({ subject_id: getId('assignSubject').value, title: getId('assignTitle').value.trim(), type: getId('assignType').value, description: getId('assignDesc').value.trim(), pass_threshold: getId('assignPass').value, due_date: getId('assignDue').value });
    if (r.status === 'success') { showToast('สร้างข้อสอบเรียบร้อย! ✅','success'); e.target.reset(); getId('assignPass').value='50'; loadAssignmentDropdown(); }
    else throw new Error(r.message);
  } catch(err) { showToast(err.message||'สร้างไม่สำเร็จ','error'); }
  btn.disabled = false;
}

// ── Question type toggle ──
function setQType(type) {
  getId('qType').value = type;
  var btns = document.querySelectorAll('#qTypeToggle button');
  btns.forEach(function(b) { b.classList.remove('active'); });
  event.target.classList.add('active');
  document.getElementById('mcqChoicesArea').style.display = type === 'mcq' ? 'block' : 'none';
}

async function addQuestion(e) {
  e.preventDefault(); var btn = e.target.querySelector('button[type="submit"]'); btn.disabled = true;
  var qType = getId('qType').value;
  try {
    var payload = {
      assignment_id: getId('qAssignment').value,
      question_text: getId('qText').value.trim(),
      question_type: qType,
      image_url: getId('qImage').value.trim(),
      max_points: getId('qPoints').value
    };
    if (qType === 'mcq') {
      payload.choice_a = getId('qA').value.trim();
      payload.choice_b = getId('qB').value.trim();
      payload.choice_c = getId('qC').value.trim();
      payload.choice_d = getId('qD').value.trim();
      payload.correct_answer = getId('qCorrect').value;
    }
    var r = await apiAdminAddQuestion(payload);
    if (r.status === 'success') {
      showToast('เพิ่มคำถามเรียบร้อย! ✅','success');
      getId('qText').value=''; getId('qA').value=''; getId('qB').value=''; getId('qC').value=''; getId('qD').value=''; getId('qImage').value='';
    } else throw new Error(r.message);
  } catch(err) { showToast(err.message||'เพิ่มไม่สำเร็จ','error'); }
  btn.disabled = false;
}

async function deleteItem(sheet, field, value) {
  if (!confirm('ยืนยันลบข้อมูลนี้?')) return;
  try {
    var r = await apiAdminDeleteItem({ sheet_name: sheet, id_field: field, id_value: value });
    if (r.status === 'success') { showToast('ลบเรียบร้อย! ✅','success'); loadAdminData(); }
    else throw new Error(r.message);
  } catch(err) { showToast(err.message||'ลบไม่สำเร็จ','error'); }
}

// ============================================
// USERS
// ============================================
async function loadUsers() {
  var c = getId('usersListContainer');
  c.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
  try {
    var r = await apiAdminGetUsers();
    if (r.status !== 'success') throw new Error(r.message);
    var users = r.users || [];
    if (users.length === 0) { c.innerHTML = '<div class="empty-state"><p>👥 ยังไม่มีผู้ใช้</p></div>'; return; }
    var html = '<div class="table-container"><table class="table"><thead><tr><th>ชื่อ</th><th>Username</th><th>สถานะ</th><th>Role</th><th>จัดการ</th></tr></thead><tbody>';
    for (var i = 0; i < users.length; i++) {
      var u = users[i];
      var roleBadge = u.role==='admin' ? '<span class="badge badge-purple">Admin</span>' : '<span class="badge badge-blue">Student</span>';
      var statusBadge = (u.status||'active')==='active' ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-red">Inactive</span>';
      html += '<tr><td><strong>' + escapeHtml(u.name) + '</strong></td><td style="color:var(--text-secondary)">' + escapeHtml(u.username) + '</td>' +
        '<td>' + statusBadge + '</td><td>' + roleBadge + '</td><td style="white-space:nowrap">' +
        '<button class="btn btn-primary btn-sm" onclick="openPasswordChange(\'' + u.user_id + '\',\'' + escapeHtml(u.name) + '\')" style="font-size:.78rem;margin-right:4px">🔑</button>' +
        '<button class="btn btn-sm" onclick="viewStudentDetail(\'' + u.user_id + '\')" style="font-size:.78rem;background:var(--glass-bg);color:var(--text-primary);margin-right:4px">📋</button>' +
        (u.role !== 'admin' ? '<button class="btn btn-danger btn-sm" onclick="deleteUser(\'' + u.user_id + '\')" style="font-size:.78rem">🗑️</button>' : '') +
        '</td></tr>';
    }
    html += '</tbody></table></div>';
    c.innerHTML = html;
  } catch(err) { c.innerHTML = '<div class="empty-state"><p>⚠️ ' + (err.message||'โหลดไม่สำเร็จ') + '</p></div>'; }
}

async function addUser(e) {
  e.preventDefault(); var btn = e.target.querySelector('button[type="submit"]'); btn.disabled = true;
  try {
    var r = await apiAdminAddUser({ name: getId('uName').value.trim(), username: getId('uUsername').value.trim(), password: getId('uPassword').value, avatar_color: getId('uColor').value });
    if (r.status === 'success') { showToast('เพิ่มนักเรียนเรียบร้อย! ✅','success'); e.target.reset(); getId('uColor').value='#10b981'; loadUsers(); }
    else throw new Error(r.message);
  } catch(err) { showToast(err.message||'เพิ่มไม่สำเร็จ','error'); }
  btn.disabled = false;
}

async function deleteUser(userId) {
  if (!confirm('ยืนยันลบนักเรียนคนนี้? (ข้อมูลคะแนนจะยังอยู่)')) return;
  try {
    var r = await apiAdminDeleteUser(userId);
    if (r.status === 'success') { showToast('ลบเรียบร้อย! ✅','success'); loadUsers(); }
    else throw new Error(r.message);
  } catch(err) { showToast(err.message||'ลบไม่สำเร็จ','error'); }
}

function openPasswordChange(userId, userName) {
  currentChangeUserId = userId; currentChangeUserName = userName;
  getId('modalUserName').textContent = userName;
  getId('newPasswordInput').value = '';
  openModal('passwordModal');
}

async function saveNewPassword() {
  var pwd = getId('newPasswordInput').value.trim();
  if (!pwd || pwd.length < 4) { showToast('รหัสผ่านต้องมีอย่างน้อย 4 ตัว','error'); return; }
  var btn = getId('btnSavePassword'); btn.disabled = true; btn.textContent = '⏳...';
  try {
    var r = await apiAdminChangePassword({ target_user_id: currentChangeUserId, new_password: pwd });
    if (r.status === 'success') { showToast('เปลี่ยนรหัสผ่านเรียบร้อย! ✅','success'); closeModal('passwordModal'); }
    else throw new Error(r.message);
  } catch(err) { showToast(err.message||'ไม่สำเร็จ','error'); }
  btn.disabled = false; btn.textContent = '💾 บันทึก';
}

// ============================================
// STUDENT DETAIL
// ============================================
async function viewStudentDetail(userId) {
  openModal('studentDetailModal');
  getId('studentDetailContent').innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
  try {
    var r = await apiAdminGetStudentDetail(userId);
    if (r.status !== 'success') throw new Error(r.message);
    var st = r.student, stats = r.stats;
    getId('detailStudentName').textContent = '📋 ' + st.name;
    var html = '<div class="grid-2" style="margin-bottom:var(--space-lg)">' +
      '<div class="card admin-stat"><div class="stat-num" style="font-size:1.5rem;color:' + stats.grade.color + '">' + stats.grade.letter + '</div><div class="stat-lbl">เกรดเฉลี่ย (' + stats.avg_percent + '%)</div></div>' +
      '<div class="card admin-stat"><div class="stat-num" style="font-size:1.5rem">' + stats.completed_lessons + '/' + stats.total_lessons + '</div><div class="stat-lbl">บทเรียนที่เรียน</div></div></div>';

    if (r.scores && r.scores.length > 0) {
      html += '<h4 style="margin-bottom:var(--space-sm)">📝 คะแนน</h4><div class="table-container"><table class="table"><thead><tr><th>ข้อสอบ</th><th>คะแนน</th><th>สถานะ</th></tr></thead><tbody>';
      for (var i = 0; i < r.scores.length; i++) {
        var sc = r.scores[i];
        var pct = sc.percentage;
        var passBadge = sc.grading_status === 'pending' ? '<span class="pass-badge pass-wait">รอตรวจ</span>'
          : sc.passed ? '<span class="pass-badge pass-yes">✅ ผ่าน</span>' : '<span class="pass-badge pass-no">❌ ไม่ผ่าน</span>';
        html += '<tr><td>' + escapeHtml(sc.assignment_title) + '<br><small style="color:var(--text-secondary)">' + escapeHtml(sc.subject_name) + '</small></td>' +
          '<td><strong>' + sc.score + '/' + sc.max_score + '</strong> (' + pct + '%)</td><td>' + passBadge + '</td></tr>';
      }
      html += '</tbody></table></div>';
    }

    if (r.activity && r.activity.length > 0) {
      html += '<h4 style="margin:var(--space-lg) 0 var(--space-sm)">🕐 กิจกรรมล่าสุด</h4><div style="font-size:.85rem">';
      for (var j = 0; j < Math.min(r.activity.length, 10); j++) {
        var a = r.activity[j];
        html += '<div style="padding:4px 0;border-bottom:1px solid var(--border-color)">' + escapeHtml(a.detail||a.action_type) + ' <span style="color:var(--text-secondary)">' + formatDate(a.timestamp) + '</span></div>';
      }
      html += '</div>';
    }
    getId('studentDetailContent').innerHTML = html;
  } catch(err) { getId('studentDetailContent').innerHTML = '<p>⚠️ ' + (err.message||'โหลดไม่สำเร็จ') + '</p>'; }
}

// ============================================
// GRADING
// ============================================
async function loadSubmissions() {
  var c = getId('submissionsContainer');
  c.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
  var filter = getId('gradingFilter').value;
  try {
    var r = await apiAdminGetSubmissions(filter);
    if (r.status !== 'success') throw new Error(r.message);
    var subs = r.submissions || [];
    if (subs.length === 0) { c.innerHTML = '<div class="empty-state"><p>📭 ไม่มีงานในหมวดนี้</p></div>'; return; }
    var html = '';
    window.submissionPool = {}; // Clear old pool
    for (var i = 0; i < subs.length; i++) {
      var s = subs[i];
      window.submissionPool[s.score_id] = s;
      var statusClass = s.grading_status === 'pending' ? 'status-pending' : s.grading_status === 'graded' ? 'status-graded' : 'status-auto';
      var statusText = s.grading_status === 'pending' ? '🟡 รอตรวจ' : s.grading_status === 'graded' ? '✅ ตรวจแล้ว' : '🤖 อัตโนมัติ';
      html += '<div class="card submission-card"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--space-sm)">' +
        '<div><strong>' + escapeHtml(s.user_name) + '</strong> — ' + escapeHtml(s.assignment_title) +
        '<br><small style="color:var(--text-secondary)">' + escapeHtml(s.subject_name) + ' • ' + formatDate(s.submitted_at) + '</small></div>' +
        '<div style="text-align:right"><span class="' + statusClass + '" style="font-weight:600">' + statusText + '</span><br>' +
        '<strong>' + s.score + '/' + s.max_score + '</strong></div></div>';

      if (s.grading_status === 'pending' || s.grading_status === 'graded') {
        html += '<div style="margin-top:var(--space-md)"><button class="btn btn-primary btn-sm" onclick="openGradingModalById(\'' + s.score_id + '\')">✏️ ' + (s.grading_status==='pending'?'ตรวจงาน':'ดู/แก้ไข') + '</button></div>';
      }
      html += '</div>';
    }
    c.innerHTML = html;
  } catch(err) { c.innerHTML = '<div class="empty-state"><p>⚠️ ' + (err.message||'โหลดไม่สำเร็จ') + '</p></div>'; }
}

function openGradingModalById(scoreId) {
  var submission = window.submissionPool[scoreId];
  if (!submission) return;
  currentGradingData = submission;
  getId('gradingModalTitle').textContent = '✅ ตรวจ: ' + submission.user_name + ' — ' + submission.assignment_title;
  var qs = submission.questions || [];
  var html = '';
  for (var i = 0; i < qs.length; i++) {
    var q = qs[i];
    var isManual = q.question_type !== 'mcq';
    html += '<div class="card" style="margin-bottom:var(--space-md);border-left:3px solid ' + (isManual ? '#f59e0b' : '#06b6d4') + '">' +
      '<div style="font-size:.8rem;color:var(--text-secondary);margin-bottom:4px">ข้อ ' + (i+1) + ' • ' + (q.question_type==='mcq'?'ปรนัย':q.question_type==='essay'?'อัตนัย':'อัพโหลด') + ' (' + q.max_points + ' คะแนน)</div>' +
      '<div style="margin-bottom:var(--space-sm);font-weight:500">' + escapeHtml(q.question_text) + '</div>';

    if (q.image_url) {
      html += '<div style="margin-bottom:var(--space-sm)"><img src="' + escapeHtml(q.image_url) + '" style="max-width:100%;max-height:200px;border-radius:8px" onerror="this.style.display=\'none\'"></div>';
    }

    // Show answer
    html += '<div style="background:var(--glass-bg);padding:var(--space-sm) var(--space-md);border-radius:8px;margin-bottom:var(--space-sm)">' +
      '<div style="font-size:.8rem;color:var(--text-secondary)">คำตอบ:</div>';
    if (q.question_type === 'mcq') {
      html += '<div>' + escapeHtml(q.user_answer) + (q.correct_answer ? ' (เฉลย: ' + q.correct_answer + ')' : '') + '</div>';
    } else if (q.question_type === 'upload' && q.user_answer && q.user_answer.startsWith('http')) {
      html += '<div><a href="' + escapeHtml(q.user_answer) + '" target="_blank" style="color:var(--primary)">📎 ดูไฟล์</a></div>';
    } else {
      html += '<div style="white-space:pre-wrap">' + escapeHtml(q.user_answer || '(ไม่ได้ตอบ)') + '</div>';
    }
    html += '</div>';

    // Grading inputs for manual questions
    if (isManual) {
      var existingPts = q.feedback ? q.feedback.points : '';
      var existingFb = q.feedback ? q.feedback.feedback : '';
      html += '<div class="grid-2" style="gap:var(--space-sm)">' +
        '<div class="form-group" style="margin-bottom:0"><label class="form-label" style="font-size:.75rem">คะแนน (max ' + q.max_points + ')</label>' +
        '<input class="form-input grade-input" id="grade_' + q.question_id + '" type="number" min="0" max="' + q.max_points + '" step="0.5" value="' + existingPts + '"></div>' +
        '<div class="form-group" style="margin-bottom:0"><label class="form-label" style="font-size:.75rem">Feedback</label>' +
        '<input class="form-input" id="fb_' + q.question_id + '" placeholder="ความคิดเห็น (ไม่บังคับ)" value="' + escapeHtml(existingFb) + '"></div></div>';
    }
    html += '</div>';
  }

  html += '<div style="margin-top:var(--space-lg);text-align:right"><button class="btn btn-primary" onclick="submitGrading()">💾 บันทึกคะแนน</button></div>';
  getId('gradingModalContent').innerHTML = html;
  openModal('gradingModal');
}

async function submitGrading() {
  if (!currentGradingData) return;
  var qs = currentGradingData.questions || [];
  var grades = {};
  for (var i = 0; i < qs.length; i++) {
    var q = qs[i];
    if (q.question_type !== 'mcq') {
      var ptsEl = getId('grade_' + q.question_id);
      var fbEl = getId('fb_' + q.question_id);
      if (!ptsEl || ptsEl.value === '') { showToast('กรุณาให้คะแนนข้อ ' + (i+1),'error'); return; }
      grades[q.question_id] = { points: Number(ptsEl.value), feedback: fbEl ? fbEl.value.trim() : '' };
    }
  }
  try {
    var r = await apiAdminGradeSubmission(currentGradingData.score_id, grades);
    if (r.status === 'success') {
      showToast('ตรวจข้อสอบเรียบร้อย! ✅ (' + r.score + '/' + r.max_score + ')','success');
      closeModal('gradingModal');
      loadSubmissions();
      loadAdminDashboard();
    } else throw new Error(r.message);
  } catch(err) { showToast(err.message||'บันทึกไม่สำเร็จ','error'); }
}

// ============================================
// ALL SCORES
// ============================================
async function loadAllScores() {
  var c = getId('allScoresContainer');
  c.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
  try {
    var r = await apiAdminGetAllScores();
    if (r.status !== 'success') throw new Error(r.message);
    var scores = r.scores || [];
    if (scores.length === 0) { c.innerHTML = '<div class="empty-state"><p>📊 ยังไม่มีคะแนน</p></div>'; return; }
    var html = '<div class="table-container"><table class="table"><thead><tr><th>นักเรียน</th><th>วิชา</th><th>ข้อสอบ</th><th>คะแนน</th><th>%</th><th>เกรด</th><th>สถานะ</th><th>ผ่าน</th></tr></thead><tbody>';
    for (var i = 0; i < scores.length; i++) {
      var s = scores[i];
      var grade = getGrade(s.percentage);
      var passBadge = s.grading_status === 'pending' ? '<span class="pass-badge pass-wait">รอตรวจ</span>'
        : s.passed ? '<span class="pass-badge pass-yes">ผ่าน</span>' : '<span class="pass-badge pass-no">ไม่ผ่าน</span>';
      var statusText = s.grading_status === 'pending' ? '🟡' : s.grading_status === 'graded' ? '✅' : '🤖';
      html += '<tr><td><strong>' + escapeHtml(s.user_name) + '</strong></td><td>' + escapeHtml(s.subject_name) + '</td>' +
        '<td>' + escapeHtml(s.assignment_title) + '</td><td>' + s.score + '/' + s.max_score + '</td>' +
        '<td>' + s.percentage + '%</td><td><span style="color:' + grade.color + ';font-weight:700">' + grade.letter + '</span></td>' +
        '<td>' + statusText + '</td><td>' + passBadge + '</td></tr>';
    }
    html += '</tbody></table></div>';
    c.innerHTML = html;
  } catch(err) { c.innerHTML = '<div class="empty-state"><p>⚠️ ' + (err.message||'โหลดไม่สำเร็จ') + '</p></div>'; }
}
