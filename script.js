// A R Rénovation — interactions

// Le champ du hero pré-remplit la demande de devis
const ask = document.getElementById('ask');
const message = document.getElementById('f-msg');
ask.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = document.getElementById('ask-input').value.trim();
  if (text) message.value = text;
  document.getElementById('contact').scrollIntoView();
  message.focus({ preventScroll: true });
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
