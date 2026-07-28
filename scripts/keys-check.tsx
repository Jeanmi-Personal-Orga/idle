import { createRoot } from 'react-dom/client';
import { newGame } from '../src/game/engine';

const save = newGame() as unknown as Record<string, unknown>;
save.character = 'fighter';
localStorage.setItem('brume.save.v1', JSON.stringify(save));

const root = document.getElementById('root')!;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const click = (label: string) => {
  const b = [...root.querySelectorAll('button')].find((x) => (x.textContent ?? '').includes(label));
  if (!b) return false;
  (b as HTMLButtonElement).click();
  return true;
};
const around = (needle: string) => {
  const t = (root.textContent ?? '').replace(/\s+/g, ' ');
  const i = t.indexOf(needle);
  return i < 0 ? '(absent)' : t.slice(Math.max(0, i - 30), i + 60);
};

(async () => {
  const { default: App } = await import('../src/App');
  createRoot(root).render(<App />);
  await wait(400);
  click('Jouer sans compte');
  await wait(300);
  click('Boutique');
  await wait(300);
  console.log('boutique avant :', around('en poche'));
  click('3,99');
  await wait(300);
  console.log('boutique après :', around('en poche'));
  click('Campagnes');
  await wait(300);
  console.log('campagnes      :', around('clés'));
  const { store } = await import('../src/game/store');
  console.log('état moteur    : keys.left =', store.state.keys.left);
  process.exit(0);
})();
