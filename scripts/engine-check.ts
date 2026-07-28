/**
 * Vérifications du moteur, sans interface ni appareil.
 *
 * Le moteur (`src/game/`, hors magasin) est pur : ni DOM, ni React, ni natif. On
 * peut donc le faire tourner dans Node et contrôler ce qui compte vraiment — la
 * progression, les récompenses, les règles de combat — là où l'affichage ne se
 * juge qu'à l'œil sur un appareil.
 *
 * Usage : `npm run engine`
 */
import {
  STEP_TIME,
  WAVE_PAUSE,
  grantKeys,
  keysLeft,
  loseMission,
  newGame,
  refreshDaily,
  refreshKeys,
  startMission,
  step,
} from '../src/game/engine';
import { arenaLayout, CONTACT_GAP } from '../src/ui/arena-geometry';

let failures = 0;

function check(label: string, ok: boolean, detail = '') {
  if (!ok) failures++;
  console.log(`  ${ok ? '✓' : '✘'} ${label}${detail ? ` — ${detail}` : ''}`);
}

/** Fait tourner la partie `seconds` secondes, avec un aléa fixe. */
function run(state: ReturnType<typeof newGame>, seconds: number, rng = () => 0.5) {
  for (let i = 0; i < seconds * 10; i++) step(state, 0.1, rng);
}

console.log('Combat de brume :');
{
  const s = newGame();
  s.combat.district = 3;
  s.combat.wave = 12;
  s.combat.hero.hp = 1;
  let ticks = 0;
  while (s.combat.reviving <= 0 && ticks++ < 600) step(s, 0.1, () => 0.5);
  check('la mort est déclarée', s.combat.reviving > 0);
  const waveAtDeath = s.combat.wave;
  while (s.combat.reviving > 0) step(s, 0.1, () => 0.5);
  check('une chute coûte une vague, pas le chapitre', s.combat.wave === waveAtDeath - 1,
    `vague ${waveAtDeath} → ${s.combat.wave}`);
  check('la scène se remet en ordre sous le noir', s.combat.interludeFrom === 'death' && s.combat.enemies.length === 0);
}
{
  // Vague à plusieurs : l'approche doit se rouvrir à chaque mort, pour que le
  // héros marche jusqu'au rang suivant avant de frapper.
  const s = newGame();
  s.combat.district = 3;
  s.combat.wave = 5;
  s.combat.enemies = [];
  step(s, 0.1, () => 0.5); // fait naître la vague
  check('la vague compte plusieurs ennemis', s.combat.enemies.length > 1,
    `${s.combat.enemies.length} ennemis`);
  // On amène tout le monde au contact, puis on tue le premier rang.
  s.combat.closing = 0;
  s.combat.hero.hp = 1e12;
  s.combat.enemies[0].hp = 0.01;
  const alive = s.combat.enemies.length;
  let guard = 0;
  while (s.combat.enemies.filter((e) => e.hp > 0).length === alive && guard++ < 100) {
    step(s, 0.1, () => 0.5);
  }
  check('un pas d’approche se rouvre après la mort du premier rang',
    Math.abs(s.combat.closing - STEP_TIME) < 0.11, `${s.combat.closing.toFixed(1)}s`);
}

console.log('\nMissions du jour :');
{
  const s = newGame();
  s.ascension.deepest = 4;
  s.daily.day = 'hier';
  refreshDaily(s);
  check('trois missions tirées', s.daily.missions.length === 3);
  check('une par monnaie', new Set(s.daily.missions.map((m) => m.campaign)).size === 3);

  const before = keysLeft(s);
  startMission(s, s.daily.missions[0].id);
  check('une clé part à la tentative', keysLeft(s) === before - 1);
  loseMission(s, 'test');
  check('la défaite rend la clé', keysLeft(s) === before);
  check('la défaite est notée', s.daily.missions[0].status === 'lost');

  // Victoire forcée : héros invincible, ennemis à un souffle.
  startMission(s, s.daily.missions[0].id);
  for (let i = 0; i < 60 * 60 * 20 && s.mission; i++) {
    s.mission.hero.hp = 1e12;
    s.mission.enemies.forEach((e) => (e.hp = Math.min(e.hp, 5)));
    step(s, 0.1, () => 0.5);
  }
  check('la victoire consomme la clé', keysLeft(s) === before - 1);
  check('la victoire est notée', s.daily.missions[0].status === 'won');
  check('la récompense est payée', s.resources.essence > 0);
}
{
  // Les clés achetées survivent au changement de jour.
  const s = newGame();
  grantKeys(s, 5);
  s.keys.day = 'hier';
  refreshKeys(s);
  refreshDaily(s);
  check('les clés achetées ne se périment pas', s.keys.bought === 5, `${keysLeft(s)} en poche`);
  check('la dotation du jour repart à trois', s.keys.left === 3);
}

console.log('\nProgression hors interface :');
{
  const s = newGame();
  run(s, 60 * 60);
  check('la partie avance sans planter', s.combat.district >= 0 && s.resources.reagent > 0,
    `chapitre ${s.combat.district + 1}, vague ${s.combat.wave}, ${Math.round(s.resources.reagent)} réactifs`);
  check('le temps mort entre vagues est borné', (s.combat.interlude ?? 0) <= WAVE_PAUSE);
}

console.log('\nGéométrie de l’arène :');
{
  const l = arenaLayout(368, 96, 90, 0.5);
  const heroBoxRight = l.heroLeft + 96 - l.heroInset + l.heroTravel;
  const foeBoxLeft = l.foeLeft + l.foeInset - l.foeTravel;
  check('arrivée au contact, sans dépassement', Math.abs(foeBoxLeft - heroBoxRight - CONTACT_GAP) < 0.01,
    `${Math.round((foeBoxLeft - heroBoxRight) * 100) / 100} px`);
}

console.log('');
if (failures) {
  console.log(`✘ ${failures} vérification(s) en échec.`);
  process.exit(1);
}
console.log('✔ Moteur conforme.');
