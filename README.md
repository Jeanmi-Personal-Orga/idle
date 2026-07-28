# L'Alchimiste de Brume

Idle RPG inspiré de *Forge Master*, transposé dans une ville engloutie par la brume.
Tu distilles des élixirs dans ton laboratoire ; ton alchimiste descend seul dans les
quartiers noyés. Web d'abord, iOS/Android via Capacitor — un seul code.

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
| Palette (brume, pierre noyée, cuir, verre) et **seuls les liquides saturés** | ✅ variables CSS |
| Brume : un canvas unique en surcouche, 15 %, coupé quand l'onglet perd le focus | ✅ `src/ui/Fog.tsx` |
| Scène de combat de profil, 3 couches, ennemi qui sort de la brume | ✅ |
| Lanterne qui s'éteint à la mort → la scène s'assombrit | ✅ |
| Chiffres de dégâts : montée + fondu, critiques 1,4× et en jaune | ✅ `CombatEvent` → `store.hits` |
| Cycles supérieurs : même silhouette, teinte violette + contour | ✅ filtre CSS |
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

L'échelle vient de la famille, pas d'une hauteur imposée : un personnage 32 px
s'affiche à 96, une icône 96 px à 64. Sans ça, un rat ferait la taille d'un
chevalier. Les gardiens de fin de district sont agrandis de 30 %.

Le miroir de l'ennemi est appliqué **au dessin**, pas à la boîte : la boîte porte
l'animation d'entrée, et une animation de `transform` écraserait un miroir posé
au même endroit. Toutes les animations sont désactivées sous
`prefers-reduced-motion`, et aucune ne tourne quand l'onglet est masqué.

### L'arène

Les deux combattants sont sur **une seule scène**, devant un décor de forêt en
cinq couches. Le déroulé d'une vague :

1. l'ennemi sort de la brume à droite, le héros attend à gauche ;
2. ceux qui se battent au contact **marchent l'un vers l'autre** — à mi-chemin si
   les deux avancent, jusqu'à l'autre si un seul avance ;
3. arrivés au contact ils y restent et échangent les coups jusqu'à la mort.

La marche est lente et régulière : 46 px/s, soit ~1,6 s pour traverser. La durée
vient de la distance, pas d'un délai fixe, sinon les longues distances se
téléportent. Les à-coups de combat, eux, sont courts et secs (110 ms).

Un combattant à distance ne bouge jamais : c'est l'autre qui vient le chercher.
Les quatre personnages jouables sont au contact, donc ce sont les bestioles
volantes — araignée, abeille — qui obligent le joueur à traverser.

Quand un coup porte, on le voit : la cible blanchit une fraction de seconde, un
éclat s'ouvre au point d'impact, la cible recule de quelques pixels, le chiffre
de dégâts monte et s'efface, et la scène tremble quand c'est le joueur qui
encaisse.

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

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + bundle dans dist/
npm run lint
npm run smoke    # monte l'app dans un DOM sans navigateur et visite les 5 onglets
```

### Le test de fumée, et pourquoi il existe

`npm run smoke` monte l'application entière dans un DOM sans navigateur (jsdom),
part d'une sauvegarde d'avant-dernière version — la migration est donc couverte —
puis visite les cinq onglets, lance une mission et achète au comptoir. Il échoue
si une exception de rendu survient ou si un écran reste vide.

Il existe parce qu'un build vert ne dit rien du rendu : deux pannes d'écran noir
de suite sont passées à travers `tsc`, `vite build` et `oxlint`. La première était
une barre de vie qui lisait un ennemi disparu pendant le temps mort entre deux
vagues ; la seconde une icône de monnaie sans définition, qui emportait tout
l'onglet Campagnes. Les deux se voient ici en deux secondes.

Ce qu'il ne fait pas : juger l'image. Les animations, les positions et le rendu
des sprites ne se vérifient qu'à l'œil, dans un vrai navigateur.

### Docker — une image par cible

Trois Dockerfiles séparés dans `docker/`, orchestrés par `compose.yaml` :

| Cible | Commande | Résultat |
| --- | --- | --- |
| **Web (production)** | `docker compose up web` | nginx sur http://localhost:8080 |
| **Web (dev)** | `docker compose --profile dev up dev` | vite + rechargement à chaud sur http://localhost:5173, exposé au réseau local |
| **Android** | `docker build -f docker/android.Dockerfile --target apk --output type=local,dest=./out .` | `out/app-debug.apk` |
| **iOS** | `docker build -f docker/ios.Dockerfile --target project --output type=local,dest=./out .` | `out/ios/` à ouvrir dans Xcode |

L'image web fait 48 Mo (nginx + bundle) : le jeu tourne entièrement côté navigateur,
il n'y a aucun serveur applicatif à faire tourner. L'image Android fait ~4 Go
(JDK 21 + SDK Android 36) et sa première construction prend une dizaine de
minutes ; elle sort un APK debug signé de 4,2 Mo, vérifié.

Le conteneur `dev` installe ses dépendances à la construction de l'image, pas au
démarrage : un `npm install` rejoué à chaque `up` par-dessus un volume monté est
lent et finit par casser. Après un changement de `package.json`, reconstruis-le
avec `docker compose --profile dev up --build dev`.

Le conteneur `dev` et un `npm run dev` lancé sur la machine se disputent le port
5173 : `failed to bind host port [::]:5173/tcp: address already in use`. Coupe
l'un des deux (`pkill -f vite`), ou donne un autre port hôte au conteneur :

```bash
DEV_PORT=5174 docker compose --profile dev up -d dev
WEB_PORT=8081 docker compose up -d web
```

C'est la seule cause connue d'échec de `-d` : le démarrage détaché fonctionne, y
compris le rechargement à chaud (le dossier est monté, vite voit les fichiers).

**iOS : la compilation ne peut pas se faire dans Docker.** Xcode n'existe que sur
macOS et sa licence interdit de l'exécuter ailleurs — il n'y a pas de
contournement. L'image iOS fait donc tout ce qui est faisable sans Mac : bundle
web + projet Capacitor complet, à copier sur un Mac puis ouvrir avec
`open ios/App/App.xcodeproj`. Capacitor 8 passant par Swift Package Manager,
aucun `pod install` n'est nécessaire.

### Mobile en local (Capacitor, sans Docker)

```bash
npm run mobile:add:android   # crée le projet Android (Android Studio requis)
npm run mobile:add:ios       # crée le projet iOS (Xcode requis, macOS)
npm run mobile:sync          # rebuild + pousse dist/ dans les projets natifs
npm run mobile:android       # sync + ouvre Android Studio
```

Les dossiers `ios/` et `android/` sont générés à la demande, pas versionnés tant
qu'on n'en a pas besoin.

## Architecture

```
src/game/
  types.ts      Types du domaine (aucune logique)
  content.ts    Données : stats, paliers, emplacements, districts
  formulas.ts   Toutes les courbes : coûts, scaling ennemi, génération d'objets
  engine.ts     Simulation pure : step(state, dt), actions, formatage
  store.ts      Boucle de jeu (pas fixe 10 Hz), sauvegarde, hooks React
  tech.ts       Arbre de recherche : nœuds, coûts, modificateurs temporaires
  ascension.ts  Dissolution : éclats, legs permanents, modificateurs définitifs
  modifiers.ts  mods(state) : point d'entrée unique des formules (recherche × legs)
src/ui/         Vues Brume / Laboratoire / Élixirs / Recherche / Dissolution
  Fog.tsx       La brume : canvas unique en surcouche
  Sprite.tsx    Rendu des spritesheets HD
  CharacterSelect.tsx  Le choix du personnage, au premier lancement
  Cauldron.tsx  Le laboratoire en coupe : le chaudron raconte l'état du jeu
  LegacyWall.tsx  Les six legs accrochés au mur, illuminés à l'achat
```

`engine.ts` et `formulas.ts` ne touchent ni au DOM ni à React : l'équilibrage se
simule hors navigateur (`step()` en boucle) avant d'être vécu en jeu.

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
