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
