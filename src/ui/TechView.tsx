import { useState } from 'react';
import { formatDuration, formatNum } from '../game/engine';
import { resourceDef } from '../game/resources';
import { store, useGame } from '../game/store';
import {
  BRANCHES,
  NODES,
  isUnlocked,
  nodeCost,
  nodeDef,
  nodeLevel,
  nodesOf,
  research,
  researchWithCatalyst,
  totalInvested,
  type BranchId,
  type TechNode,
} from '../game/tech';

export function TechView() {
  const state = useGame();
  const [branch, setBranch] = useState<BranchId>('puissance');
  const def = BRANCHES.find((b) => b.id === branch)!;
  const affordable = NODES.filter(
    (n) =>
      isUnlocked(state, n) &&
      nodeLevel(state, n.id) < n.max &&
      state.resources.insight >= nodeCost(n, nodeLevel(state, n.id)),
  ).length;

  return (
    <div className="view">
      <div className="card tech-paper">
        <div className="row between">
          <div>
            <div className="label">Recherche</div>
            <div className="muted small">
              <span className="res-insight">◇ {formatNum(state.resources.insight)}</span>{' '}
              {resourceDef('insight').name.toLowerCase()} ·{' '}
              {affordable > 0 ? `${affordable} nœud(s) à portée` : 'rien à portée'}
              {state.resources.catalyst > 0 &&
                ` · ${resourceDef('catalyst').icon} ${formatNum(state.resources.catalyst)}`}
            </div>
          </div>
        </div>
        <div className="branch-tabs">
          {BRANCHES.map((b) => (
            <button
              key={b.id}
              className={b.id === branch ? 'active' : ''}
              style={b.id === branch ? { color: b.color, borderColor: b.color + '66' } : undefined}
              onClick={() => setBranch(b.id)}
            >
              <b>{b.name}</b>
              <span className="muted small">{totalInvested(state, b.id)} niv.</span>
            </button>
          ))}
        </div>
        <div className="muted small">{def.blurb}</div>
        {state.researching && (
          <div className="muted small">
            ⧗ Recherche en cours : {nodeDef(state.researching.id).name} ·{' '}
            {formatDuration(state.researching.remaining)} restant
          </div>
        )}
      </div>

      <div className="stack">
        {nodesOf(branch).map((node) => (
          <NodeCard key={node.id} node={node} color={def.color} />
        ))}
      </div>
    </div>
  );
}

function NodeCard({ node, color }: { node: TechNode; color: string }) {
  const state = useGame();
  const level = nodeLevel(state, node.id);
  const unlocked = isUnlocked(state, node);
  const maxed = level >= node.max;
  const cost = nodeCost(node, level);
  const active = state.researching?.id === node.id;
  const busyOther = !!state.researching && !active;
  const affordable = !maxed && unlocked && !state.researching && state.resources.insight >= cost;

  if (!unlocked) {
    const req = node.requires!;
    return (
      <div className="card empty">
        <div>
          <b>{node.name}</b>
          <div className="muted small">
            Requiert {nodeDef(req.node).name} niv. {req.level}
          </div>
        </div>
        <span className="muted">🔒</span>
      </div>
    );
  }

  return (
    <div
      className={`card node tech-paper ${level > 0 ? 'owned' : ''} ${node.requires ? 'linked' : ''}`}
      style={maxed ? { borderColor: color + '88' } : undefined}
    >
      <div className="row between">
        <div>
          <b style={maxed ? { color } : undefined}>{node.name}</b>
          <div className="muted small">
            {level > 0 ? node.effect(level) : 'aucun niveau'}
          </div>
        </div>
        <div className="right">
          <div className="label" style={{ color: maxed ? color : undefined }}>
            {level} / {node.max}
          </div>
        </div>
      </div>

      <div className="bar">
        <div
          className="fill"
          style={{ width: `${(level / node.max) * 100}%`, background: color }}
        />
      </div>

      {!maxed && (
        <>
          <div className="muted small">Prochain : {node.effect(level + 1)}</div>
          {active ? (
            <div className="row">
              <div className="muted small">
                Recherche en cours · {formatDuration(state.researching!.remaining)} restant
              </div>
              {state.resources.catalyst > 0 && (
                <button
                  className="ghost"
                  onClick={() => store.act((s) => researchWithCatalyst(s, node.id))}
                >
                  ⧗ Passer avec un catalyseur
                </button>
              )}
            </div>
          ) : (
            <div className="row">
              <button
                disabled={!affordable}
                onClick={() => store.act((s) => research(s, node.id))}
              >
                Chercher <span className="muted small">◇ {formatNum(cost)}</span>
              </button>
              {busyOther && <span className="muted small">Une recherche est déjà en cours</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
