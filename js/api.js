/* ============================================
   PBTstudents LMS — API Client
   ============================================ */

// ⚠️ เปลี่ยน URL นี้เป็น Google Apps Script Web App URL ของคุณ
const API_URL = 'https://script.google.com/macros/s/AKfycbwWUZhm_rPIEIpIijvyFnt_rDt4TMgaRetfNNYmm6DSuygCKBqbqQZ9IcrBJ2jf3U8A/exec';

// ── Cache System ──
const apiCache = {
  data: {},
  set(key, value, ttl = 300000) { // default 5 min
    this.data[key] = { value, expires: Date.now() + ttl };
  },
  get(key) {
    const item = this.data[key];
    if (!item) return null;
    if (Date.now() > item.expires) { delete this.data[key]; return null; }
    return item.value;
  },
  clear() { this.data = {}; },
  remove(key) { delete this.data[key]; }
};

// ── API Call ──
async function apiCall(action, data = {}) {
  const cacheableActions = ['getSubjects', 'getLessons', 'getAssignments', 'getQuestions'];
  const cacheKey = action + JSON.stringify(data);

  if (cacheableActions.includes(action)) {
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;
  }

  const user = getStoredUser();
  if (user) {
    data.user_id = user.user_id;
    data.role = user.role;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action, ...data })
    });

    const result = await response.json();

    if (result.status === 'error') {
      throw new Error(result.message || 'API Error');
    }

    if (cacheableActions.includes(action)) {
      apiCache.set(cacheKey, result);
    }

    return result;

  } catch (error) {
    console.error(`API Error [${action}]:`, error);
    throw error;
  }
}

// ── Helper: Get stored user ──
function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('pbt_user'));
  } catch { return null; }
}

// ============================================
// STUDENT API
// ============================================

async function apiLogin(username, password) {
  return apiCall('login', { username, password });
}

async function apiGetSubjects() {
  return apiCall('getSubjects');
}

async function apiGetLessons(subjectId) {
  return apiCall('getLessons', { subject_id: subjectId });
}

async function apiGetAssignments(subjectId) {
  return apiCall('getAssignments', { subject_id: subjectId });
}

async function apiGetQuestions(assignmentId) {
  return apiCall('getQuestions', { assignment_id: assignmentId });
}

async function apiSubmitQuiz(assignmentId, answers) {
  apiCache.clear();
  return apiCall('submitQuiz', { assignment_id: assignmentId, answers });
}

async function apiGetScores() {
  return apiCall('getScores');
}

async function apiGetDashboard() {
  return apiCall('getDashboard');
}

async function apiGetProgress() {
  return apiCall('getProgress');
}

async function apiMarkLessonComplete(lessonId) {
  apiCache.clear();
  return apiCall('markLessonComplete', { lesson_id: lessonId });
}

async function apiLogAction(actionType, detail) {
  return apiCall('logAction', { action_type: actionType, detail });
}

async function apiGetStudentReport() {
  return apiCall('getStudentReport');
}

async function apiUpdateMyProfile(updates) {
  apiCache.clear();
  return apiCall('updateMyProfile', { updates });
}

// ============================================
// ADMIN API — USER MANAGEMENT
// ============================================

async function apiAdminGetUsers() {
  return apiCall('adminGetUsers');
}

async function apiAdminAddUser(data) {
  apiCache.clear();
  return apiCall('adminAddUser', data);
}

async function apiAdminUpdateUser(targetUserId, updates) {
  apiCache.clear();
  return apiCall('adminUpdateUser', { target_user_id: targetUserId, updates });
}

async function apiAdminDeleteUser(targetUserId) {
  apiCache.clear();
  return apiCall('adminDeleteUser', { target_user_id: targetUserId });
}

async function apiAdminChangePassword(data) {
  return apiCall('adminChangePassword', data);
}

// ============================================
// ADMIN API — CONTENT
// ============================================

async function apiAdminAddSubject(data) {
  apiCache.clear();
  return apiCall('adminAddSubject', data);
}

async function apiAdminAddLesson(data) {
  apiCache.clear();
  return apiCall('adminAddLesson', data);
}

async function apiAdminAddAssignment(data) {
  apiCache.clear();
  return apiCall('adminAddAssignment', data);
}

async function apiAdminAddQuestion(data) {
  apiCache.clear();
  return apiCall('adminAddQuestion', data);
}

async function apiAdminGetAllScores() {
  return apiCall('adminGetAllScores');
}

async function apiAdminUpdateItem(data) {
  apiCache.clear();
  return apiCall('adminUpdateItem', data);
}

async function apiAdminDeleteItem(data) {
  apiCache.clear();
  return apiCall('adminDeleteItem', data);
}

// ============================================
// ADMIN API — GRADING
// ============================================

async function apiAdminGetSubmissions(filterStatus, filterAssignment) {
  return apiCall('adminGetSubmissions', {
    filter_status: filterStatus || 'all',
    filter_assignment: filterAssignment || ''
  });
}

async function apiAdminGradeSubmission(scoreId, grades) {
  apiCache.clear();
  return apiCall('adminGradeSubmission', { score_id: scoreId, grades });
}

async function apiAdminAdjustScore(scoreId, newScore, reason, isPassedOverride) {
  apiCache.clear();
  return apiCall('adminAdjustScore', { 
    score_id: scoreId, 
    new_score: newScore, 
    reason: reason,
    is_passed_override: isPassedOverride 
  });
}

// ============================================
// ADMIN API — ANALYTICS
// ============================================

async function apiAdminGetStudentDetail(targetUserId) {
  return apiCall('adminGetStudentDetail', { target_user_id: targetUserId });
}

async function apiAdminGetDashboard() {
  return apiCall('adminGetDashboard');
}
