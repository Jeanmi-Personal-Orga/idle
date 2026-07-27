import { useState } from 'react';
import { CHARACTERS, type CharacterId } from '../game/characters';
import { chooseCharacter } from '../game/engine';
import { store } from '../game/store';
import { Sprite } from './Sprite';

/**
 * Premier écran de l'aventure : qui descend dans la ville noyée.
 * Le choix ne touche à aucune statistique — il n'y a rien à optimiser ici, et
 * rien à regretter.
 */
export function CharacterSelect() {
  const [picked, setPicked] = useState<CharacterId>(CHARACTERS[0].id);

  return (
    <div className="intro">
      <div className="intro-head">
        <h1>L'Alchimiste de Brume</h1>
        <p className="muted">
          La ville est sous l'eau et la brume monte. Quelqu'un doit redescendre y
          distiller ce qui reste. Qui ?
        </p>
      </div>

      <div className="roster">
        {CHARACTERS.map((c) => (
          <button
            key={c.id}
            className={`roster-card ${picked === c.id ? 'picked' : ''}`}
            onClick={() => setPicked(c.id)}
            aria-pressed={picked === c.id}
          >
            <Sprite character={c.id} anim="idle" fps={6} zoom={0.72} />
            <b>{c.name}</b>
          </button>
        ))}
      </div>

      <div className="card intro-detail">
        <b>{CHARACTERS.find((c) => c.id === picked)!.name}</b>
        <div className="muted small">
          {CHARACTERS.find((c) => c.id === picked)!.blurb}
        </div>
        <div className="muted small">
          L'apparence seule change : tous distillent, encaissent et frappent pareil.
        </div>
        <button
          className="ascend"
          onClick={() => {
            store.act((s) => chooseCharacter(s, picked));
            // Écrit tout de suite : la sauvegarde périodique est à 5 s, et
            // fermer l'onglet avant renverrait le joueur sur ce même écran.
            store.save();
          }}
        >
          Descendre dans la brume
        </button>
      </div>
    </div>
  );
}
