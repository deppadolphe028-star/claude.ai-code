// A R Rénovation — interactions

// Ouvre le formulaire de devis, pré-rempli quand le visiteur a déjà décrit son besoin
const contact = document.getElementById('contact');
const message = document.getElementById('f-msg');
const travaux = document.getElementById('f-type');
function openDevis({ type, text } = {}) {
  if (type) travaux.value = type;
  if (text) message.value = text;
  contact.scrollIntoView();
  document.getElementById(text ? 'f-nom' : 'f-msg').focus({ preventScroll: true });
}

// Le champ du hero
document.getElementById('ask').addEventListener('submit', (event) => {
  event.preventDefault();
  openDevis({ text: document.getElementById('ask-input').value.trim() });
});

// Chaque service mène à un devis avec le bon type de travaux
document.querySelectorAll('.tile__cta').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    openDevis({ type: link.dataset.travaux });
  });
});

// Menu mobile
const nav = document.querySelector('.nav');
const menuButton = document.querySelector('.nav__menu');
const menu = document.getElementById('menu');
function setMenu(open) {
  menu.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  nav.classList.toggle('is-open', open);
}
menuButton.addEventListener('click', () => setMenu(menu.hidden));
menu.addEventListener('click', (event) => {
  if (event.target.closest('a')) setMenu(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !menu.hidden) {
    setMenu(false);
    menuButton.focus();
  }
});

// Barre d'action mobile : masquée quand le formulaire est à l'écran
const actionbar = document.getElementById('actionbar');
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    actionbar.classList.toggle('is-hidden', entry.isIntersecting);
  }, { threshold: 0.15 }).observe(contact);
}

// Diagnostic express : un premier avis selon ce que le visiteur constate
const SYMPTOMS = {
  fuite: { label: 'Fuite ou tache au plafond', advice: 'Recherche de fuite et réparation', part: 'Couverture', type: 'Fuite', score: 90 },
  tempete: { label: 'Dégâts après une tempête', advice: 'Mise hors d’eau, puis réparation', part: 'Couverture', type: 'Fuite', score: 96 },
  casse: { label: 'Tuiles ou ardoises cassées', advice: 'Remplacement des éléments abîmés', part: 'Couverture', type: 'Couverture', score: 72 },
  gouttiere: { label: 'Gouttière qui déborde', advice: 'Nettoyage ou remplacement des gouttières', part: 'Zinguerie', type: 'Zinguerie', score: 58 },
  mousse: { label: 'Mousse ou lichen', advice: 'Démoussage et traitement hydrofuge', part: 'Entretien', type: 'Démoussage', score: 40 },
  froid: { label: 'Pièces froides sous le toit', advice: 'Isolation des combles', part: 'Isolation', type: 'Isolation', score: 48 },
  age: { label: 'Toiture de plus de 30 ans', advice: 'Bilan complet, réfection à étudier', part: 'Couverture', type: 'Couverture', score: 62 },
};
const LEVELS = [
  { min: 85, cls: 'is-urgent', pill: 'Urgent', title: 'Intervention rapide conseillée' },
  { min: 55, cls: 'is-soon', pill: 'À prévoir', title: 'Travaux à prévoir' },
  { min: 0, cls: 'is-watch', pill: 'À surveiller', title: 'Entretien conseillé' },
];
const symptomButtons = Array.from(document.querySelectorAll('.symptom'));
const diagTitle = document.getElementById('diag-title');
const diagLevel = document.getElementById('diag-level');
const diagList = document.getElementById('diag-list');
const diagCall = document.getElementById('diag-call');
const emptyDiagnostic = diagList.innerHTML;

const pickedSymptoms = () => symptomButtons
  .filter((button) => button.getAttribute('aria-pressed') === 'true')
  .map((button) => SYMPTOMS[button.dataset.symptom])
  .sort((a, b) => b.score - a.score);

function renderDiagnostic() {
  const picked = pickedSymptoms();
  if (!picked.length) {
    diagTitle.textContent = 'Touchez ce que vous voyez sur votre toit';
    diagLevel.hidden = true;
    diagCall.hidden = true;
    diagList.innerHTML = emptyDiagnostic;
    return;
  }
  const level = LEVELS.find((l) => picked[0].score >= l.min);
  diagTitle.textContent = level.title;
  diagLevel.className = `phone__pill ${level.cls}`;
  diagLevel.textContent = level.pill;
  diagLevel.hidden = false;
  diagCall.hidden = level.cls !== 'is-urgent';
  diagList.replaceChildren(...picked.map((symptom) => {
    const item = document.createElement('li');
    item.innerHTML = '<span></span><span class="bar"><i></i></span><span class="mono"></span>';
    item.children[0].textContent = symptom.advice;
    item.children[2].textContent = symptom.part;
    return item;
  }));
  void diagList.offsetWidth;   // les barres partent de zéro et s'allongent
  diagList.querySelectorAll('.bar i').forEach((bar, i) => { bar.style.width = `${picked[i].score}%`; });
}
symptomButtons.forEach((button) => {
  button.addEventListener('click', () => {
    button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
    renderDiagnostic();
  });
});
document.getElementById('diag-cta').addEventListener('click', (event) => {
  event.preventDefault();
  const picked = pickedSymptoms();
  if (!picked.length) {
    openDevis();
    return;
  }
  openDevis({
    type: picked[0].type,
    text: `Diagnostic express — je constate : ${picked.map((s) => s.label.toLowerCase()).join(', ')}.\n`
      + `Premier avis : ${picked.map((s) => s.advice.toLowerCase()).join(', ')}.`,
  });
});

// Le formulaire ouvre la messagerie avec la demande déjà rédigée
const form = document.getElementById('devis');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const subject = `Demande de devis — ${data.get('travaux')}`;
  const body = [
    `Nom : ${data.get('nom')}`,
    `Téléphone : ${data.get('telephone')}`,
    `E-mail : ${data.get('email')}`,
    `Ville : ${data.get('ville')}`,
    `Travaux : ${data.get('travaux')}`,
    '',
    data.get('message'),
  ].join('\n');
  window.location.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  document.getElementById('form-note').textContent = 'Merci, votre messagerie va s’ouvrir.';
});

document.getElementById('year').textContent = new Date().getFullYear();

// Nuages : chaque forme est dessinée une fois dans un canvas, à partir d'une graine
document.querySelectorAll('.cloud').forEach((el) => {
  let seed = Number(el.dataset.seed) || 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const w = 640;
  const h = 280;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const base = h * 0.78;
  const puffs = Array.from({ length: 30 }, () => {
    const t = rand();
    const bump = Math.sin(Math.PI * t);
    const r = h * (0.09 + 0.2 * bump + 0.06 * rand());
    return { x: w * (0.08 + 0.84 * t), y: base - r * (0.25 + 0.8 * bump * rand()), r };
  });
  const puff = (x, y, r, inner, outer) => {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.6, inner);
    gradient.addColorStop(1, outer);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  // Dessous ombré, puis corps blanc éclairé par le haut
  puffs.forEach(({ x, y, r }) => puff(x, y + r * 0.3, r, 'rgba(168,190,218,0.6)', 'rgba(168,190,218,0)'));
  puffs.forEach(({ x, y, r }) => puff(x - r * 0.12, y - r * 0.18, r * 0.92, 'rgba(255,255,255,0.96)', 'rgba(255,255,255,0)'));
  // Base aplatie et estompée
  ctx.globalCompositeOperation = 'destination-out';
  const fade = ctx.createLinearGradient(0, base - h * 0.04, 0, base + h * 0.12);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, base - h * 0.04, w, h);
  el.appendChild(canvas);
});
