"use client";
import { BEDTIME_HOUR_OPTIONS, WAKE_HOUR_OPTIONS } from "@/features/sleep/constants";
import { DayStrip } from "@/shared/ui/day-strip";
import { SaveButtonContent } from "@/shared/ui/save-button";
import { TimeFieldPicker } from "@/shared/ui/time-dropdown";
import { normalizeClock, sleepDuration } from "@/domain/dates";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/features/app-shell/workspace";

/** Sueño: registrar la noche de cualquier día y ver la regularidad de la semana. */
export function SleepSection() {
  const {
    today,
    week,
    data,
    saving,
    savePhase,
    entryDayLabel,
    historicalScore,
    submitForm,
  } = useWorkspace();
  /* eslint-disable react-hooks/set-state-in-effect */
  const [sleepEntryDate, setSleepEntryDate] = useState(today);
  const [sleepBedtime, setSleepBedtime] = useState("23:00");
  const [sleepWaketime, setSleepWaketime] = useState("07:00");
  const [sleepQuality, setSleepQuality] = useState<"good" | "bad" | null>(null);
  const calculatedSleepMinutes = sleepDuration(sleepBedtime, sleepWaketime);
  useEffect(() => {
    const checkin = data.dailyCheckins.find((item) => item.entryDate === sleepEntryDate);
    setSleepBedtime(checkin ? normalizeClock(checkin.bedtime, "23:00") : "23:00");
    setSleepWaketime(checkin ? normalizeClock(checkin.wakeTime, "07:00") : "07:00");
    setSleepQuality(checkin?.sleepQuality === "good" || checkin?.sleepQuality === "bad" ? checkin.sleepQuality : null);
  }, [data.dailyCheckins, sleepEntryDate]);

  const sleepPanel = <section className="module-stack sleep-page">
    <div className="split-grid">
      <article className="panel"><div className="panel-heading"><div><p>DESCANSO DE {entryDayLabel(sleepEntryDate)}</p><h2>Registrar sueño</h2></div><div className="meal-panel-actions"><span className="sleep-icon">☾</span></div></div>
        <DayStrip label="Elegí la noche que querés registrar" value={sleepEntryDate} today={today} onChange={setSleepEntryDate} markedDates={new Set(data.dailyCheckins.filter((item) => item.sleepMinutes > 0).map((item) => item.entryDate))} />
        {historicalScore(sleepEntryDate)}
        <form className="data-form sleep-form" onSubmit={(event) => void submitForm(event, { action: "save_sleep", date: sleepEntryDate, sleepMinutes: calculatedSleepMinutes, bedtime: sleepBedtime, wakeTime: sleepWaketime, sleepQuality })}>
          <div className="sleep-duration-badge"><span>TIEMPO CALCULADO</span><b>{Math.floor(calculatedSleepMinutes / 60)} h {calculatedSleepMinutes % 60 ? calculatedSleepMinutes % 60 + " min" : ""}</b><small>Entre la hora de acostarte y la de despertarte</small></div>
          <div className="sleep-time-grid">
            <div className="time-picker-card">
              <span className="time-symbol">☾</span>
              <TimeFieldPicker idPrefix="sleep-bedtime" label="Me acosté" value={sleepBedtime} onChange={setSleepBedtime} hourOptions={BEDTIME_HOUR_OPTIONS} />
            </div>
            <div className="time-picker-card wake">
              <span className="time-symbol">☀</span>
              <TimeFieldPicker idPrefix="sleep-waketime" label="Me desperté" value={sleepWaketime} onChange={setSleepWaketime} hourOptions={WAKE_HOUR_OPTIONS} />
            </div>
          </div>
          <p className="sleep-form-note">Elegí la hora de la lista: sin escribir y sin AM/PM.</p>
          {calculatedSleepMinutes > 0 && <fieldset className="sleep-quality-picker">
            <legend>¿Cómo fue tu sueño?</legend>
            <div className="sleep-quality-options">
              <button type="button" className={sleepQuality === "good" ? "active good" : "good"} aria-pressed={sleepQuality === "good"} onClick={() => setSleepQuality("good")}>Bueno</button>
              <button type="button" className={sleepQuality === "bad" ? "active bad" : "bad"} aria-pressed={sleepQuality === "bad"} onClick={() => setSleepQuality("bad")}>Malo</button>
            </div>
          </fieldset>}
          <button className="primary-action" disabled={saving}><SaveButtonContent label="Guardar descanso" phase={savePhase("save_sleep")} /></button>
        </form>
      </article>
      <article className="panel sleep-summary"><div className="panel-heading"><div><p>ÚLTIMOS 7 DÍAS</p><h2>Regularidad</h2></div></div>
        <div className="sleep-bars">{week.map((day) => { const minutes = data.dailyCheckins.find((item) => item.entryDate === day.iso)?.sleepMinutes ?? 0; return <div key={day.iso}><span><i style={{ height: String(Math.min(100, minutes / 600 * 100)) + "%" }} /></span><b>{minutes ? Math.round(minutes / 6) / 10 : "—"}</b><small>{day.short}</small></div>; })}</div>
        <p className="soft-note">Objetivo visual de referencia: 8 horas. Cada persona puede necesitar un rango diferente.</p>
      </article>
    </div>
    <article className="panel wearable-panel"><div className="wearable-copy"><span className="wearable-icon">⌚</span><div><p>DISPOSITIVO DE SALUD</p><h2>Importar el sueño desde tu reloj</h2><small>Al conectarlo podremos traer duración real, etapas del sueño, frecuencia cardíaca, oxígeno y regularidad, según lo que admita tu dispositivo.</small></div></div><div className="wearable-actions"><div className="wearable-badges"><span>Apple Health</span><span>Health Connect</span><span>Garmin</span></div><button type="button" disabled>Elegir dispositivo · próximo paso</button></div></article>
  </section>;
  /* eslint-enable react-hooks/set-state-in-effect */

  return sleepPanel;
}
