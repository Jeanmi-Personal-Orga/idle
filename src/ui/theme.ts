import { StyleSheet } from 'react-native';

/**
 * Palette et pièces d'interface communes, reprises de `direction-artistique.md`.
 *
 * Règle qui tient tout l'ensemble : le seul saturé à l'écran, ce sont les
 * liquides — ce que le joueur gagne ou consomme. Tout le reste est brume, pierre
 * noyée, cuir et verre.
 *
 * Ce fichier remplace les variables CSS de la version web : React Native n'a pas
 * de cascade, donc chaque valeur partagée vit ici plutôt que d'être recopiée.
 */
export const C = {
  fog1: '#2b3140',
  fog2: '#3d4557',
  fog3: '#545d72',
  stone1: '#1a1d26',
  stone2: '#262b36',
  leather1: '#6b4b34',
  leather2: '#8a6544',
  glass1: '#a8c4cc',
  glass2: '#d6e8ec',
  // Liquides — les seules couleurs saturées.
  essence: '#4fd6a0',
  reagent: '#d68b3f',
  insight: '#7f9dff',
  shard: '#e0d0ff',
  catalyst: '#62d4c4',
  goldCoin: '#f2c85c',
  lantern: '#ffcf87',

  fg: '#dfe7ef',
  muted: '#8b97a6',
  line: '#333c4c',
  card: '#1c232e',
  cardDeep: '#151b24',
  ink: '#10131b',
  better: '#7ee0b0',
  worse: '#e59a9a',
} as const;

/** Styles réutilisés d'un écran à l'autre : cartes, lignes, libellés, boutons. */
export const S = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.stone1,
  },
  view: {
    padding: 12,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  between: {
    justifyContent: 'space-between',
  },
  label: {
    color: '#a7b6c5',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  text: {
    color: C.fg,
    fontSize: 15,
  },
  bold: {
    color: C.fg,
    fontSize: 15,
    fontWeight: '700',
  },
  muted: {
    color: C.muted,
    fontSize: 15,
  },
  small: {
    fontSize: 12,
  },
  right: {
    textAlign: 'right',
  },
  // Boutons. RN n'a pas de pseudo-classes : l'état désactivé se traduit par une
  // opacité posée à la main (voir `Button`).
  button: {
    backgroundColor: '#202a37',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  buttonPrimary: {
    backgroundColor: '#2c2740',
    borderColor: 'rgba(224, 208, 255, 0.4)',
  },
  buttonText: {
    color: C.fg,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextPrimary: {
    color: C.shard,
  },
  // Barres de vie et de progression.
  bar: {
    height: 8,
    borderRadius: 6,
    backgroundColor: '#0f141c',
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 6,
    columnGap: 14,
  },
  statline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minWidth: '45%',
    flexGrow: 1,
  },
});
