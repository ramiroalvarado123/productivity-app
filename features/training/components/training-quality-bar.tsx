import { TRAINING_QUALITY_OPTIONS } from "@/features/training/constants";
export function TrainingQualityBar({ disciplineName, quality, saving, onSelect }: {
  disciplineName: string;
  quality: number | null | undefined;
  saving: boolean;
  onSelect: (quality: number) => void;
}) {
  return <div className="training-quality" aria-label={"Valoración del entrenamiento de " + disciplineName}>
    <span className="training-quality-label">¿Cómo estuvo?</span>
    <div className="training-quality-options" role="radiogroup">
      {TRAINING_QUALITY_OPTIONS.map((option) => {
        const selected = quality === option.value;
        return <button key={option.value} type="button" role="radio" aria-checked={selected} className={"training-quality-option" + (selected ? " selected" : "")} disabled={saving} onClick={() => onSelect(option.value)}>{option.label}</button>;
      })}
    </div>
  </div>;
}
