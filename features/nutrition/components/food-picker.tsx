"use client";
import { useId, useMemo, useRef, useState } from "react";
import { useWorkspace } from "@/features/app-shell/workspace";
import { FOOD_ROWS } from "@/features/nutrition/data/food-catalog";
import { formatAmount } from "@/features/nutrition/components/nutrition-day-summary";
import {
  MAX_PORTION_GRAMS, PORTION_LABELS, PORTION_ORDER, buildCatalog, formatGrams, nutritionForGrams, portionDetail, searchFoods,
  type CatalogFood, type FoodPortionSize,
} from "@/features/nutrition/logic/food-search";
import { normalizeFoodSearch, type NutritionValues } from "@/features/nutrition/logic/nutrition-tracker";
import { parseDecimalInput } from "@/shared/lib/numbers";
import { SaveButtonContent } from "@/shared/ui/save-button";

type Chosen = { kind: "catalog"; food: CatalogFood } | { kind: "own"; name: string };
type OwnValues = { calories: string; protein: string; carbs: string; fat: string };
const CATALOG: CatalogFood[] = buildCatalog(FOOD_ROWS);
const EMPTY_OWN: OwnValues = { calories: "", protein: "", carbs: "", fat: "" };

/**
 * Registro a mano: se escribe el alimento, se autocompleta desde el catálogo, se
 * elige una porción (o una cantidad en gramos) y los valores se calculan solos.
 * Si el alimento no está, se carga con sus valores cada 100 g y se calcula igual.
 */
export function FoodPicker({ moment, date, presetName = "" }: { moment: string; date: string; presetName?: string }) {
  const { save, saving, savePhase } = useWorkspace();
  const [initial] = useState(() => {
    const match = presetName
      ? searchFoods(CATALOG, presetName, 7).find((food) => normalizeFoodSearch(food.name) === normalizeFoodSearch(presetName))
      : undefined;
    return { chosen: match ? { kind: "catalog" as const, food: match } : null, open: Boolean(presetName && !match) };
  });
  const [query, setQuery] = useState(presetName);
  const [open, setOpen] = useState(initial.open);
  const [active, setActive] = useState(0);
  const [chosen, setChosen] = useState<Chosen | null>(initial.chosen);
  const [size, setSize] = useState<FoodPortionSize | "custom">("medium");
  const [customGrams, setCustomGrams] = useState("");
  const [own, setOwn] = useState<OwnValues>(EMPTY_OWN);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  // Importado de forma estática (pesa ~50 KB): una carga diferida podía quedarse colgada en "cargando".
  const suggestions = useMemo(() => (query.trim() ? searchFoods(CATALOG, query, 7) : []), [query]);
  const showList = open && !chosen && query.trim().length > 0;
  // La última opción de la lista siempre es "cargarlo a mano": un alimento que no está no es un callejón sin salida.
  const optionCount = suggestions.length + 1;

  const grams = size === "custom"
    ? parseDecimalInput(customGrams)
    : chosen?.kind === "catalog" ? chosen.food.portions[size] : 0;
  const per100: NutritionValues | null = chosen?.kind === "catalog"
    ? chosen.food.per100
    : chosen
      ? {
          calories: parseDecimalInput(own.calories),
          protein: parseDecimalInput(own.protein),
          carbs: parseDecimalInput(own.carbs),
          fat: parseDecimalInput(own.fat),
        }
      : null;
  const totals = per100 ? nutritionForGrams(per100, grams) : null;
  const ownReady = chosen?.kind !== "own" || (chosen.name.trim().length > 0 && own.calories.trim() !== "");
  const canAdd = Boolean(chosen && totals && grams > 0 && grams <= MAX_PORTION_GRAMS && ownReady && !saving);

  function reset() {
    setChosen(null);
    setQuery("");
    setOpen(false);
    setSize("medium");
    setCustomGrams("");
    setOwn(EMPTY_OWN);
    inputRef.current?.focus();
  }

  function pick(food: CatalogFood) {
    setChosen({ kind: "catalog", food });
    setQuery(food.name);
    setSize("medium");
    setCustomGrams("");
    setOpen(false);
  }

  function pickOwn() {
    setChosen({ kind: "own", name: query.trim() });
    setSize("custom");
    setCustomGrams("100");
    setOpen(false);
  }

  function choose(index: number) {
    if (index < suggestions.length) pick(suggestions[index]);
    else pickOwn();
  }

  async function add() {
    if (!chosen || !totals || !canAdd) return;
    const name = chosen.kind === "catalog" ? chosen.food.name : chosen.name.trim();
    const saved = await save({
      action: "add_meal",
      date,
      name: moment,
      detail: portionDetail(name, size, grams),
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
    });
    if (saved) reset();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showList) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActive((current) => (current + 1) % optionCount); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((current) => (current - 1 + optionCount) % optionCount); }
    else if (event.key === "Enter") { event.preventDefault(); choose(Math.min(active, optionCount - 1)); }
    else if (event.key === "Escape") setOpen(false);
  }

  return <div className="food-picker">
    <div className="food-picker-search">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList ? `${listId}-${active}` : undefined}
        aria-label="Alimento"
        autoFocus={Boolean(presetName)}
        autoComplete="off"
        value={query}
        placeholder="¿Qué comiste? Ej. bife, banana, arroz…"
        onChange={(event) => { setQuery(event.target.value); setChosen(null); setActive(0); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
      />
      {query && <button type="button" className="food-picker-clear" aria-label="Borrar búsqueda" onClick={reset}>×</button>}
      {showList && <ul className="food-picker-list" role="listbox" id={listId}>
        {suggestions.map((food, index) => <li
          key={food.id}
          id={`${listId}-${index}`}
          role="option"
          aria-selected={index === active}
          className={index === active ? "is-active" : ""}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => pick(food)}
          onMouseEnter={() => setActive(index)}
        >
          <b>{food.name}</b>
          <small>{food.category} · {formatAmount(food.per100.calories)} kcal cada 100 g</small>
        </li>)}
        {!suggestions.length && <li className="food-picker-note">No lo encontramos en la lista.</li>}
        <li
          id={`${listId}-${suggestions.length}`}
          role="option"
          aria-selected={active === suggestions.length}
          className={"food-picker-own" + (active === suggestions.length ? " is-active" : "")}
          onMouseDown={(event) => event.preventDefault()}
          onClick={pickOwn}
          onMouseEnter={() => setActive(suggestions.length)}
        >
          <b>＋ Cargar “{query.trim()}” a mano</b>
          <small>Con sus calorías y macros</small>
        </li>
      </ul>}
    </div>

    {chosen && <div className="food-picker-detail">
      <div className="food-picker-title">
        {chosen.kind === "own"
          ? <input aria-label="Nombre del alimento" value={chosen.name} maxLength={80} onChange={(event) => setChosen({ kind: "own", name: event.target.value })} />
          : <b>{chosen.food.name}</b>}
        {chosen.kind === "catalog" && <small>{chosen.food.category}</small>}
      </div>

      {chosen.kind === "own" && <div className="food-picker-own-values">
        <p>Valores cada 100 g</p>
        <div>
          {([["calories", "kcal"], ["protein", "Proteínas (g)"], ["carbs", "Carbohidratos (g)"], ["fat", "Grasas (g)"]] as const).map(([field, label]) => (
            <label key={field}>{label}
              <input type="text" inputMode="decimal" value={own[field]} placeholder="0" onChange={(event) => setOwn({ ...own, [field]: event.target.value })} />
            </label>
          ))}
        </div>
      </div>}

      <div className="food-picker-sizes" role="radiogroup" aria-label="Tamaño de la porción">
        {chosen.kind === "catalog" && PORTION_ORDER.map((key) => (
          <button key={key} type="button" role="radio" aria-checked={size === key} className={size === key ? "is-on" : ""} onClick={() => setSize(key)}>
            <b>{PORTION_LABELS[key]}</b><small>{formatGrams(chosen.food.portions[key])}</small>
          </button>
        ))}
        <button type="button" role="radio" aria-checked={size === "custom"} className={size === "custom" ? "is-on" : ""} onClick={() => { setSize("custom"); if (!customGrams) setCustomGrams(chosen.kind === "catalog" ? String(chosen.food.portions.medium) : "100"); }}>
          <b>Otra cantidad</b><small>en gramos</small>
        </button>
      </div>
      {size === "custom" && <label className="food-picker-grams">Cantidad
        <span><input type="text" inputMode="decimal" autoFocus value={customGrams} placeholder="Ej. 120" onFocus={(event) => event.currentTarget.select()} onChange={(event) => setCustomGrams(event.target.value)} /><i>g</i></span>
        {grams > MAX_PORTION_GRAMS && <small className="food-picker-error">Máximo {MAX_PORTION_GRAMS.toLocaleString("es-AR")} g por registro.</small>}
      </label>}

      {totals && <div className="food-picker-result" aria-live="polite">
        <div><b>{formatAmount(totals.calories)}</b><small>kcal</small></div>
        <div><b>{formatAmount(totals.protein, 1)}</b><small>proteínas g</small></div>
        <div><b>{formatAmount(totals.carbs, 1)}</b><small>carbohidratos g</small></div>
        <div><b>{formatAmount(totals.fat, 1)}</b><small>grasas g</small></div>
      </div>}
      <button type="button" className="food-picker-add" disabled={!canAdd} onClick={() => void add()}>
        <SaveButtonContent label={`Agregar a ${moment.toLowerCase()}`} phase={savePhase("add_meal")} />
      </button>
    </div>}
  </div>;
}
