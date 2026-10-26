# A R Rénovation — site vitrine

Site statique (HTML/CSS/JS, sans build) pour l'entreprise de couverture A R Rénovation.
Design calqué sur la référence de style « Origin Financial » (midnight gallery) : mêmes couleurs,
fond quasi noir, ciel en dégradé dans le hero, grands titres serif en graisse légère avec un mot en italique,
six tuiles de services colorées, carte argentée inversée, module téléphone, libellés en monospace.

## Animations 3D
- **Accueil** : une maison en 3D dont les tuiles se posent rang par rang, du bas vers le haut,
  puis qui tourne lentement (on peut la faire pivoter en la faisant glisser).
- **Anatomie d'une toiture** : en faisant défiler la page, la toiture se monte couche par couche
  (charpente, isolation, écran sous-toiture, couverture, zinguerie, entretien). Chaque couche
  s'allume dans la couleur du service correspondant pendant sa pose.

La 3D utilise Three.js r128, chargé depuis cdnjs. Si WebGL ou la bibliothèque ne sont pas
disponibles, la page reste complète (accueil centré, étapes en liste). Avec l'option
« réduire les animations » du système, la maison s'affiche directement terminée.

## Fichiers
- `index.html` — contenu de la page
- `styles.css` — design (tokens de couleurs en tête de fichier)
- `roof3d.js` — les deux scènes 3D (maison du hero, anatomie de la toiture)
- `script.js` — champ du hero qui pré-remplit le formulaire, envoi du formulaire par e-mail (mailto)

## Avant la mise en ligne
Cherchez `À REMPLACER` / `À VÉRIFIER` dans `index.html` :
- numéro de téléphone (`06 00 00 00 00`, en-tête et contact)
- adresse e-mail (`contact@ar-renovation.fr`, aussi dans `data-email` du formulaire)
- zone d'intervention (« Votre ville & ses environs »)
- engagements affichés (garantie décennale, devis gratuit, chantier nettoyé) à vérifier

## Aperçu local
Ouvrez `index.html` dans un navigateur, ou : `python3 -m http.server` puis http://localhost:8000
