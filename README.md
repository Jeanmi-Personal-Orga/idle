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

## Systèmes en place

| Système | État |
| --- | --- |
| Combat auto (frappes, riposte, mort/réanimation) | ✅ |
| 8 statistiques (Volatilité, Réaction en chaîne, Osmose, Condensation, Clairvoyance, Rupture…) | ✅ |
| 4 emplacements : Flacon, Manteau, Lentille, Gantelet | ✅ |
| 6 paliers de pureté : Trouble → Clair → Prismatique → Éthéré → Quintessence → Absolu | ✅ |
| Distillation avec secondaires aléatoires, auto-équipement du meilleur | ✅ |
| Affinage par niveaux (+12 % / niveau), dissolution en réactifs | ✅ |
| 6 districts × 20 vagues, gardien de fin de district | ✅ |
| Sauvegarde locale + progression hors-ligne (plafond 8 h, 60 % d'efficacité) | ✅ |
| Arbre de recherche : 3 branches, 15 nœuds, prérequis, achat max | ✅ |
| Ascension, compétences, familiers, montures | à venir |

Les plafonds voulus sont respectés : Réaction en chaîne et Clairvoyance ne servent à
rien au-delà de 100 %, comme dans le modèle d'origine.

## Développement

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + bundle dans dist/
npm run lint
```

### Mobile (Capacitor)

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
  tech.ts       Arbre de recherche : nœuds, coûts, agrégation des modificateurs
src/ui/         Vues Brume / Laboratoire / Élixirs / Recherche
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

Composition atteinte à 24 h : Volatilité 260 %, Réaction en chaîne 100 % (plafond),
Clairvoyance 54 %, Rupture 306 %, Osmose 110 % — l'ordre de grandeur visé.
