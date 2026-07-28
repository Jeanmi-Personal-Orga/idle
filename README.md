# L'Alchimiste de Brume

Idle RPG inspiré de *Forge Master*, transposé dans une ville engloutie par la brume.
Tu distilles des élixirs dans ton laboratoire ; ton alchimiste descend seul dans les
quartiers noyés. **Application React Native** (Expo), pour iOS et Android.

## Boucle de jeu

```
Combat automatique → Essence + Réactifs + Lucidité → Distillation / Affinage / Recherche
        ↑                                                          │
        └──────────────────── Puissance ← District suivant ────────┘
```

- **Essence** : affine les pièces équipées et agrandit le laboratoire.
- **Réactifs** : lancent une distillation (tombent des ennemis, garantis sur les gardiens).
- **Laboratoire** : accélère la distillation, décale la courbe de pureté vers le haut,
  et renforce le socle Puissance/Intégrité de 5 % par niveau.
- **Éclats** : rendus par la dissolution, scellent les legs permanents.
- **Lucidité** : alimente l'arbre de recherche. Elle ne tombe que sur une vague
  jamais atteinte dans le district et sur les gardiens — la recherche suit la
  progression, elle ne se farme pas en laissant tourner le jeu sur place.

## Arbre de recherche

Trois branches, quinze nœuds, chacun avec ses propres niveaux et ses prérequis :

| Branche | Ce qu'elle touche |
| --- | --- |
| **Laboratoire** | durée de distillation, réactifs récoltés, courbe de pureté, secondaires, coût d'affinage |
| **Puissance** | Puissance, Intégrité, Volatilité, Réaction en chaîne, critiques |
| **Brume** | essence récoltée, Osmose, Condensation, dégâts encaissés, hors-ligne |

Les coûts croissent de 26 à 45 % par niveau : monter plusieurs nœuds vaut mieux
que maximiser un seul, et l'arbre reste un puits à long terme (≈ deux tiers
investi après 24 h de jeu simulé).

## Dissolution (prestige)

Débloquée en atteignant La Verrerie une fois. Dissoudre le laboratoire rend des
**Éclats** et remet à zéro la matière ; la connaissance reste.

| Repart de zéro | Reste acquis |
| --- | --- |
| essence, réactifs, élixirs, laboratoire, districts | Lucidité et arbre de recherche, éclats, legs, écho des dissolutions (+12 % par dissolution) |

Les éclats scellent six **legs** permanents : essence récoltée, Puissance/Intégrité,
réactifs, courbe de pureté, niveau de laboratoire au réveil (`Alambic hérité` — la
relance devient très rapide), Lucidité gagnée.

Le gain d'éclats double environ par district atteint : il est toujours payant de
pousser un district de plus plutôt que de dissoudre tôt.

**La profondeur est illimitée.** Passé Le Puits Prismatique, la ville se rejoue en
cycles de plus en plus hostiles (« Les Quais Bas · Cycle II »). Sans cela le
prestige plafonnerait à la fin du contenu et n'aurait plus rien à mordre.

## Direction artistique

`direction-artistique.md` est la référence. Ce qui est appliqué dans le front :

| Règle du document | État |
| --- | --- |
| Palette (brume, pierre noyée, cuir, verre) et **seuls les liquides saturés** | ✅ `src/ui/theme.ts` |
| Brume : un canvas unique en surcouche, 15 %, coupé quand l'onglet perd le focus | ✅ `src/ui/Fog.tsx` |
| Scène de combat de profil, 3 couches, ennemi qui sort de la brume | ✅ |
| Lanterne qui s'éteint à la mort → la scène s'assombrit | ✅ |
| Chiffres de dégâts : montée + fondu, critiques 1,4× et en jaune | ✅ `CombatEvent` → `store.hits` |
| Cycles supérieurs : même silhouette, légèrement voilée | ✅ opacité |
| Chaudron-alambic : **le niveau de la fiole EST la barre de progression** | ✅ `src/ui/Cauldron.tsx` |
| Foyer éteint quand les réactifs manquent, vapeur colorée par le palier probable | ✅ |
| La pièce grandit par paliers de niveau (étagères, alambics, chat, tuyauterie) | ✅ 11 / 26 / 51 / 100 |
| Paliers de pureté : couleur **et** cadre (reflet, halo, particules, brume) | ✅ |
| Encoches d'affinage sur le cadre, une par 5 niveaux | ✅ |
| Recherche gravée sur papier huilé, nœuds acquis en ambre | ✅ |
| Dissolution : écran sombre, éclats qui montent, **mur des six legs** | ✅ `src/ui/LegacyWall.tsx` |
| Sprites pixel art : quatre personnages animés, sept ennemis animés, gardiens | ✅ |
| Décor : cinq couches de forêt dans l'arène | ✅ |
| Icônes d'équipement en sprites (planches `Equiptment`, `Potions`, `Jars`, `Gems`) | ⬜ pas encore branchées |

### Sprites

Les visuels viennent des planches déposées dans `assets/` (dossier non versionné,
voir la note de licence plus bas). Le jeu ne sert que le sous-ensemble utile,
copié dans `public/sprites/` — 172 Ko en tout :

| | |
| --- | --- |
| `chars/` | quatre planches 32 × 32, 10 × 7 cases : idle, marche, course, deux attaques, dégât, mort |
| `foes/bat`, `mushroom`, `golem`, `skeleton` | quatre ennemis animés : cinq bandes chacun (repos, marche, attaque, dégât, mort) |
| `foes/golem-orange`, `skeleton-yellow` | variantes de couleur des mêmes packs, pour varier les vagues |
| `foes/stalker` | rôdeur volant, qui frappe à distance |
| `bg/forest-1..5.png` | cinq couches de forêt sombre, superposées dans l'arène |

`src/game/sprites.ts` décrit chaque animation par **la liste explicite des cases
qu'elle traverse**, parce que les deux formats ne se rangent pas pareil : une
animation de personnage est une ligne d'une planche unique, alors qu'un ennemi a
un fichier par animation, dont la largeur de case lui est propre.

En natif il n'y a pas de `background-position` : chaque sprite met la planche
entière dans une `Image` plus grande que sa boîte, décalée pour cadrer la bonne
case, et la boîte coupe le reste. Les planches sont déclarées une à une dans
`src/game/images.ts` (`node scripts/asset-registry.mjs` régénère la table) : Metro
exige des `require` littéraux, là où le web construisait ses URL à la volée.

L'échelle vient de la famille, pas d'une hauteur imposée : un personnage 32 px
s'affiche à 96, une icône 96 px à 64. Sans ça, un rat ferait la taille d'un
chevalier. Les gardiens de fin de district sont agrandis de 30 %.

Le miroir de l'ennemi s'applique à sa boîte : l'image à l'intérieur étant
positionnée en absolu, rien ne vient écraser cette transformation. Les animations
d'images s'arrêtent quand l'application passe en arrière-plan, avec la boucle de
jeu.

### L'arène

Les deux combattants sont sur **une seule scène**, devant un décor de forêt en
cinq couches. Le déroulé d'une vague :

1. l'ennemi entre par la droite, le héros attend à gauche ;
2. ceux qui se battent au contact **marchent l'un vers l'autre** — à mi-chemin si
   les deux avancent, jusqu'à l'autre si un seul avance ;
3. arrivés au contact, boîtes à quatre pixels l'une de l'autre, ils échangent les
   coups jusqu'à la mort ;
4. un rang tombe : le héros franchit un pas jusqu'au suivant, et ne frappe pas
   pendant ce pas ;
5. vague nettoyée — ou héros tombé — l'écran passe au noir, la scène se remet en
   ordre, la suivante entre par la droite.

Rien n'est mesuré à l'écran : positions, distances et boîtes de collision sont
**calculées** (`src/ui/arena-geometry.ts`, vérifié par `npm run geometry`). Les
boîtes valent 80 % de la case du sprite pour le héros, 45 % pour les créatures — les
planches laissent beaucoup de vide autour du dessin, bien plus pour elles.

Un combattant à distance ne bouge jamais : c'est l'autre qui vient le chercher. Les
quatre personnages jouables sont au contact, donc ce sont les créatures volantes qui
obligent le joueur à traverser.

Quand un coup porte, on le voit : la cible blanchit une fraction de seconde, recule
de quelques pixels, le chiffre de dégâts monte et s'efface, et un voile rouge passe
quand c'est le joueur qui encaisse. Le bouton ▣ de la scène trace les boîtes de
collision et les marques d'arrivée, pour regarder la géométrie au lieu de la
déduire.

C'est de la **mise en scène** : le moteur ne connaît que des cadences de frappe,
le déplacement les suit sans changer aucun résultat. L'équilibrage simulé sur
72 h reste intact.

Trois couches de `transform` séparées — le slot place, le `mover` déplace, la
boîte du sprite joue l'entrée en scène — pour qu'aucune animation n'en écrase
une autre.

### Choix du personnage

Au premier lancement, le joueur choisit parmi quatre habitants de la ville noyée
(`src/game/characters.ts`) : Le Vétéran, La Barbare, Le Chevalier, La Sentinelle.
Aucune statistique ne change — l'équilibrage a été simulé sur 72 h, et des bonus
par personnage rendraient irrattrapable une décision prise à la première minute,
sans information.

Les quatre se battent au contact. Ce sont les **ennemis volants** (araignée,
abeille) qui tiennent leurs distances : le joueur doit alors traverser l'arène
pour aller les chercher, ce qui fait exister la portée sans déséquilibrer le
choix de départ. Les sauvegardes
antérieures gardent l'alchimiste sans revoir l'écran.

## Systèmes en place

| Système | État |
| --- | --- |
| Combat auto (frappes, riposte, mort/réanimation) | ✅ |
| 8 statistiques (Volatilité, Réaction en chaîne, Osmose, Condensation, Clairvoyance, Rupture…) | ✅ |
| 4 emplacements : Flacon, Manteau, Lentille, Gantelet | ✅ |
| 6 paliers de pureté : Trouble → Clair → Prismatique → Éthéré → Quintessence → Absolu | ✅ |
| Distillation avec secondaires aléatoires, auto-équipement du meilleur | ✅ |
| Affinage par niveaux (+14 % Puissance/Intégrité, +4 % sur les pourcentages), dissolution en réactifs | ✅ |
| 6 districts × 20 vagues, gardien de fin de district | ✅ |
| Sauvegarde locale + progression hors-ligne (8 h à 60 %, extensible par la recherche) | ✅ |
| Arbre de recherche : 3 branches, 15 nœuds, prérequis, achat max | ✅ |
| Dissolution : éclats, 6 legs permanents, profondeur en cycles infinis | ✅ |
| Compétences, familiers, montures | à venir |

Les plafonds voulus sont respectés : Réaction en chaîne et Clairvoyance ne servent à
rien au-delà de 100 %, comme dans le modèle d'origine.

### Licence des assets

Les planches viennent de packs tiers déposés par le joueur dans `assets/`, non
versionné. Ce qui est versionné, c'est le sous-ensemble servi par le jeu, dans
`public/sprites/`. Deux points à trancher avant toute diffusion :

- Les planches de **Cauldron's Brew** (Plopstudio) autorisent l'usage
  **non commercial** mais interdisent la redistribution. Elles ont été retirées du
  dépôt **et de l'historique** : `slimes.png`, `critters.png`, le dossier `hd/`
  (dont `Critters.png`, `Equiptment.png`, `Gems.png`, `Eyes.png`,
  `Cauldron and Powder.png`) et le pack généré `sprites-hd-alchimiste-de-brume/`,
  dont les icônes en étaient dérivées. L'historique a été réécrit
  (`git filter-branch`) et le distant mis à jour de force : **tout clone antérieur
  au 28 juillet 2026 doit être refait**. Les slimes sont remplacés par des
  variantes de couleur des packs d'ennemis.
- Les planches de personnages et le décor de forêt sont arrivés **sans fichier
  de licence**. À vérifier auprès de leur auteur.

## Développement

Le projet est une application **React Native**, gérée par Expo. Il n'y a plus de
version web : ni Vite, ni Capacitor, ni `index.html`.

```bash
npm install
npm start          # serveur de développement Expo (QR code, rechargement à chaud)
npm run android    # compile et lance sur un appareil ou un émulateur Android
npm run ios        # idem sur iOS (macOS et Xcode requis)
npm run prebuild   # génère les projets natifs android/ et ios/
```

### Vérifications, et ce qu'elles couvrent

```bash
npm run check      # tout : types, lint, moteur, géométrie, rendu
npm run typecheck  # tsc
npm run lint       # oxlint
npm run engine     # règles de jeu simulées dans Node (progression, clés, combat)
npm run geometry   # arithmétique de placement de l'arène
npm test           # monte l'application entière hors appareil et visite les onglets
```

Trois de ces quatre vérifications existent parce qu'un build vert ne dit rien du
comportement :

- **`npm run engine`** fait tourner le moteur dans Node — il est pur, sans DOM ni
  React ni natif. C'est là qu'on vérifie la progression, l'économie des clés et les
  règles de combat, avec un aléa fixe.
- **`npm run geometry`** contrôle l'arithmétique de l'arène : écart au contact,
  répartition de la marche, écart entre deux rangs. Elle a remplacé des mesures du
  DOM après trois corrections successives qui se trompaient d'une largeur de sprite.
- **`npm test`** monte l'application avec le rendu de test de React Native. Le
  typechecker accepte `<div>` sans broncher ; React Native, non — ce test attrape
  donc tout reste de web, comme il attrapait les écrans noirs de l'ancienne version.

Ce qu'aucune ne fait : juger l'image. Animations, positions et rendu des sprites ne
se vérifient qu'à l'œil, sur un appareil ou un émulateur.

### Le service de comptes, en conteneur

L'application native se construit avec la chaîne Expo, mais le serveur de comptes
et sa base tournent toujours en Docker :

```bash
docker compose up -d db api   # API sur http://localhost:3001
```

Depuis un téléphone, `localhost` désigne **le téléphone** : pour tester la connexion
sur appareil, mettre l'IP de la machine de développement dans `extra.apiUrl`
(`app.json`).

## Architecture

```
index.js        Point d'entrée natif (registerRootComponent)
app.json        Configuration Expo : nom, identifiants, extra.apiUrl
src/game/       Le moteur — ni React, ni natif, ni DOM
  types.ts      Types du domaine (aucune logique)
  content.ts    Données : stats, paliers, emplacements, districts
  formulas.ts   Toutes les courbes : coûts, scaling ennemi, génération d'objets
  engine.ts     Simulation pure : step(state, dt), actions, formatage
  campaigns.ts  Missions du jour : tirage déterministe, récompenses, prime
  lab.ts        Tables de coût et de durée du laboratoire (module feuille)
  tech.ts       Arbre de recherche : nœuds, coûts, modificateurs temporaires
  ascension.ts  Dissolution : éclats, legs permanents, modificateurs définitifs
  modifiers.ts  mods(state) : point d'entrée unique des formules (recherche × legs)
  store.ts      Boucle de jeu (pas fixe 10 Hz), sauvegarde, hooks React
  storage.ts    Stockage natif : cache synchrone au-dessus d'AsyncStorage
  images.ts     Registre des planches (require littéraux, exigés par Metro)
src/ui/         L'interface, en composants React Native
  theme.ts      Palette et styles partagés — ce que faisaient les variables CSS
  kit.tsx       Card, Row, Button, Popup… les briques communes
  Arena.tsx     La scène de combat : marche, contact, rideau noir
  arena-geometry.ts  Placement calculé : positions, distances, boîtes
  Sprite.tsx    Découpe d'une case de planche, sans background CSS
  Cauldron.tsx  Le laboratoire en coupe, en react-native-svg
  LegacyWall.tsx  Les six legs accrochés au mur, illuminés à l'achat
src/__tests__/  Test de fumée : monte l'application hors appareil
scripts/        Vérifications hors interface (moteur, géométrie, registre d'images)
```

Le moteur ne touche ni au natif ni à React : l'équilibrage se simule dans Node
(`step()` en boucle) avant d'être vécu en jeu. Seuls `store.ts` et `auth.ts`
dépendent de la plateforme, à travers `storage.ts`.

## Équilibrage mesuré

Simulation d'un joueur qui affine et cherche dès qu'il peut (`step()` en boucle,
hors navigateur) :

| District atteint | Temps |
| --- | --- |
| Le Marché Noyé | ~35 min |
| La Verrerie | ~1 h |
| Les Citernes | ~5 h 30 |
| L'Observatoire | ~8 h |
| Le Puits Prismatique | ~15 h |

Avec dissolutions (un joueur qui dissout après 30 min sans progrès) :

| | |
| --- | --- |
| 1re dissolution | 1 h 54 (district 2, 6 éclats) |
| 5e dissolution | 6 h (district 6, 142 éclats) |
| après 72 h | ~48 dissolutions, frontière au district 9 (Cycle II), 1300 éclats par run |

Chaque relance rejoue les premiers districts en quelques secondes puis pousse un
ou deux districts plus loin — la courbe de prestige attendue.

Composition atteinte à 24 h : Volatilité 260 %, Réaction en chaîne 100 % (plafond),
Clairvoyance 54 %, Rupture 306 %, Osmose 110 % — l'ordre de grandeur visé.
