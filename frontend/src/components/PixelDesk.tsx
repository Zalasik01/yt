import type { AgentStatus } from '../api/types';
import { STAGE_COLORS } from '../lib/format';

/** Estação de trabalho em pixel art: robô + monitor + mesa. */
export function PixelDesk({ agent }: { agent: AgentStatus }) {
  const color = STAGE_COLORS[agent.stage] ?? '#888';
  const active = agent.state === 'working';
  const asleep = agent.state === 'idle';

  return (
    <div className="desk" data-state={agent.state}>
      {agent.speech && <div className="bubble" title={agent.speech}>{agent.speech}</div>}
      {agent.state === 'done' && <span className="done-check">✓</span>}
      <svg viewBox="0 0 60 44" shapeRendering="crispEdges" aria-hidden>
        {/* monitor */}
        <rect x="31" y="5" width="24" height="17" fill="#05060f" />
        <rect className="screen" x="33" y="7" width="20" height="13" fill={active ? color : '#1d2246'} />
        {active && (
          <>
            <rect x="35" y="10" width="10" height="2" fill="#05060f" opacity=".5" />
            <rect x="35" y="14" width="14" height="2" fill="#05060f" opacity=".5" />
          </>
        )}
        <rect x="41" y="22" width="4" height="4" fill="#05060f" />
        {/* robô */}
        <g className="bot">
          <rect x="17" y="0" width="2" height="4" fill="#05060f" />
          <rect x="16" y="0" width="4" height="2" fill={color} />
          <rect x="9" y="4" width="18" height="14" fill={color} />
          <rect x="9" y="4" width="18" height="2" fill="#fff" opacity=".18" />
          {asleep ? (
            <>
              <rect x="12" y="10" width="4" height="1" fill="#05060f" />
              <rect x="20" y="10" width="4" height="1" fill="#05060f" />
            </>
          ) : (
            <>
              <rect x="12" y="8" width="4" height="4" fill="#05060f" />
              <rect x="20" y="8" width="4" height="4" fill="#05060f" />
              <rect x="13" y="9" width="2" height="2" fill="#fff" />
              <rect x="21" y="9" width="2" height="2" fill="#fff" />
            </>
          )}
          <rect x="14" y="14" width="8" height="1" fill="#05060f" opacity=".6" />
          <rect x="11" y="18" width="14" height="8" fill={color} opacity=".75" />
        </g>
        {/* mesa */}
        <rect x="1" y="26" width="58" height="5" fill="#3b4382" />
        <rect x="1" y="26" width="58" height="1" fill="#5560a8" />
        <rect x="4" y="31" width="52" height="11" fill="#262c5c" />
        <rect x="8" y="34" width="10" height="2" fill={active ? color : '#3b4382'} />
        <rect x="42" y="34" width="10" height="2" fill="#3b4382" />
        <rect x="30" y="24" width="14" height="2" fill="#11142a" />
      </svg>
      <div className="desk-label">
        {agent.position} · {agent.label}
      </div>
    </div>
  );
}

/** Você, no sofá, esperando os agentes trabalharem. */
export function PixelLounge({ waiting }: { waiting: boolean }) {
  return (
    <div className="lounge-sofa">
      {waiting && <div className="bubble">tem vídeo esperando o seu OK!</div>}
      <svg viewBox="0 0 80 46" shapeRendering="crispEdges" aria-hidden style={{ marginTop: 40, width: '100%' }}>
        <rect x="2" y="18" width="76" height="20" fill="#1f3cff" />
        <rect x="2" y="18" width="76" height="3" fill="#4d66ff" />
        <rect x="0" y="24" width="8" height="18" fill="#1730cc" />
        <rect x="72" y="24" width="8" height="18" fill="#1730cc" />
        <rect x="6" y="38" width="4" height="6" fill="#05060f" />
        <rect x="70" y="38" width="4" height="6" fill="#05060f" />
        <g>
          <rect x="31" y="2" width="18" height="14" fill="#ffd60a" />
          <rect x="34" y="6" width="4" height="4" fill="#05060f" />
          <rect x="42" y="6" width="4" height="4" fill="#05060f" />
          <rect x="36" y="12" width="8" height="1" fill="#05060f" />
          <rect x="33" y="16" width="14" height="10" fill="#e6c000" />
          <rect x="50" y="18" width="6" height="7" fill="#fff" />
          <rect x="56" y="20" width="2" height="3" fill="#fff" />
        </g>
      </svg>
      <div className="lounge-label">você</div>
    </div>
  );
}

export function PixelPlant() {
  return (
    <svg className="plant" viewBox="0 0 12 18" shapeRendering="crispEdges" aria-hidden>
      <rect x="5" y="0" width="2" height="4" fill="#3ee06b" />
      <rect x="2" y="3" width="3" height="3" fill="#3ee06b" />
      <rect x="7" y="2" width="3" height="4" fill="#2bb455" />
      <rect x="4" y="5" width="4" height="4" fill="#2bb455" />
      <rect x="2" y="10" width="8" height="8" fill="#c0392b" />
      <rect x="2" y="10" width="8" height="2" fill="#e05545" />
    </svg>
  );
}
