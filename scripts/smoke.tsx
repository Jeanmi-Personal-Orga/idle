/**
 * Test de fumée : monte l'application entière dans un DOM sans navigateur et
 * parcourt les cinq onglets, en signalant toute exception de rendu.
 *
 * Pourquoi il existe : un build vert ne dit rien du rendu. Deux pannes de suite
 * sont passées à travers `tsc`, `vite build` et `oxlint` — une barre de vie qui
 * lisait un ennemi disparu, puis une icône de monnaie sans définition, qui a
 * emporté tout l'onglet Campagnes. Les deux se voient ici en deux secondes.
 *
 * Ce n'est pas un test visuel : il ne dit pas si c'est joli ni si les animations
 * sont justes, seulement que rien ne plante et que chaque écran affiche du texte.
 *
 * Usage : `npm run smoke`
 */
import { createRoot } from 'react-dom/client';
import { newGame } from '../src/game/engine';

/** Onglets à visiter, dans l'ordre de la barre du bas. */
const TABS = ['Boutique', 'Campagnes', 'Brume', 'Recherche', 'Dissolution'];

const failures: string[] = [];
window.addEventListener('error', (e) => failures.push(`exception : ${e.message}`));
window.addEventListener('unhandledrejection', (e) =>
  failures.push(`promesse rejetée : ${String((e as PromiseRejectionEvent).reason)}`),
);

/**
 * On part d'une sauvegarde d'**avant-dernière version** : le test couvre donc
 * aussi la migration, qui est l'autre façon classique de casser le démarrage.
 */
function seedLegacySave() {
  const save = newGame() as unknown as Record<string, unknown>;
  delete save.daily;
  save.version = 15;
  save.character = 'fighter';
  localStorage.setItem('brume.save.v1', JSON.stringify(save));
}

const root = document.getElementById('root')!;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const text = () => (root.textContent ?? '').replace(/\s+/g, ' ').trim();

function click(label: string): boolean {
  const button = [...root.querySelectorAll('button')].find((b) =>
    (b.textContent ?? '').includes(label),
  );
  if (!button) return false;
  (button as HTMLButtonElement).click();
  return true;
}

/** Un écran est jugé vivant s'il affiche une quantité de texte crédible. */
function check(step: string, minLength = 60) {
  const content = text();
  if (content.length < minLength) {
    failures.push(`${step} : écran quasi vide (${content.length} caractères)`);
  } else {
    console.log(`  ✓ ${step}`);
  }
}

async function run() {
  seedLegacySave();
  const { default: App } = await import('../src/App');
  createRoot(root).render(<App />);
  await wait(300);

  if (!click('Jouer sans compte')) failures.push('écran de connexion : bouton absent');
  await wait(300);
  check('démarrage (sauvegarde v15 migrée)');

  for (const tab of TABS) {
    if (!click(tab)) {
      failures.push(`onglet ${tab} : bouton absent`);
      continue;
    }
    await wait(250);
    check(`onglet ${tab}`);
  }

  // Un départ en mission : c'est le chemin qui crée un second front de combat.
  click('Campagnes');
  await wait(200);
  if (click('Partir')) {
    await wait(600);
    check('mission lancée');
    if (!text().includes('Abandonner')) failures.push('mission lancée : pas de combat affiché');
  } else {
    failures.push('mission : bouton « Partir » absent');
  }

  // Achat au comptoir (mode test) : doit créditer sans exception.
  click('Boutique');
  await wait(200);
  if (!click('€')) failures.push('boutique : aucun prix cliquable');
  await wait(200);
  check('achat au comptoir');

  // Assez de temps de jeu pour franchir une vague et son temps mort : c'est là
  // que la barre de vie lisait un ennemi qui n'existait plus.
  click('Brume');
  await wait(2500);
  check('brume après quelques vagues');

  console.log('');
  if (failures.length) {
    console.log(`✘ ${failures.length} problème(s) :`);
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log('✔ Aucun plante-écran : tous les onglets répondent.');
  process.exit(0);
}

run();
