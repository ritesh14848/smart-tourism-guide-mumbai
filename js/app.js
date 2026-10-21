/**
 * Global App Script
 * Initializes shared navbar, mobile drawer, toast engine, and trip state badges
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initTripBadge();
});

function initNavbar() {
  const toggleBtn = document.querySelector('.mobile-nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      navLinks.classList.toggle('show');
      const icon = toggleBtn.querySelector('i');
      if (icon) {
        if (navLinks.classList.contains('show')) {
          icon.classList.remove('fa-bars');
          icon.classList.add('fa-xmark');
        } else {
          icon.classList.remove('fa-xmark');
          icon.classList.add('fa-bars');
        }
      }
    });
  }

  // Highlight current active link
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const links = document.querySelectorAll('.nav-link');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

function initTripBadge() {
  const tripStatus = localStorage.getItem('stg_mumbai_trip_status');
  const badgeContainer = document.getElementById('nav-trip-status');
  if (!badgeContainer) return;

  if (tripStatus === 'in_progress') {
    badgeContainer.innerHTML = `
      <a href="itinerary.html" class="badge badge-success" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">
        <i class="fa-solid fa-circle-dot fa-fade"></i> Trip in Progress
      </a>
    `;
  }
}

// Global Toast Notification Engine
function showToast(message, type = 'info', duration = 4000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'fa-circle-info';
  if (type === 'danger') icon = 'fa-circle-exclamation';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'warning') icon = 'fa-triangle-exclamation';

  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.6rem;">
      <i class="fa-solid ${icon}"></i>
      <span style="font-size: 0.9rem; font-weight: 500;">${message}</span>
    </div>
    <button style="background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 1rem;" onclick="this.parentElement.remove()">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

// Currency Formatter Utility
function formatINR(val) {
  return '₹' + Number(val || 0).toLocaleString('en-IN');
}
