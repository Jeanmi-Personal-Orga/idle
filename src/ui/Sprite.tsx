import { useEffect, useState } from 'react';
import { Image, View, type ViewStyle } from 'react-native';
import { animData, spriteHeight, spriteSize } from '../game/sprites';
import { image } from '../game/images';

/**
 * Rendu d'un sprite : une case de planche, affichée dans une boîte à l'échelle.
 *
 * En web, une case se découpait avec `background-position`. React Native n'a pas
 * de background CSS : on met donc la planche entière dans une `Image` **plus
 * grande que la boîte**, décalée pour amener la bonne case dans le cadre, et la
 * boîte coupe le reste (`overflow: 'hidden'`). C'est la même idée, exprimée avec
 * les outils du natif.
 *
 * L'échelle vient de la taille visée pour la famille (`spriteHeight`) : les
 * personnages sont des cases de 32 px, les ennemis des bandes de 64 px. Les mettre
 * à la même échelle brute donnerait des chauves-souris géantes.
 */
export function Sprite({
  character,
  anim = 'idle',
  fallbackAnim,
  scale = 1,
  flip = false,
  fade = false,
  style,
}: {
  character: string;
  anim?: string;
  /** Animations de repli si `anim` n'existe pas pour cette créature. */
  fallbackAnim?: string[];
  /** Multiplicateur de la hauteur de référence de la famille. */
  scale?: number;
  flip?: boolean;
  /** Éclat blanc à l'impact : rendu par un voile, faute de filtres CSS. */
  fade?: boolean;
  style?: ViewStyle;
}) {
  const data = animData(character, [anim, ...(fallbackAnim ?? [])]);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!data || data.cells.length <= 1) return;
    setFrame(0);
    const id = setInterval(() => {
      setFrame((p) => {
        const n = p + 1;
        if (n >= data.cells.length) return data.loop ? 0 : p;
        return n;
      });
    }, 1000 / data.fps);
    return () => clearInterval(id);
  }, [data]);

  if (!data) return null;
  const source = image(data.sheet);
  if (!source) return null;

  const [cw, ch] = data.cell;
  const zoom = (spriteHeight(character) / ch) * scale;
  const [col, line] = data.cells[Math.min(frame, data.cells.length - 1)];
  const { width, height } = spriteSize(character, scale);
  // Taille réelle de la planche, donnée par le registre d'assets de Metro : c'est
  // exact et synchrone, là où la deviner déformerait les cases.
  const sheet = Image.resolveAssetSource(source);

  return (
    <View
      style={[
        { width, height, overflow: 'hidden', position: 'relative' },
        // Le miroir s'applique à la boîte : en natif, l'image à l'intérieur est
        // positionnée en absolu, donc rien ne vient écraser cette transformation.
        flip && { transform: [{ scaleX: -1 }] },
        style,
      ]}
    >
      <Image
        source={source}
        // La planche entière, mise à l'échelle, décalée pour cadrer la bonne case.
        style={{
          position: 'absolute',
          left: -col * cw * zoom,
          top: -line * ch * zoom,
          width: sheet.width * zoom,
          height: sheet.height * zoom,
        }}
        // Pixel art : l'agrandissement doit rester net, sans lissage.
        resizeMode="stretch"
        fadeDuration={0}
      />
      {fade && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.55)',
          }}
        />
      )}
    </View>
  );
}
