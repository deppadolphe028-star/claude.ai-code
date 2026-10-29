// A R Rénovation — site « Rénovation de l'habitat »

// Menu mobile
const burger = document.querySelector('.burger');
const nav = document.getElementById('nav');
burger.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', open);
});
nav.addEventListener('click', (e) => {
  if (e.target.closest('a')) {
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  }
});

// Ombre de l'en-tête au défilement
const header = document.querySelector('.header');
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Apparition des blocs
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  reveals.forEach((el) => io.observe(el));
} else {
  reveals.forEach((el) => el.classList.add('is-visible'));
}

// Compteurs des chiffres clés
const counters = document.querySelectorAll('[data-count]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if ('IntersectionObserver' in window && !reduceMotion) {
  const co = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.count);
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / 1200, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      co.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach((el) => co.observe(el));
}

// Comparatif avant / après
const compare = document.getElementById('compare');
if (compare) {
  const range = compare.querySelector('input');
  const update = () => compare.style.setProperty('--pos', range.value + '%');
  range.addEventListener('input', update);
  update();
}

// Liens « Demander un devis » : présélection du type de travaux
const projet = document.getElementById('projet');
document.querySelectorAll('[data-projet]').forEach((link) => {
  link.addEventListener('click', () => { projet.value = link.dataset.projet; });
});

// Formulaire : ouvre la messagerie avec la demande rédigée
const form = document.getElementById('form');
const note = document.getElementById('form-note');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(form);
  if (!data.get('nom').trim() || !data.get('telephone').trim() || !data.get('consent')) {
    note.textContent = 'Merci d\'indiquer votre nom, votre téléphone et d\'accepter l\'utilisation de vos informations.';
    note.classList.add('is-error');
    return;
  }
  note.classList.remove('is-error');
  const body = [
    'Nom : ' + data.get('nom'),
    'Téléphone : ' + data.get('telephone'),
    'E-mail : ' + data.get('email'),
    'Ville : ' + data.get('ville'),
    'Type de travaux : ' + data.get('projet'),
    '',
    data.get('message')
  ].join('\n');
  const subject = 'Demande de devis — ' + data.get('projet');
  window.location.href = 'mailto:adolpherudy0@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  note.textContent = 'Votre messagerie s\'ouvre avec votre demande : il ne reste qu\'à l\'envoyer. Vous pouvez aussi nous appeler au 07 82 62 78 56.';
});

// Barre d'action mobile masquée quand le formulaire est visible
const actionbar = document.querySelector('.actionbar');
const contact = document.getElementById('contact');
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    actionbar.classList.toggle('is-hidden', entry.isIntersecting);
  }, { threshold: 0.2 }).observe(contact);
}

document.getElementById('year').textContent = new Date().getFullYear();
