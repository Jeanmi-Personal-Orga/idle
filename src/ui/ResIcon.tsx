import { resourceDef, type ResourceId } from '../game/resources';

/**
 * Icône d'une ressource, découpée dans la planche `coin.png`. Rendue en pixel
 * art net, alignée sur la ligne de texte.
 */
export function ResIcon({ id, size = 16 }: { id: ResourceId; size?: number }) {
  const def = resourceDef(id);
  return (
    <img
      className="res-icon"
      src={def.icon}
      alt={def.name}
      title={`${def.name} — ${def.use}`}
      style={{ height: size }}
    />
  );
}
