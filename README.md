# A R Rénovation — site vitrine

Site statique (HTML/CSS/JS, sans build) pour l'entreprise de couverture A R Rénovation.
Direction artistique inspirée du style « midnight gallery » : fond quasi noir, grands titres serif
en graisse légère, tuiles de services colorées, libellés en monospace.

## Fichiers
- `index.html` — contenu de la page
- `styles.css` — design (tokens de couleurs en tête de fichier)
- `script.js` — apparitions au défilement, champ « projet » qui pré-remplit le formulaire, envoi du formulaire par e-mail (mailto)

## Avant la mise en ligne
Cherchez `À REMPLACER` / `À ADAPTER` dans `index.html` :
- numéro de téléphone (`06 00 00 00 00`, en-tête et contact)
- adresse e-mail (`contact@ar-renovation.fr`, aussi dans `data-email` du formulaire)
- zone d'intervention (« Votre ville & ses environs »)
- engagements affichés (garantie décennale, devis gratuit…) à vérifier

## Aperçu local
Ouvrez `index.html` dans un navigateur, ou : `python3 -m http.server` puis http://localhost:8000
