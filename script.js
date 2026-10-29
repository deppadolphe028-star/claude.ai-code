// A R Rénovation — interactions

const contact = document.getElementById('contact');
const message = document.getElementById('f-msg');
const travaux = document.getElementById('f-type');

// Le message proposé s'adapte au type de travaux choisi (toiture ou nettoyage)
const HINTS = {
  Toiture: message.placeholder,
  Nettoyage: 'Décrivez ce qu’il faut nettoyer : surface, superficie approximative, accès. Vous pourrez joindre des photos à l’e-mail.',
};
function updateHint() {
  const option = travaux.selectedOptions[0];
  message.placeholder = (option && HINTS[option.parentElement.label])
    || 'Décrivez votre demande. Vous pourrez joindre des photos à l’e-mail.';
}
travaux.addEventListener('change', updateHint);

// Ouvre le formulaire de devis, pré-rempli quand le visiteur a déjà décrit son besoin
function openDevis({ type, text } = {}) {
  showSend(false);
  if (type) {
    travaux.value = type;
    updateHint();
  }
  if (text) message.value = text;
  contact.scrollIntoView();
  document.getElementById(text ? 'f-nom' : 'f-msg').focus({ preventScroll: true });
}

// Chaque service mène à un devis avec le bon type de travaux
document.querySelectorAll('.js-devis').forEach((link) => {
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

// Curseurs : la partie parcourue est colorée (--val)
function paintRange(input) {
  input.style.setProperty('--val', `${((input.value - input.min) / (input.max - input.min)) * 100}%`);
}
document.querySelectorAll('.range input').forEach((input) => {
  paintRange(input);
  input.addEventListener('input', () => paintRange(input));
});

// Maquette de la toiture : la couverture choisie a sa description, reprise par la couche 4
const coverCards = Array.from(document.querySelectorAll('.cover-card'));
const coverStep = document.querySelector('[data-cover-step]');
coverCards.forEach((card) => {
  card.addEventListener('click', () => {
    coverCards.forEach((other) => other.setAttribute('aria-pressed', String(other === card)));
    document.getElementById('cover-kind').textContent = card.dataset.kind;
    document.getElementById('cover-title').textContent = card.dataset.title;
    document.getElementById('cover-text').textContent = card.dataset.text;
    document.getElementById('cover-fix').textContent = card.dataset.fix;
    document.getElementById('cover-ridge').textContent = card.dataset.ridge;
    coverStep.dataset.title = card.dataset.title;
    coverStep.dataset.text = card.dataset.text;
    if (shownStep === 4) showStep(4);
  });
});

// Les couches : un clic, ou la maquette 3D qui avance, affiche la description de la couche
const layerButtons = Array.from(document.querySelectorAll('.couches button'));
const layerNum = document.getElementById('couche-num');
const layerTitle = document.getElementById('couche-title');
const layerText = document.getElementById('couche-text');
let shownStep = -1;
function showStep(step) {
  shownStep = step;
  layerButtons.forEach((button) => {
    const n = +button.dataset.step;
    button.classList.toggle('is-done', n <= step);
    if (n === step) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  if (step === 0) {
    layerNum.textContent = 'Vue éclatée';
    layerTitle.textContent = 'Les cinq couches d’une toiture.';
    layerText.textContent = 'Faites glisser le curseur ou touchez une couche pour la poser.';
    return;
  }
  const button = layerButtons[step - 1];
  layerNum.textContent = `Couche ${step} sur 5`;
  layerTitle.textContent = `${button.dataset.title}.`;
  layerText.textContent = button.dataset.text;
}
layerButtons.forEach((button) => button.addEventListener('click', () => showStep(+button.dataset.step)));
document.getElementById('maquette').addEventListener('couche', (event) => showStep(event.detail));

// Simulation du démoussage : une seule couverture à la fois
const cleanPills = Array.from(document.querySelectorAll('.clean-pill'));
cleanPills.forEach((pill) => {
  pill.addEventListener('click', () => {
    cleanPills.forEach((other) => other.setAttribute('aria-pressed', String(other === pill)));
  });
});

// Réalisations : chaque photo apparaît dès qu'elle est chargée
document.querySelectorAll('.photo img').forEach((img) => {
  const show = () => img.closest('.photo').classList.add('is-loaded');
  if (img.complete && img.naturalWidth) show();
  else img.addEventListener('load', show);
});

// Comparatif avant / après
const compare = document.getElementById('compare');
const compareRange = document.getElementById('compare-range');
compareRange.addEventListener('input', () => compare.style.setProperty('--pos', `${compareRange.value}%`));

// Diagnostic express : ce que le visiteur constate rédige sa demande de diagnostic
const SYMPTOMS = {
  fuite: { label: 'Fuite ou tache au plafond', advice: 'Recherche de fuite et réparation', type: 'Fuite', score: 90 },
  tempete: { label: 'Dégâts après une tempête', advice: 'Mise hors d’eau, puis réparation', type: 'Fuite', score: 96 },
  casse: { label: 'Tuiles ou ardoises cassées', advice: 'Remplacement des éléments abîmés', type: 'Couverture', score: 72 },
  gouttiere: { label: 'Gouttière qui déborde', advice: 'Nettoyage ou remplacement des gouttières', type: 'Zinguerie', score: 58 },
  mousse: { label: 'Mousse ou lichen', advice: 'Démoussage et traitement hydrofuge', type: 'Démoussage', score: 40 },
  froid: { label: 'Pièces froides sous le toit', advice: 'Isolation des combles', type: 'Isolation', score: 48 },
  age: { label: 'Toiture de plus de 30 ans', advice: 'Bilan complet, réfection à étudier', type: 'Couverture', score: 62 },
};
const symptomButtons = Array.from(document.querySelectorAll('.symptom'));

// Le plus grave d'abord : il donne le type de travaux de la demande
const pickedSymptoms = () => symptomButtons
  .filter((button) => button.getAttribute('aria-pressed') === 'true')
  .map((button) => SYMPTOMS[button.dataset.symptom])
  .sort((a, b) => b.score - a.score);

symptomButtons.forEach((button) => {
  button.addEventListener('click', () => {
    button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
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
      + `Travaux probables : ${picked.map((s) => s.advice.toLowerCase()).join(', ')}.`,
  });
});

// Envoi de la demande : rien n'est stocké par le site. La demande est rédigée ici,
// puis le visiteur l'envoie lui-même, par e-mail ou par WhatsApp.
const EMAIL = 'adolpherudy0@gmail.com';
const WHATSAPP = '33782627856';
const form = document.getElementById('devis');
const submitButton = document.getElementById('devis-submit');
const send = document.getElementById('send');

function showSend(open) {
  send.hidden = !open;
  submitButton.hidden = open;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const field = (name) => String(data.get(name) || '').trim();
  const subject = `Demande de devis — ${field('travaux')}`;
  const lines = [`Nom : ${field('nom')}`, `Téléphone : ${field('telephone')}`];
  if (field('email')) lines.push(`E-mail : ${field('email')}`);
  if (field('ville')) lines.push(`Ville : ${field('ville')}`);
  lines.push(`Travaux : ${field('travaux')}`, '', field('message'));
  const body = lines.join('\n');
  document.getElementById('send-mail').href =
    `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  document.getElementById('send-wa').href =
    `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`${subject}\n\n${body}`)}`;
  showSend(true);
  document.getElementById('send-title').focus();
});

// Si la demande change, elle doit être préparée à nouveau
form.addEventListener('input', () => {
  if (!send.hidden) showSend(false);
});
document.getElementById('send-edit').addEventListener('click', () => {
  showSend(false);
  document.getElementById('f-msg').focus();
});

document.getElementById('year').textContent = new Date().getFullYear();
