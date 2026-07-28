/**
 * Vérifie l'arithmétique de placement de l'arène — la seule partie de la mise en
 * scène qui peut se contrôler sans navigateur.
 *
 * Elle existe parce que trois corrections de suite ont échoué : la géométrie
 * reposait sur des mesures du DOM, et personne ne pouvait dire, hors d'un
 * navigateur, si le calcul était juste. Maintenant qu'il est arithmétique, il se
 * vérifie ici.
 *
 * Usage : `npm run geometry`
 */
import {
  CONTACT_GAP,
  EDGE,
  FOE_BOX,
  HERO_BOX,
  arenaLayout,
  boxInset,
  fileSpacing,
} from '../node_modules/.geometry.mjs';

let failures = 0;
function check(label, actual, expected) {
  const ok = Math.abs(actual - expected) < 0.01;
  if (!ok) failures++;
  console.log(`  ${ok ? '✓' : '✘'} ${label} : ${Math.round(actual * 100) / 100}` +
    (ok ? '' : ` (attendu ${expected})`));
}

/** Bords des boîtes de collision à l'arrivée, une fois les marches jouées. */
function arrival(arenaWidth, heroWidth, foeWidth, heroShare) {
  const l = arenaLayout(arenaWidth, heroWidth, foeWidth, heroShare);
  return {
    heroRight: l.heroLeft + heroWidth - l.heroInset + l.heroTravel,
    foeLeft: l.foeLeft + l.foeInset - l.foeTravel,
    layout: l,
  };
}

// Cas courants : une scène de téléphone (368 px), un héros de 96 px, des ennemis
// de 90 à 144 px.
const CASES = [
  ['deux au corps à corps', 368, 96, 90, 0.5],
  ['ennemi volant, le héros traverse', 368, 96, 64, 1],
  ['héros à distance, l’ennemi traverse', 368, 96, 90, 0],
  ['gardien large sur petite scène', 320, 96, 144, 0.5],
  ['scène très étroite', 200, 96, 96, 0.5],
];

console.log('Écart entre les boîtes au contact, tous cas confondus :');
for (const [label, arenaWidth, heroWidth, foeWidth, share] of CASES) {
  const { heroRight, foeLeft } = arrival(arenaWidth, heroWidth, foeWidth, share);
  // Sur une scène trop étroite, les deux se tiennent au plus près possible sans
  // se chevaucher : l'écart peut être nul, jamais négatif.
  const gap = foeLeft - heroRight;
  const ok = gap >= -0.01 && gap <= CONTACT_GAP + 0.01;
  if (!ok) failures++;
  console.log(`  ${ok ? '✓' : '✘'} ${label} : ${Math.round(gap * 100) / 100} px`);
}

console.log('\nRépartition de la marche :');
{
  const l = arenaLayout(368, 96, 90, 0.5);
  check('le héros couvre la moitié', l.heroTravel, l.foeTravel);
  check('départ du héros', l.heroLeft, EDGE);
  check("départ de l'ennemi", l.foeLeft, 368 - EDGE - 90);
}
{
  const l = arenaLayout(368, 96, 64, 1);
  check("l'ennemi volant ne bouge pas", l.foeTravel, 0);
  check(
    'le héros couvre tout',
    l.heroTravel,
    368 - EDGE - 64 + boxInset(64, FOE_BOX) - (EDGE + 96 - boxInset(96, HERO_BOX)) - CONTACT_GAP,
  );
}

console.log('\nBoîtes de collision :');
{
  check('boîte du héros (case de 96)', 96 * HERO_BOX, 76.8);
  check('boîte d’un ennemi (case de 90)', 90 * FOE_BOX, 40.5);
  const l = arenaLayout(368, 96, 90, 0.5);
  // Les cases se chevauchent à l'arrivée : c'est voulu, leur vide ne compte pas.
  const caseGap = l.foeLeft - l.foeTravel - (l.heroLeft + 96 + l.heroTravel);
  console.log(
    `  · les cases se chevauchent de ${Math.round(-caseGap)} px à l'arrivée (le vide des planches)`,
  );
}
{
  const l = arenaLayout(368, 96, 90, 0);
  check('le héros à distance ne bouge pas', l.heroTravel, 0);
}

console.log('\nFile ennemie :');
check('écart entre deux rangs (case de 90)', fileSpacing(90), Math.round(90 * FOE_BOX) + CONTACT_GAP);

console.log('');
if (failures) {
  console.log(`✘ ${failures} vérification(s) en échec.`);
  process.exit(1);
}
console.log('✔ La géométrie de l’arène est cohérente : arrivée au contact, sans dépassement.');
