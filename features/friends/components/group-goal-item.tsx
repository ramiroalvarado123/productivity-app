"use client";
import {
  accentFor, goalCompleted, goalPercent, goalPeriodLabel, goalSource, goalTotal, goalUnit, goalValueOf, initialsFor,
  type GroupGoal, type GroupMember,
} from "@/features/friends/logic/social";

/**
 * Un objetivo dentro de la tarjeta del grupo. Si es "shared" muestra un total
 * que suman todos; si es "individual" muestra cuántos llegaron a su propia meta
 * y la barra de cada integrante.
 */
export function GroupGoalItem({ goal, members, myEmail, saving, onLog }: {
  goal: GroupGoal;
  members: GroupMember[];
  myEmail: string;
  saving: boolean;
  onLog: (goalId: number, value: number) => void;
}) {
  const unit = goalUnit(goal);
  const mine = goalValueOf(goal, myEmail);
  const emails = members.map((member) => member.userEmail);
  const individual = goal.mode === "individual";
  const completed = goalCompleted(goal, emails);

  return <li>
    <div className="group-goal-head">
      <div><small>{goalPeriodLabel(goal)}{individual ? " · CADA UNO" : ""}</small><b>{goal.title}</b></div>
      {individual
        ? <p><strong>{completed}/{members.length}</strong><small>cumplieron</small></p>
        : <p><strong>{goalTotal(goal)}</strong><small>de {goal.targetValue} {unit}</small></p>}
    </div>
    <div className="accountability-track"><i style={{ width: `${goalPercent(goal, emails)}%` }} /></div>
    <div className="group-goal-mine">
      {goal.source === "manual" ? <>
        <span>Tu marca</span>
        <button type="button" aria-label="Restar una" disabled={saving || mine <= 0} onClick={() => onLog(goal.id, mine - 1)}>−</button>
        <b>{mine}</b>
        <button type="button" aria-label="Sumar una" disabled={saving} onClick={() => onLog(goal.id, mine + 1)}>+</button>
      </> : <span className="group-goal-auto">↻ Se cuenta solo con lo que registrás en {goalSource(goal.source).label} · <b>{mine} {unit}</b></span>}
    </div>
    {(members.length > 1 || individual) && <ul className="group-goal-contributions">
      {members.map((member) => {
        const value = goalValueOf(goal, member.userEmail);
        const reached = individual && value >= goal.targetValue;
        return <li key={member.userEmail} className={reached ? "is-done" : ""}>
          <span className={"friend-avatar " + accentFor(member.userEmail)}>{initialsFor(member.displayName)}</span>
          <b>{member.displayName}</b>
          <small>{individual ? `${value}/${goal.targetValue} ${unit}` : `${value} ${unit}`}{reached ? " ✓" : ""}</small>
        </li>;
      })}
    </ul>}
  </li>;
}
