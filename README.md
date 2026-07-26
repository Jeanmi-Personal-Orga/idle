# L'Alchimiste de Brume

Idle RPG inspiré de *Forge Master*, transposé dans une ville engloutie par la brume.
Tu distilles des élixirs dans ton laboratoire ; ton alchimiste descend seul dans les
quartiers noyés. Web d'abord, iOS/Android via Capacitor — un seul code.

## Boucle de jeu

```
Combat automatique → Essence + Réactifs → Distillation / Affinage → Puissance → District suivant
```

- **Essence** : affine les pièces équipées et agrandit le laboratoire.
- **Réactifs** : lancent une distillation (tombent des ennemis, garantis sur les gardiens).
- **Laboratoire** : accélère la distillation, décale la courbe de pureté vers le haut,
  et renforce le socle Puissance/Intégrité de 5 % par niveau.

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
| Tech tree, ascension, compétences, familiers, montures | à venir |

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
src/ui/         Vues Brume / Laboratoire / Élixirs
```

`engine.ts` et `formulas.ts` ne touchent ni au DOM ni à React : l'équilibrage se
simule hors navigateur (`step()` en boucle) avant d'être vécu en jeu.

## Équilibrage mesuré

Simulation d'un joueur qui affine dès qu'il peut, sur 20 h :

| District atteint | Temps |
| --- | --- |
| Le Marché Noyé | ~45 min |
| La Verrerie | ~1 h 15 |
| Les Citernes | ~2 h 15 |
| L'Observatoire | ~3 h |
| Le Puits Prismatique | ~12 h 30 |
