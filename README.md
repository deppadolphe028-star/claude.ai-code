# A R Rénovation — site vitrine

Site statique (HTML/CSS/JS, sans build) pour A R Rénovation, couvreur dans le Morbihan, qui fait
aussi du nettoyage (dallages, terrasses, maisons, locaux professionnels).

## Le style
Anthracite et panneaux crème, avec un accent sable sur les boutons et les bandeaux. Les titres sont
en capitales étroites et grasses (Oswald), suivis d'une ligne en italique élégant (Cormorant
Garamond) ; le texte est en Inter. Les sections sont numérotées (« 01 / Toiture », « 02 / Entretien »…)
avec de petites étiquettes en capitales espacées. La photo d'ardoises de l'accueil vient d'un de vos
chantiers (`realisations/fond-accueil.jpg`, recadrée depuis `apres.jpg`).

Les polices sont hébergées avec le site (`fonts/`, licence SIL Open Font License) : aucune requête vers
Google Fonts ou un autre service.

## La page d'accueil
1. **Accueil** : titre, photo d'ardoises assombrie, maison 3D dont l'ardoise se pose rang par rang,
   boutons « Voir la toiture en 3D » et « Demander un devis », appel d'urgence.
2. **Bandeau défilant** : couverture, zinguerie, charpente, isolation, démoussage, nettoyage.
3. **Services** : six services numérotés, chacun avec son devis pré-rempli.
4. **01 / Toiture** : maquette 3D sur fond crème. On choisit la couverture (ardoise, tuile plate,
   tuile romane, bac acier) avec ses échantillons, puis on monte la toiture : « Vue éclatée » ou
   « Toit complet », bouton « Lecture », curseur des couches et boutons 1 à 5 (charpente, isolation,
   écran, couverture, zinguerie). La description de la couche s'affiche dessous, et une fiche
   donne la pente de la maquette, la fixation et le faîtage de la couverture choisie.
5. **02 / Entretien et nettoyage** : simulation 3D du démoussage. On choisit la couverture, puis le
   curseur (ou « Voir le démoussage ») nettoie la toiture du faîtage vers la gouttière, suivi du
   traitement hydrofuge. Puis la méthode en trois temps et les quatre prestations de nettoyage.
6. **03 / Réalisations** : comparatif avant / après à faire glisser et photo de chantier.
7. **04 / Diagnostic express** : le visiteur touche ce qu'il constate, sa demande se rédige toute seule.
8. **05 / Comment ça se passe**, **questions fréquentes**, bandeau « Parlons de votre projet ».
9. **Contact** : téléphone, WhatsApp, e-mail, secteur (tout le Morbihan), encadré urgence et
   formulaire. Le formulaire prépare la demande ; le visiteur l'envoie lui-même par e-mail ou par
   WhatsApp (le site n'enregistre rien).

Sur mobile : menu plein écran, barre fixe « Appeler / Devis gratuit » en bas de l'écran (masquée
quand le formulaire est affiché). La page y est resserrée (environ 11 écrans de haut) : services et
prestations de nettoyage en cartes à faire glisser au doigt, couvertures de la maquette sur une ligne,
étapes en liste compacte, encadré urgence sur une ligne, formulaire sur deux colonnes.

Autres pages : `tarifs.html` (barème des prix, obligatoire pour les dépannages et l'entretien de
toiture) et `mentions-legales.html` (mentions, assurance, médiation, données personnelles).

## La 3D
Une maison sur un îlot de pelouse, avec les vraies couleurs des matériaux : charpente en bois,
laine de verre entre les chevrons, écran sous-toiture et contre-liteaux, liteaux, ardoises au
crochet inox, tuiles faîtières scellées au mortier, gouttières en zinc, descentes, souche de
cheminée en brique. Rendu réaliste : lumière de plein jour, ombres douces, tons filmiques, et des
matières en relief calculées dans `textures/` (ardoise, terre cuite, bois, laine de verre, écran,
brique, crépi, dalles, planches, gazon, terre).

Trois scènes, construites seulement à l'approche de leur section : la maison de l'accueil (on la
fait tourner en la faisant glisser), la maquette de la toiture et la simulation du démoussage. Si
l'appareil peine (moins de 26 images par seconde), la 3D baisse d'elle-même sa définition. Avec
l'option « réduire les animations » du système, la maquette s'affiche directement montée et le
bandeau ne défile pas.

Three.js r128 est chargé depuis cdnjs. Sans WebGL ou sans la bibliothèque, la page reste complète :
les couvertures, les couches et leurs descriptions restent consultables, sans les maquettes.

Les matières (environ 1,5 Mo d'images WebP) sont calculées par `textures/generer.py` (Python avec
numpy et Pillow, sans aucune image extérieure). La page ouverte directement depuis le disque
(`file://`) utilise des matières plus simples, dessinées par le navigateur : pour voir le rendu
réaliste en local, passer par `python3 -m http.server`.

## Ajouter vos photos de chantiers
Mettez la photo dans `realisations/`, puis dans `index.html`, section « Réalisations », copiez un
bloc `<figure class="work">` et changez le nom du fichier, le texte de remplacement et la légende.
Le détail est dans `realisations/LISEZMOI.txt`.

## Ajouter vos avis clients
La section « Avis clients » est en place mais masquée tant qu'il n'y a pas de vrais avis. Uniquement
de vrais avis, recopiés mot pour mot : inventer ou modifier un avis est interdit. Dans `index.html`,
pour chaque carte : le texte, le prénom et l'initiale, la ville, le mois et l'année, la note dans
`--note`, puis retirer la classe `is-empty`. Enfin, retirer `hidden` de la section, ajouter un lien
« Avis » dans les menus et mettre les liens de la fiche Google sur les deux boutons du bas.

## Fichiers
- `index.html`, `tarifs.html`, `mentions-legales.html` — les pages
- `styles.css` — le design, commun aux trois pages (couleurs en tête de fichier)
- `roof3d.js` — les trois scènes 3D
- `script.js` — devis pré-remplis, maquette (couvertures, couches), diagnostic, formulaire, menu mobile
- `fonts/` — les polices et leurs licences
- `textures/` — les matières de la 3D, et `generer.py` qui les calcule
- `realisations/` — vos photos de chantiers
- `og-image.jpg` — image d'aperçu pour le partage du lien

## Avant la mise en ligne
Cherchez `À REMPLACER`, `À VÉRIFIER` et `À COMPLÉTER` dans les fichiers HTML :
- `tarifs.html` : taux horaire, déplacement, prix des prestations, TVA
- `mentions-legales.html` : forme juridique, SIREN, adresse, dirigeant, hébergeur, assureur décennal,
  médiateur de la consommation
- engagements affichés (devis gratuit, garantie décennale) et textes des prestations de nettoyage
- ville et année de chaque chantier photographié
- une fois le site en ligne : l'adresse complète de `og-image.jpg` dans `og:image`, et `og:url`
- copier `three.min.js` dans le site plutôt que de le charger depuis cdnjs

## Aperçu local
`python3 -m http.server` puis http://localhost:8000
