# A R Rénovation — site vitrine

Site statique (HTML/CSS/JS, sans build) pour l'entreprise de couverture A R Rénovation.
Design calqué sur la référence de style « Origin Financial » (midnight gallery) : mêmes couleurs,
fond quasi noir, ciel en dégradé dans le hero, grands titres serif en graisse légère avec un mot en italique,
six tuiles de services colorées, carte argentée inversée, module téléphone, libellés en monospace.

## Animations 3D
Une maison en ardoise sur un îlot de pelouse, sous un ciel bleu avec des nuages, avec les vraies couleurs
des matériaux : charpente en bois (sablières, pannes, faîtière, chevrons, chevêtre autour de la cheminée),
laine de verre jaune entre les chevrons, écran sous-toiture et contre-liteaux, liteaux, ardoises fixées au
crochet inox, tuiles faîtières en terre cuite scellées au mortier, gouttières demi-rondes en zinc et leurs
crochets, descentes, bandes de rive, abergement et souche de cheminée en brique.

- **Accueil** : les ardoises se posent rang par rang, du bas vers le haut, puis la maison tourne
  lentement (on peut la faire pivoter en la faisant glisser).
- **Anatomie d'une toiture** : en faisant défiler la page, la toiture se monte couche par couche
  (charpente, isolation, écran sous-toiture, couverture, zinguerie, entretien), avec un gros plan
  sur les ardoises et leurs crochets pendant la pose de la couverture.

La 3D utilise Three.js r128, chargé depuis cdnjs. Si WebGL ou la bibliothèque ne sont pas
disponibles, la page reste complète (accueil centré, étapes en liste). Avec l'option
« réduire les animations » du système, la maison s'affiche directement terminée et les nuages restent immobiles.

## Fichiers
- `index.html` — contenu de la page
- `styles.css` — design (tokens de couleurs en tête de fichier)
- `roof3d.js` — les deux scènes 3D (maison du hero, anatomie de la toiture)
- `script.js` — champ du hero qui pré-remplit le formulaire, envoi du formulaire par e-mail (mailto), dessin des nuages

## Avant la mise en ligne
Cherchez `À REMPLACER` / `À VÉRIFIER` dans `index.html` :
- numéro de téléphone (`06 00 00 00 00`, en-tête et contact)
- adresse e-mail (`contact@ar-renovation.fr`, aussi dans `data-email` du formulaire)
- zone d'intervention (« Votre ville & ses environs »)
- engagements affichés (garantie décennale, devis gratuit, chantier nettoyé) à vérifier

## Aperçu local
Ouvrez `index.html` dans un navigateur, ou : `python3 -m http.server` puis http://localhost:8000
