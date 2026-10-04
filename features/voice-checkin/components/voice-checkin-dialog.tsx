"use client";
import { MAX_VOICE_UPLOAD_BYTES, VOICE_AUTO_STOP_BYTES } from "@/features/voice-checkin/constants";
import { SaveButtonContent } from "@/shared/ui/save-button";
import type { VoiceCheckin } from "@/shared/data/types";
import { dayClose } from "@/features/home/logic/review";
import { formatFocusHours } from "@/shared/lib/numbers";
import { listPhrase } from "@/shared/lib/format";
import { readJson } from "@/shared/api/read-json";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/features/app-shell/workspace";

/** Cierre del día: balance de hoy y grabación por voz que se reparte en cada sección. */
export function VoiceCheckinDialog() {
  const {
    today,
    data,
    saving,
    setError,
    voiceOpen,
    setVoiceOpen,
    nowMinutes,
    savePhase,
    save,
    trainedToday,
    calories,
    pagesToday,
    sleepToday,
    focusToday,
    score,
    todayBlocks,
    closeNotices,
  } = useWorkspace();
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceResult, setVoiceResult] = useState<VoiceCheckin | null>(null);
  const [voiceSaved, setVoiceSaved] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingBytesRef = useRef(0);
  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setRecordingSeconds((seconds) => {
      if (seconds >= 59) {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
        return 60;
      }
      return seconds + 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);
  async function analyzeVoiceBlob(blob: Blob, mimeType: string) {
    setVoiceLoading(true);
    setVoiceResult(null);
    setVoiceSaved(false);
    try {
      const form = new FormData();
      const extension = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
      form.append("audio", new File([blob], "cierre-del-dia." + extension, { type: mimeType || "audio/webm" }));
      form.append("date", today);
      const response = await fetch("/api/voice-checkin", { method: "POST", body: form });
      const result = await readJson<{ checkin?: VoiceCheckin; error?: string }>(response);
      if (!response.ok || !result.checkin) throw new Error(result.error || "No pudimos interpretar la grabación.");
      setVoiceResult(result.checkin);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos interpretar la grabación.");
    } finally {
      setVoiceLoading(false);
    }
  }
  async function startVoiceRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Este navegador no permite grabar audio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      recordingBytesRef.current = 0;
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => { try { return MediaRecorder.isTypeSupported(type); } catch { return false; } }) || "";
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32000 });
      } catch {
        recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      }
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (!event.data.size) return;
        chunksRef.current.push(event.data);
        recordingBytesRef.current += event.data.size;
        if (recordingBytesRef.current >= VOICE_AUTO_STOP_BYTES && recorder.state === "recording") recorder.stop();
      };
      recorder.onstop = () => {
        setRecording(false);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
        if (blob.size > MAX_VOICE_UPLOAD_BYTES) setError("La grabación quedó demasiado pesada. Probá hablando durante menos tiempo.");
        else if (blob.size) void analyzeVoiceBlob(blob, blob.type);
      };
      recorder.start(1000);
      setRecordingSeconds(0);
      setRecording(true);
      setVoiceResult(null);
      setVoiceSaved(false);
    } catch {
      setError("No pudimos acceder al micrófono. Revisá el permiso del navegador.");
    }
  }
  function stopVoiceRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }
  async function applyVoiceCheckin() {
    if (!voiceResult) return;
    const ok = await save({ action: "apply_voice_checkin", date: today, checkin: voiceResult });
    if (ok) {
      setVoiceResult(null);
      setVoiceSaved(true);
    }
  }

  const voiceRecorder = <article className="panel voice-capture-panel">
    <div className="voice-copy"><p className="voice-eyebrow">CIERRE RÁPIDO CON IA</p><h2>Contá tu día en un minuto.</h2><span>Decí qué entrenaste, qué comiste, cuánto trabajaste o estudiaste, cuánto leíste y dormiste. Revisás el resultado antes de guardarlo.</span><div className="voice-hints"><small>“Corrí 5 km…”</small><small>“Hice sentadilla…”</small><small>“Trabajé 2 horas…”</small><small>“Dormí 7 horas…”</small></div></div>
    <div className="voice-action">
      {!recording && !voiceLoading && <button className="record-button" onClick={() => void startVoiceRecording()}><span>●</span><b>{voiceResult ? "Grabar de nuevo" : "Empezar cierre del día"}</b><small>Máximo 60 segundos</small></button>}
      {recording && <button className="record-button recording" onClick={stopVoiceRecording}><span>■</span><b>Grabando… {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")}</b><small>Tocá para terminar</small></button>}
      {voiceLoading && <div className="voice-processing"><div className="voice-spinner" /><b>Organizando tu día…</b><small>La grabación no se conserva.</small></div>}
      {voiceSaved && <div className="voice-saved"><span>✓</span><div><b>Cierre guardado</b><small>Los datos ya aparecen en sus secciones.</small></div></div>}
    </div>
    {voiceResult && <div className="voice-review"><div className="voice-review-head"><div><p>REVISÁ ANTES DE GUARDAR</p><h3>{voiceResult.summary || "Esto fue lo que entendimos"}</h3></div><span className={"confidence " + voiceResult.confidence}>Confianza {voiceResult.confidence === "high" ? "alta" : voiceResult.confidence === "medium" ? "media" : "baja"}</span></div><div className="voice-review-grid">
      <div><span>↗</span><p><b>Entrenamiento</b><small>{voiceResult.gym.attended ? "Entrenamiento registrado" : "Sin asistencia"} {voiceResult.gym.detail}</small></p></div>
      <div><span>◇</span><p><b>Comidas</b><small>{voiceResult.meals.length ? voiceResult.meals.map((meal) => meal.name + " ≈" + meal.calories + " kcal").join(" · ") : "Sin comidas"}</small></p></div>
      <div><span>⌁</span><p><b>Estudio / trabajo</b><small>{voiceResult.study.minutes ? formatFocusHours(voiceResult.study.minutes) + " · " : ""}{voiceResult.study.detail || "Sin dato"}</small></p></div>
      <div><span>☾</span><p><b>Sueño</b><small>{voiceResult.sleep.minutes ? Math.round(voiceResult.sleep.minutes / 6) / 10 + " horas" : "Sin dato"}</small></p></div>
      <div><span>▱</span><p><b>Lectura</b><small>{voiceResult.reading.bookTitle || "Libro actual"} · {voiceResult.reading.pages} páginas</small></p></div>
      <div><span>✎</span><p><b>Reflexión</b><small>{voiceResult.journal || "Sin reflexión"}</small></p></div>
    </div><details><summary>Ver transcripción</summary><p>{voiceResult.transcript}</p></details><div className="voice-review-actions"><button className="discard-voice" onClick={() => setVoiceResult(null)}>Descartar</button><button className="confirm-voice" disabled={saving} onClick={() => void applyVoiceCheckin()}><SaveButtonContent label="Confirmar y guardar" phase={savePhase("apply_voice_checkin")} /></button></div></div>}
  </article>;
  // ---------------------------------------------------------------------------
  // Los dos cortes: el del día y, los domingos, el de la semana.
  // ---------------------------------------------------------------------------
  const close = dayClose({
    score,
    blocks: todayBlocks,
    trained: trainedToday,
    sleepMinutes: sleepToday,
    focusMinutes: focusToday,
    pages: pagesToday,
    meals: data.meals.length,
    calories,
  });
  const dayClosePanel = <article className="panel day-close">
    <div className="panel-heading">
      <div><p>{nowMinutes >= 18 * 60 ? "CIERRE DEL DÍA" : "CÓMO VIENE EL DÍA"}</p><h2>{close.headline}</h2></div>
      {close.blocksTotal > 0 && <span className="week-pill">{close.blocksDone} de {close.blocksTotal} bloques</span>}
    </div>
    {close.done.length > 0 && <p className="day-close-done">{close.done.join(" · ")}</p>}
    {close.pending.length > 0 && <p className="day-close-pending">Quedó sin cerrar: {listPhrase(close.pending)}.</p>}
    {closeNotices.length > 0 && <div className="day-close-notes">
      {closeNotices.map((notice) => <div key={notice.id}>
        <span aria-hidden="true">{notice.icon}</span>
        <p><b>{notice.title}</b><small>{notice.body}</small></p>
      </div>)}
    </div>}
    {close.done.length === 0 && close.pending.length === 0 && closeNotices.length === 0 && <p className="day-close-done">Cuando registres algo, el balance del día aparece acá.</p>}
  </article>;
  const voiceDialog = voiceOpen && <div className="voice-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setVoiceOpen(false); }}>
      <section className="voice-dialog" role="dialog" aria-modal="true" aria-label="Cierre del día">
        <button className="voice-dialog-close" type="button" onClick={() => setVoiceOpen(false)} aria-label="Cerrar">×</button>
        {dayClosePanel}
        {voiceRecorder}
      </section>
    </div>;

  return voiceDialog;
}
