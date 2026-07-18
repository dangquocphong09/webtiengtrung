/**
 * Utils - Các hàm tiện ích dùng chung
 * Toast notification, loading, format, DOM helpers
 */

// ── Toast Notification ──

/**
 * Hiển thị toast notification
 * @param {string} message - Nội dung
 * @param {'success'|'error'|'info'} type - Loại toast
 * @param {number} duration - Thời gian hiển thị (ms)
 */
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('toast--show'));

  // Tự xóa sau duration
  setTimeout(() => {
    toast.classList.remove('toast--show');
    toast.addEventListener('transitionend', () => toast.remove());
  }, duration);
}

// ── Loading ──

function showLoading() {
  const el = document.getElementById('loading');
  if (el) el.classList.add('loading--visible');
}

function hideLoading() {
  const el = document.getElementById('loading');
  if (el) el.classList.remove('loading--visible');
}

// ── Date Helpers ──

/**
 * Lấy ngày hôm nay dạng YYYY-MM-DD
 */
function getToday() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Tính ngày tiếp theo dựa trên khoảng cách ôn tập
 * @param {number} level - Level hiện tại
 * @returns {string} Ngày tiếp theo dạng YYYY-MM-DD
 */
function getNextReviewDate(level) {
  const days = CONFIG.REVIEW_INTERVALS[level] || CONFIG.REVIEW_INTERVALS.default;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Tính ngày mai
 */
function getTomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
}

/**
 * Format ngày đẹp hơn: 12/07/2026
 */
function formatDate(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN');
}

// ── DOM Helpers ──

/**
 * Lấy element theo selector
 */
function $(selector) {
  return document.querySelector(selector);
}

/**
 * Lấy nhiều elements
 */
function $$(selector) {
  return document.querySelectorAll(selector);
}

/**
 * Tạo element HTML từ template string
 */
function createElement(html) {
  const div = document.createElement('div');
  div.innerHTML = html.trim();
  return div.firstChild;
}

/**
 * Throttle: giới hạn tần suất gọi function
 */
function throttle(fn, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}

/**
 * Confirm dialog tùy chỉnh
 */
function confirmDialog(message) {
  return window.confirm(message);
}
