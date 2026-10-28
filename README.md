# A R Rénovation — site vitrine

Site statique (HTML/CSS/JS, sans build) pour l'entreprise de couverture A R Rénovation.
Design calqué sur la référence de style « Origin Financial » (midnight gallery) : mêmes couleurs,
fond quasi noir, grands titres serif en graisse légère avec un mot en italique, six tuiles de services
colorées, carte argentée inversée, module téléphone, libellés en monospace. Les scènes 3D sont sur un
ciel bleu avec des nuages.

## Pour attirer et convertir les visiteurs
- **Appel en un geste sur mobile** : barre fixe « Appeler / Devis gratuit » en bas de l'écran
  (masquée quand le formulaire est affiché), et menu de navigation.
- **Diagnostic express** : le visiteur touche ce qu'il constate (fuite, tempête, tuiles cassées,
  mousse…), obtient un premier avis avec un niveau d'urgence, puis une demande de devis déjà rédigée.
- **Devis pré-remplis** : le champ de l'accueil et le lien « Devis » de chaque service remplissent
  le formulaire (type de travaux et message).
- **Urgences** : lien d'appel dans l'accueil, encadré « Urgence » à côté du formulaire, bouton
  « Appeler maintenant » quand le diagnostic indique une urgence.
- **Choix de la couverture** : ardoise, tuile plate, tuile romane ou bac acier, sur la maison de
  l'accueil comme dans l'anatomie ; l'ancienne couverture se dépose depuis le faîtage et la nouvelle
  se pose depuis l'égout.
- **Référencement et partage** : titre et description travaillés, fiche entreprise pour Google
  (données structurées `RoofingContractor`), image d'aperçu `og-image.jpg` pour WhatsApp, Facebook, SMS.
- **Réalisations** : comparatif avant / après à faire glisser et galerie de six chantiers
  (voir « Ajouter vos photos de chantiers » ci-dessous).
- **Confiance** : questions fréquentes (délais, TVA, garantie), mentions légales et données personnelles.

## Ajouter vos photos de chantiers
Déposez vos photos dans le dossier `realisations/` avec ces noms : `avant.jpg` et `apres.jpg` pour le
comparatif, `chantier-1.jpg` à `chantier-6.jpg` pour la galerie (JPG d'environ 1600 px de large).
Chaque photo remplace automatiquement son emplacement « Photo à ajouter ». Les légendes (type de
travaux, ville, année) se modifient dans `index.html`, section « Nos réalisations ».
Le détail est dans `realisations/LISEZMOI.txt`.

## Animations 3D
Une maison sur un îlot de pelouse, avec les vraies couleurs des matériaux : charpente en bois
(sablières, pannes, faîtière, chevrons, chevêtre autour de la cheminée), laine de verre jaune entre
les chevrons, écran sous-toiture et contre-liteaux, liteaux, ardoises fixées au crochet inox, tuiles
faîtières en terre cuite scellées au mortier, gouttières demi-rondes en zinc et leurs crochets,
descentes, bandes de rive, abergement et souche de cheminée en brique.

Les couvertures ont une vraie matière : veinage et paillettes de l'ardoise, grain et nuances de la
terre cuite (chaque pièce lit sa propre zone de texture, deux pièces ne se ressemblent jamais),
reflets du ciel sur l'acier, le zinc et les vitres.

Quatre couvertures au choix :
- **Ardoise** naturelle fixée au crochet inox, faîtage en tuiles faîtières scellées au mortier ;
- **Tuile plate** en terre cuite, petites tuiles à joints croisés ;
- **Tuile romane** en terre cuite, à emboîtement, avec son profil ondulé ;
- **Bac acier** gris anthracite : plaques nervurées d'une seule pièce du faîtage à l'égout, vis à
  rondelle d'étanchéité sur les nervures, faîtage en acier de la même teinte.

- **Accueil** : la couverture se pose rang par rang, du bas vers le haut, puis la maison tourne
  lentement (on peut la faire pivoter en la faisant glisser).
- **Anatomie d'une toiture** : on choisit le type de toiture avec le sélecteur sous la maison, puis
  en faisant défiler la page, la toiture se monte couche par couche (charpente, isolation, écran
  sous-toiture, couverture, zinguerie, entretien), avec un gros plan sur la couverture (crochets,
  vis, faîtage). Le texte de l'étape Couverture suit le type choisi. Cette scène n'est construite
  qu'à l'approche de sa section.

La 3D utilise Three.js r128, chargé depuis cdnjs. Si WebGL ou la bibliothèque ne sont pas
disponibles, la page reste complète (accueil centré, étapes en liste). Avec l'option
« réduire les animations » du système, la maison s'affiche directement terminée et les nuages restent immobiles.

## Fichiers
- `index.html` — la page d'accueil
- `mentions-legales.html` — mentions légales, assurance, données personnelles
- `styles.css` — design (tokens de couleurs en tête de fichier)
- `roof3d.js` — les deux scènes 3D (maison du hero, anatomie de la toiture)
- `script.js` — devis pré-remplis, diagnostic express, menu et barre d'action mobile,
  envoi du formulaire par e-mail (mailto), dessin des nuages
- `og-image.jpg` — image d'aperçu pour le partage du lien
- `realisations/` — vos photos de chantiers (mode d'emploi dans `LISEZMOI.txt`)

## Avant la mise en ligne
Cherchez `À REMPLACER`, `À VÉRIFIER` et `À COMPLÉTER` dans les fichiers HTML :
- numéro de téléphone (`06 00 00 00 00` et `+33600000000`, présents à plusieurs endroits)
- adresse e-mail (`contact@ar-renovation.fr`, aussi dans `data-email` du formulaire)
- zone d'intervention (« Votre ville et ses environs », aussi dans les données structurées)
- engagements affichés (garantie décennale, devis gratuit, chantier nettoyé) à vérifier
- `mentions-legales.html` : forme juridique, SIRET, adresse, dirigeant, hébergeur, assureur décennal
- photos de chantiers dans `realisations/` et légendes « Ville — année » dans `index.html`
- une fois le site en ligne, mettre l'adresse complète de `og-image.jpg` dans la balise `og:image`

Pour recevoir les demandes directement (sans passer par la messagerie du visiteur), le formulaire
peut être branché sur un service d'envoi de formulaires.

## Aperçu local
Ouvrez `index.html` dans un navigateur, ou : `python3 -m http.server` puis http://localhost:8000
