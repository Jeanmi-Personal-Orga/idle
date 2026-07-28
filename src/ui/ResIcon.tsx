import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { resourceDef, type ResourceId } from '../game/resources';
import { image } from '../game/images';

/**
 * Icône d'une ressource, découpée dans la planche `coin.png`.
 *
 * Les trois monnaies métalliques tournent : la planche fournit seize cases, qu'on
 * fait défiler. En web c'était une animation CSS en `steps()` ; ici c'est un
 * compteur d'images, puisqu'il n'y a plus de `background-position` à animer.
 */

/** Ressources dont la planche fournit une rotation complète. */
const SPINNING: ResourceId[] = ['goldCoin', 'essence', 'reagent'];

/**
 * Seize cases, dont douze de face pleine : à 16 px, les frames de tranche font
 * deux pixels de large et la pièce semble disparaître. La rotation ne doit être
 * qu'un bref clin d'œil.
 */
const SPIN_FRAMES = 16;
/** Une rotation toutes les cinq secondes, décalée d'une monnaie à l'autre. */
const SPIN_PERIOD = 5000;
const FRAME_MS = 55;

export function ResIcon({ id, size = 16 }: { id: ResourceId; size?: number }) {
  const def = resourceDef(id);
  const spinning = SPINNING.includes(id);
  const frame = useSpin(spinning ? SPINNING.indexOf(id) * 700 : -1);
  const strip = spinning ? image(`ui/${id}-spin${SPIN_FRAMES}`) : undefined;

  if (strip) {
    return (
      <View style={{ width: size, height: size, overflow: 'hidden' }}>
        <Image
          source={strip}
          style={{
            position: 'absolute',
            left: -frame * size,
            width: size * SPIN_FRAMES,
            height: size,
          }}
          resizeMode="stretch"
          fadeDuration={0}
        />
      </View>
    );
  }

  const flat = image(def.icon);
  if (!flat) return <View style={{ width: size, height: size }} />;
  return <Image source={flat} style={{ width: size, height: size }} resizeMode="contain" />;
}

/**
 * Case courante de la rotation. Hors du clin d'œil la pièce reste de face : on ne
 * fait donc défiler les cases qu'une seconde toutes les cinq. `delay` négatif
 * signifie « pas de rotation ».
 */
function useSpin(delay: number): number {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (delay < 0) return;
    let stepper: ReturnType<typeof setInterval> | undefined;
    let loop: ReturnType<typeof setInterval> | undefined;

    const spinOnce = () => {
      let i = 0;
      stepper = setInterval(() => {
        i += 1;
        if (i >= SPIN_FRAMES) {
          if (stepper) clearInterval(stepper);
          setFrame(0);
          return;
        }
        setFrame(i);
      }, FRAME_MS);
    };

    const start = setTimeout(() => {
      spinOnce();
      loop = setInterval(spinOnce, SPIN_PERIOD);
    }, delay);

    return () => {
      clearTimeout(start);
      if (loop) clearInterval(loop);
      if (stepper) clearInterval(stepper);
    };
  }, [delay]);

  return frame;
}
