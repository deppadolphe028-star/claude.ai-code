# A R Rénovation — site vitrine

Site statique (HTML/CSS/JS, sans build) pour A R Rénovation, entreprise de couverture et de nettoyage.
Design calqué sur la référence de style « Origin Financial » (midnight gallery) : mêmes couleurs,
fond quasi noir, grands titres serif en graisse légère avec un mot en italique, six tuiles de services
colorées, carte argentée inversée, module téléphone, libellés en monospace. Les scènes 3D sont sur un
ciel bleu avec des nuages.

## Pour attirer et convertir les visiteurs
- **Appel en un geste sur mobile** : barre fixe « Appeler / Devis gratuit » en bas de l'écran
  (masquée quand le formulaire est affiché), et menu de navigation.
- **Page compacte** : sur mobile, les tuiles de services et de nettoyage défilent au doigt, comme
  la galerie de réalisations ; l'anatomie 3D se monte sur une courte distance de défilement.
- **Diagnostic express** : le visiteur touche ce qu'il constate (fuite, tempête, tuiles cassées,
  mousse…) et sa demande de diagnostic se rédige toute seule (constat, travaux probables, type de
  travaux du plus grave).
- **Devis pré-remplis** : le champ de l'accueil et le lien « Devis » de chaque service remplissent
  le formulaire (type de travaux et message).
- **Urgences** : lien d'appel dans l'accueil, encadré « Urgence » à côté du formulaire, bouton
  « Appeler » toujours visible sur mobile.
- **Choix de la couverture** : ardoise, tuile plate, tuile romane ou bac acier, sur la maison de
  l'accueil comme dans l'anatomie ; l'ancienne couverture se dépose depuis le faîtage et la nouvelle
  se pose depuis l'égout.
- **Référencement et partage** : titre et description travaillés, fiche entreprise pour Google
  (données structurées `RoofingContractor`), image d'aperçu `og-image.jpg` pour WhatsApp, Facebook, SMS.
- **Réalisations** : comparatif avant / après à faire glisser et galerie de six chantiers
  (voir « Ajouter vos photos de chantiers » ci-dessous).
- **Démoussage en démonstration 3D** : la tuile Démoussage des services mène à une démonstration
  sur la maison (voir « Animations 3D »).
- **Nettoyage** : une section à part (lien « Nettoyage » dans le menu) avec quatre tuiles, dallages,
  terrasses, maisons et locaux professionnels, chacune avec son devis pré-rempli. Le formulaire
  range les types de travaux en « Toiture » et « Nettoyage » et adapte le message proposé.
- **Avis clients** : section « Ils nous ont fait confiance » (lien « Avis » dans le menu), prête à
  recevoir vos vrais avis Google, avec « Voir tous nos avis Google » et « Laissez-nous un avis »
  (voir « Ajouter vos avis clients » ci-dessous).
- **Des couleurs qui font agir** : l'orange est réservé aux boutons de devis, seuls éléments orange de
  la page, donc vus en premier ; le rouge ne signale que l'urgence (point qui pulse près de l'appel,
  encadré « Urgence ») ; le bleu du ciel inspire confiance.
- **Confiance** : questions fréquentes (délais, TVA, garantie), mentions légales et données personnelles.

## Ajouter vos photos de chantiers
Déposez vos photos dans le dossier `realisations/` avec ces noms : `avant.jpg` et `apres.jpg` pour le
comparatif, `chantier-1.jpg` à `chantier-6.jpg` pour la galerie (JPG d'environ 1600 px de large).
Chaque photo remplace automatiquement son emplacement « Photo à ajouter ». Les légendes (type de
travaux, ville, année) se modifient dans `index.html`, section « Nos réalisations ».
Le détail est dans `realisations/LISEZMOI.txt`.

Déjà en place : `avant.jpg` et `apres.jpg` (démoussage et traitement hydrofuge d'une toiture en
ardoise), `chantier-1.jpg` (démoussage d'une toiture en tuiles) et `chantier-2.jpg` (couverture
refaite en tuiles). Ces deux dernières sont des montages avant / après, signalés par des étiquettes
« Avant » et « Après ». Pour changer une photo, il suffit de la remplacer par une autre portant le
même nom (pour une photo simple à la place d'un montage, retirer aussi les étiquettes).

## Ajouter vos avis clients
Uniquement de vrais avis, recopiés mot pour mot : inventer ou modifier un avis est interdit, et la
loi demande d'indiquer d'où viennent les avis affichés et comment ils sont choisis (c'est la mention
sous les cartes). Dans `index.html`, section « Avis clients », pour chaque carte :
- remplacer le texte, le prénom et l'initiale, la ville, le mois et l'année ;
- mettre la note dans `--note` (5 pour cinq étoiles, 4.5 pour quatre et demie) ;
- retirer la classe `is-empty` (la carte quitte son aspect d'emplacement).

Les avis vont du plus récent au plus ancien. Ajoutez ensuite le lien de votre fiche Google
(`href` de « Voir tous nos avis Google ») et le lien « Demander des avis » de la fiche (`href` de
« Laissez-nous un avis ») : sans lien, ces deux boutons restent grisés. Vous pouvez aussi envoyer des
copies d'écran de vos avis à la personne qui gère le site.

## Animations 3D
Une maison sur un îlot de pelouse, avec les vraies couleurs des matériaux : charpente en bois
(sablières, pannes, faîtière, chevrons, chevêtre autour de la cheminée), laine de verre jaune entre
les chevrons, écran sous-toiture et contre-liteaux, liteaux, ardoises fixées au crochet inox, tuiles
faîtières en terre cuite scellées au mortier, gouttières demi-rondes en zinc et leurs crochets,
descentes, bandes de rive, abergement et souche de cheminée en brique.

Rendu réaliste : lumière de plein jour (le ciel éclaire et se reflète sur toutes les matières,
le soleil porte des ombres douces), tons filmiques comme sur une photo, et des matières en relief
calculées dans `textures/` : ardoise clivée et pailletée, terre cuite avec flammés et grain de sable,
bois de charpente veiné, laine de verre, écran sous-toiture, brique, crépi, dalles de pierre,
planches des volets, gazon et terre de l'îlot vue en coupe. Chaque ardoise, tuile ou pièce de bois lit
sa propre zone de texture : deux pièces ne se ressemblent jamais. Les massifs sont faits de centaines
de bouquets de feuilles ; la maison a ses encadrements de fenêtres, son auvent et son applique.

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
  sous-toiture, couverture, zinguerie, démoussage), avec un gros plan sur la couverture (crochets,
  vis, faîtage). Le texte de l'étape Couverture suit le type choisi. Cette scène n'est construite
  qu'à l'approche de sa section.
- **Démoussage** (dernière étape de l'anatomie) : sur la couverture choisie, mousses et lichens
  s'installent en plaques, surtout vers l'égout, et la toiture s'encrasse ; le nettoyage descend
  ensuite du faîtage vers l'égout, suivi du traitement anti-mousse et hydrofuge. La phase en cours
  s'affiche sous la maison. La démonstration démarre en arrivant sur l'étape, se rejoue avec le
  bouton « Revoir la démonstration », et repart de zéro si l'on change de couverture.

La 3D utilise Three.js r128, chargé depuis cdnjs. Si WebGL ou la bibliothèque ne sont pas
disponibles, la page reste complète (accueil centré, étapes en liste). Si l'appareil peine (moins de
26 images par seconde), la 3D baisse d'elle-même sa définition pour rester fluide.

Les matières (environ 1,5 Mo d'images WebP) sont calculées par `textures/generer.py` (Python avec
numpy et Pillow, sans aucune image extérieure) ; il suffit de le relancer pour les recréer. La page
ouverte directement depuis le disque (`file://`) utilise des matières plus simples, dessinées par le
navigateur : pour voir le rendu réaliste en local, passer par `python3 -m http.server`. Avec l'option
« réduire les animations » du système, la maison s'affiche directement terminée, les nuages restent
immobiles et la démonstration du démoussage ne se lance qu'avec son bouton.

## Fichiers
- `index.html` — la page d'accueil
- `mentions-legales.html` — mentions légales, assurance, données personnelles
- `styles.css` — design (tokens de couleurs en tête de fichier)
- `roof3d.js` — les deux scènes 3D (maison du hero, anatomie de la toiture et démonstration du
  démoussage)
- `script.js` — devis pré-remplis, diagnostic express, menu et barre d'action mobile,
  envoi du formulaire par e-mail (mailto), dessin des nuages
- `og-image.jpg` — image d'aperçu pour le partage du lien
- `realisations/` — vos photos de chantiers (mode d'emploi dans `LISEZMOI.txt`)
- `textures/` — les matières de la maison 3D, et `generer.py` qui les calcule

## Avant la mise en ligne
Cherchez `À REMPLACER`, `À VÉRIFIER` et `À COMPLÉTER` dans les fichiers HTML :
- zone d'intervention (« Votre ville et ses environs », aussi dans les données structurées)
- engagements affichés (garantie décennale, devis gratuit, chantier nettoyé) à vérifier
- `mentions-legales.html` : forme juridique, SIRET, adresse, dirigeant, hébergeur, assureur décennal
- textes des quatre prestations de nettoyage (section « Nettoyage » de `index.html`)
- vrais avis clients et liens de la fiche Google (section « Avis clients »)
- photos de chantiers dans `realisations/` et légendes « Ville — année » dans `index.html`
- une fois le site en ligne, mettre l'adresse complète de `og-image.jpg` dans la balise `og:image`

Pour recevoir les demandes directement (sans passer par la messagerie du visiteur), le formulaire
peut être branché sur un service d'envoi de formulaires.

## Aperçu local
Ouvrez `index.html` dans un navigateur, ou : `python3 -m http.server` puis http://localhost:8000
