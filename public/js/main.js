// ===========================================
//  NZSEC Website — main.js
// ===========================================

const body = document.body;

/* ---- Language Toggle ---- */
const langBtn = document.getElementById('langToggle');

langBtn.addEventListener('click', () => {
  const current = body.getAttribute('data-lang');
  const next = current === 'en' ? 'zh' : 'en';
  body.setAttribute('data-lang', next);
  updatePlaceholders(next);
});

function updatePlaceholders(lang) {
  document.querySelectorAll('[data-ph-en]').forEach(el => {
    el.placeholder = lang === 'zh'
      ? (el.getAttribute('data-ph-zh') || '')
      : (el.getAttribute('data-ph-en') || '');
  });

  const selectDefault = document.getElementById('selectDefault');
  if (selectDefault) {
    selectDefault.text = lang === 'zh'
      ? (selectDefault.getAttribute('data-ph-zh') || '-- 请选择 --')
      : (selectDefault.getAttribute('data-ph-en') || '-- Please select --');
  }
}

// Initialise placeholders on load
updatePlaceholders(body.getAttribute('data-lang') || 'en');


/* ---- Navbar scroll shadow ---- */
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });


/* ---- Hamburger menu ---- */
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navLinks.classList.toggle('open');
});

// Close menu when a nav link is clicked
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
  });
});


/* ---- Contact form (static demo) ---- */
const form        = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    formSuccess.classList.add('show');
    form.reset();
    updatePlaceholders(body.getAttribute('data-lang') || 'en');
    setTimeout(() => formSuccess.classList.remove('show'), 6000);
  });
}


/* ---- Smooth reveal on scroll (optional enhancement) ---- */
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.card, .advantage, .stat').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });
}
