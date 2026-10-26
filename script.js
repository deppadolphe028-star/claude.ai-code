// A R Rénovation — interactions légères
document.documentElement.classList.add('js');

// Apparition des blocs au défilement
const revealed = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealed.forEach((el) => observer.observe(el));
} else {
  revealed.forEach((el) => el.classList.add('is-visible'));
}

// Le champ du hero pré-remplit le formulaire de contact
const promptForm = document.getElementById('prompt-form');
const message = document.getElementById('message');
promptForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = document.getElementById('prompt-input').value.trim();
  if (text) message.value = text;
  document.getElementById('contact').scrollIntoView();
  message.focus({ preventScroll: true });
});

// Formulaire de contact : ouvre la messagerie avec la demande pré-rédigée
const contactForm = document.getElementById('contact-form');
contactForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(contactForm);
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
  window.location.href = `mailto:${contactForm.dataset.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  document.getElementById('form-note').textContent = 'Merci ! Votre messagerie va s’ouvrir.';
});

document.getElementById('year').textContent = new Date().getFullYear();
