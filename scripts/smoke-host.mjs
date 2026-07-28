/**
 * Hôte du test de fumée : fabrique un DOM avec jsdom, expose ce dont React et le
 * jeu ont besoin, puis exécute le paquet construit à partir de `smoke.tsx`.
 *
 * Le `performance` de Node est laissé en place volontairement : réexposer celui
 * de jsdom le fait s'appeler lui-même à l'infini.
 */
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<div id="root"></div>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
  runScripts: 'outside-only',
});
const w = dom.window;

globalThis.window = w;
globalThis.document = w.document;
globalThis.localStorage = w.localStorage;
globalThis.location = w.location;
globalThis.history = w.history;
globalThis.Element = w.Element;
globalThis.HTMLElement = w.HTMLElement;
globalThis.Node = w.Node;
globalThis.Event = w.Event;
globalThis.requestAnimationFrame = w.requestAnimationFrame.bind(w);
globalThis.cancelAnimationFrame = w.cancelAnimationFrame.bind(w);
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
// jsdom ne mesure rien : l'arène s'en sert pour ses boîtes de collision, un
// observateur inerte suffit à ce qu'elle se rende.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

await import('../node_modules/.smoke-bundle.mjs');
