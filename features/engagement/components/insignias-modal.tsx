"use client";
import { BADGE_DEFINITIONS } from "@/features/engagement/logic/badges";
import { BadgeEmblem } from "@/features/engagement/components/badge-icons";
import type { BadgeStats } from "@/features/engagement/logic/badges";

export function InsigniasModal({ stats, onClose }: { stats: BadgeStats; onClose: () => void }) {
  const groups = [...new Set(BADGE_DEFINITIONS.map((badge) => badge.group))];
  return <div className="insignias-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="insignias-dialog" role="dialog" aria-modal="true" aria-labelledby="insignias-title">
      <button type="button" className="insignias-close" onClick={onClose} aria-label="Cerrar insignias">×</button>
      <p className="insignias-eyebrow">TUS LOGROS</p>
      <h2 id="insignias-title">Mis Insignias</h2>
      <p className="insignias-intro">Cada insignia se ilumina cuando alcanzás el objetivo.</p>
      {groups.map((group) => <section className="insignias-group" key={group}>
        <h3>{group}</h3>
        <div className="insignias-grid">{BADGE_DEFINITIONS.filter((badge) => badge.group === group).map((badge) => {
          const value = stats[badge.metric];
          const unlocked = value >= badge.target;
          const percent = Math.min(100, Math.round(value / badge.target * 100));
          return <article className={"insignia-card " + (unlocked ? "unlocked" : "locked")} key={badge.id}>
            <BadgeEmblem className="insignia-icon" symbol={badge.symbol} tier={badge.tier} locked={!unlocked} size={46} />
            <b>{badge.title}</b>
            <small>{unlocked ? "Completada" : `${Math.min(value, badge.target)} de ${badge.target}`}</small>
            {!unlocked && <span className="insignia-progress"><i style={{ width: `${percent}%` }} /></span>}
          </article>;
        })}</div>
      </section>)}
    </section>
  </div>;
}
