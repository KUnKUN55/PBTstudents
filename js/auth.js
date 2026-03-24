/* ============================================
   PBTstudents LMS — Auth Management
   ============================================ */

const AUTH_KEY = 'pbt_user';

// ── Login ──
async function login(username, password) {
  const result = await apiLogin(username, password);
  if (result.status === 'success' && result.user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(result.user));
    return result.user;
  }
  throw new Error(result.message || 'Login failed');
}

// ── Logout ──
function logout() {
  localStorage.removeItem(AUTH_KEY);
  apiCache.clear();
  window.location.href = 'index.html';
}

// ── Get Current User ──
function getUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY));
  } catch { return null; }
}

// ── Check if logged in ──
function isLoggedIn() {
  return getUser() !== null;
}

// ── Check if admin ──
function isAdmin() {
  const user = getUser();
  return user && user.role === 'admin';
}

// ── Require Auth — redirect to login if not logged in ──
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// ── Require Admin ──
function requireAdmin() {
  if (!requireAuth()) return false;
  if (!isAdmin()) {
    window.location.href = 'dashboard.html';
    return false;
  }
  return true;
}
