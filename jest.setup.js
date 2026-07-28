/**
 * Mise en place des tests.
 *
 * `SafeAreaProvider` attend de vraies mesures d'écran avant de rendre ses enfants :
 * hors appareil, il rendrait donc un arbre vide. Le mock officiel fournit des marges
 * fixes — il expose un export **par défaut**, d'où le `.default`, sans quoi les
 * composants arrivent `undefined` et React refuse l'élément.
 */
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

/**
 * `AsyncStorage` a besoin d'un module natif : hors appareil, il lève dès l'import.
 * Le mock officiel du paquet le remplace par une implémentation en mémoire — c'est
 * exactement ce que fait déjà notre couche de stockage (`src/game/storage.ts`), donc
 * le comportement testé reste le vrai.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
