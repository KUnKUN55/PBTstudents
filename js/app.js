/* ============================================
   PBTstudents LMS — Shared Utilities
   ============================================ */

// ── Toast Notifications ──
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

// ── Loading Spinner ──
function showLoading() {
  if (document.querySelector('.spinner-overlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'spinner-overlay';
  overlay.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(overlay);
}

function hideLoading() {
  const overlay = document.querySelector('.spinner-overlay');
  if (overlay) overlay.remove();
}

// ── Date Formatting ──
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'เมื่อสักครู่';
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} วันที่แล้ว`;
  return formatDate(dateStr);
}

// ── DOM Helpers ──
function $(selector) { return document.querySelector(selector); }
function $$(selector) { return document.querySelectorAll(selector); }

function createElement(tag, className, html) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (html) el.innerHTML = html;
  return el;
}

// ── URL Params ──
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// ── File Type Icons ──
function getFileIcon(type) {
  const icons = {
    'pdf': '📄',
    'video': '🎬',
    'link': '🔗',
    'doc': '📝',
    'ppt': '📊',
    'image': '🖼️'
  };
  return icons[type] || '📎';
}

function getFileIconBg(type) {
  const colors = {
    'pdf': 'rgba(239,68,68,0.15)',
    'video': 'rgba(139,92,246,0.15)',
    'link': 'rgba(59,130,246,0.15)',
    'doc': 'rgba(59,130,246,0.15)',
    'ppt': 'rgba(245,158,11,0.15)',
    'image': 'rgba(16,185,129,0.15)'
  };
  return colors[type] || 'rgba(148,163,184,0.15)';
}

// ── Navbar Renderer ──
function renderNavbar() {
  const user = getUser();
  if (!user) return;

  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
  const isAdminUser = user.role === 'admin';
  const avatarColor = user.avatar_color || '#3b82f6';
  const initials = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  const nav = createElement('nav', 'navbar', `
    <a href="dashboard.html" class="navbar-brand" style="gap:var(--space-sm)">
      <img src="https://img1.pic.in.th/images/Polished-Sci-Spark-Logo-with-Subtle-Highlights1.png" alt="Sci-Spark" style="height:42px; width:auto; border-radius:4px" />
    </a>
    <ul class="navbar-nav">
      <li><a href="dashboard.html" class="${currentPage === 'dashboard.html' ? 'active' : ''}">🏠 แดชบอร์ด</a></li>
      ${isAdminUser ? `<li><a href="admin.html" class="${currentPage === 'admin.html' ? 'active' : ''}">⚙️ จัดการระบบ</a></li>` : ''}
    </ul>
    <div class="navbar-user">
      <div class="avatar" style="background:${avatarColor}">${initials}</div>
      <span style="font-size:0.9rem;color:var(--text-secondary)">${user.name}</span>
      <button class="btn-logout" onclick="logout()">ออกจากระบบ</button>
    </div>
  `);

  const container = $('.app-container');
  if (container) container.prepend(nav);
}

// ── Tab System ──
function initTabs() {
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabGroup = btn.closest('.tabs');
      const target = btn.dataset.tab;

      // Deactivate siblings
      tabGroup.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Show target content
      const parent = tabGroup.parentElement;
      parent.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
      const targetEl = parent.querySelector(`#${target}`);
      if (targetEl) targetEl.classList.add('active');
    });
  });
}

// ── Subject Color Helper ──
function getSubjectColor(index) {
  const colors = ['#10b981', '#8b5cf6', '#3b82f6', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444'];
  return colors[index % colors.length];
}

function getSubjectIcon(name) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('bio') || lower.includes('ชีว')) return '🧬';
  if (lower.includes('chem') || lower.includes('เคมี')) return '⚗️';
  if (lower.includes('phys') || lower.includes('ฟิสิกส์')) return '⚛️';
  if (lower.includes('math') || lower.includes('คณิต')) return '📐';
  if (lower.includes('eng') || lower.includes('อังกฤษ')) return '📖';
  if (lower.includes('thai') || lower.includes('ไทย')) return '📜';
  if (lower.includes('com') || lower.includes('คอม')) return '💻';
  return '📚';
}

// ── Animate Numbers ──
function animateNumber(element, target, duration = 1000) {
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    const current = Math.round(start + (target - start) * eased);
    element.textContent = current;
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}
