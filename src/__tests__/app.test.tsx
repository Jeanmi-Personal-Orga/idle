/**
 * Test de fumée : monte l'application entière **hors appareil** et parcourt les
 * cinq onglets.
 *
 * Pourquoi il existe : le typechecker ne voit pas la différence entre un composant
 * natif et un reste de web — les types React acceptent `<div>` sans broncher. React
 * Native, lui, refuse de rendre une balise qu'il ne connaît pas : ce test attrape
 * donc tout oubli de portage, comme il attrapait les écrans noirs du temps du
 * navigateur.
 *
 * Il utilise `react-test-renderer` directement plutôt qu'une bibliothèque de
 * requêtes : moins de dépendances, et rien à deviner sur ce qui est monté.
 *
 * Ce n'est pas un test visuel : il ne dit ni si c'est joli, ni si les animations
 * sont justes. Il dit que chaque écran se rend et affiche du texte.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { newGame } from '../game/engine';
import { __setCache } from '../game/storage';

/**
 * Le stockage est semé **avant** d'importer l'application : le magasin de jeu lit
 * la sauvegarde au moment où son module est chargé, donc l'ordre compte. Sans ça, le
 * test démarrerait sur une partie vierge et tomberait sur le choix du personnage.
 *
 * La sauvegarde est d'**avant-dernière version**, ce qui couvre aussi la migration —
 * l'autre façon classique de casser le démarrage.
 */
/**
 * Le stockage est semé **au chargement de ce fichier**, avant que l'application ne
 * soit chargée : le magasin de jeu lit la sauvegarde à l'import de son module, donc
 * l'ordre compte. Sans ça le test démarrerait sur une partie vierge et tomberait sur
 * l'écran de choix du personnage.
 *
 * La sauvegarde est d'**avant-dernière version**, ce qui couvre aussi la migration —
 * l'autre façon classique de casser le démarrage.
 */
function seedLegacySave() {
  const save = newGame() as unknown as Record<string, unknown>;
  delete save.daily;
  save.version = 16;
  save.character = 'fighter';
  __setCache(
    new Map([
      ['brume.save.v1', JSON.stringify(save)],
      // On saute l'écran de connexion : ce n'est pas ce qu'on teste ici.
      ['brume.auth.skipped', '1'],
    ]),
  );
}

seedLegacySave();
// `require` après la semence, et non un `import` en tête de fichier : les imports
// sont hissés, et l'application serait chargée — donc la sauvegarde lue — avant.
// Remettre les modules à zéro (`jest.resetModules`) chargerait un second React et
// casserait les hooks.
const App = (require('../App') as { default: React.ComponentType }).default;

/** Tout le texte rendu, mis à plat. */
function allText(root: ReactTestInstance): string {
  return root
    .findAllByType(Text)
    .map((node) => flatten(node.props.children))
    .join(' ');
}

function flatten(children: unknown): string {
  if (children == null || typeof children === 'boolean') return '';
  if (Array.isArray(children)) return children.map(flatten).join('');
  if (typeof children === 'object') return '';
  return String(children);
}

/** Touche le premier élément tactile dont le contenu porte ce libellé. */
function press(root: ReactTestInstance, label: string): boolean {
  const target = root
    .findAll((node) => typeof node.props?.onPress === 'function')
    .find((node) => flatten(node.props.children).includes(label) || labelOf(node).includes(label));
  if (!target) return false;
  act(() => {
    target.props.onPress();
  });
  return true;
}

function labelOf(node: ReactTestInstance): string {
  try {
    return node.findAllByType(Text).map((t) => flatten(t.props.children)).join(' ');
  } catch {
    return '';
  }
}

const TABS = ['Boutique', 'Campagnes', 'Brume', 'Recherche', 'Dissolution'];

describe("L'Alchimiste de Brume", () => {
  let tree: ReactTestRenderer;

  beforeEach(async () => {
    await act(async () => {
      tree = create(<App />);
    });
    // L'hydratation du stockage est asynchrone : on laisse le premier rendu passer.
    await act(async () => {
      await Promise.resolve();
    });
  });

  afterEach(() => {
    act(() => {
      tree.unmount();
    });
  });

  it('démarre sur une sauvegarde migrée', () => {
    console.log('ARBRE:', JSON.stringify(tree.toJSON())?.slice(0, 400));
    expect(allText(tree.root)).toContain("L'Alchimiste de Brume");
  });

  it('rend les cinq onglets', async () => {
    for (const tab of TABS) {
      expect(press(tree.root, tab)).toBe(true);
      await act(async () => {
        await Promise.resolve();
      });
      const text = allText(tree.root);
      // Un écran quasi vide est une panne : c'est la forme qu'avaient les écrans
      // noirs de la version web.
      expect(text.length).toBeGreaterThan(60);
    }
  });

  it('affiche le combat, le laboratoire et le journal en brume', () => {
    press(tree.root, 'Brume');
    const text = allText(tree.root);
    expect(text).toContain('Vague');
    expect(text).toContain('Laboratoire');
    expect(text).toContain('Journal');
  });
});
