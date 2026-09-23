"use client";

import type { SelectedMeasure } from "@/types/domain";
import { MEASURES, type Direction, type DistrictId, type MeasureData } from "@/data/astana-track-data";
import { districts } from "@/components/dashboard/districts";
import styles from "./ScenarioBuilder.module.css";

type ScenarioBuilderProps = {
  initialDistrictId: DistrictId;
  selections: SelectedMeasure[];
  onChange: (selections: SelectedMeasure[]) => void;
  onCalculate: () => void;
};

const directionLabels: Record<Direction, string> = {
  transport: "Транспорт",
  ecology: "Экология",
  social: "Соцсфера",
  safety: "Безопасность",
  services: "Сервисы",
};

export default function ScenarioBuilder({ initialDistrictId, selections, onChange, onCalculate }: ScenarioBuilderProps) {
  const selectedMeasures = selections.flatMap((selection) => {
    const measure = MEASURES.find((item) => item.id === selection.measureId);
    return measure ? [{ measure, districtId: selection.districtId }] : [];
  });
  const usedBudget = selectedMeasures.reduce((total, item) => total + item.measure.cost, 0);

  const addMeasure = (measure: MeasureData) => {
    if (
      selections.length >= 5
      || selections.some((item) => item.measureId === measure.id)
      || usedBudget + measure.cost > 100
      || selectedMeasures.filter((item) => item.measure.direction === measure.direction).length >= 2
    ) return;
    onChange([
      ...selections,
      { measureId: measure.id, ...(measure.scope === "district" ? { districtId: initialDistrictId } : {}) },
    ]);
  };

  const removeMeasure = (measureId: string) => {
    onChange(selections.filter((item) => item.measureId !== measureId));
  };

  const updateDistrict = (measureId: string, districtId: DistrictId) => {
    onChange(selections.map((item) => (
      item.measureId === measureId ? { ...item, districtId } : item
    )));
  };

  return (
    <section aria-labelledby="scenario-title" style={{ marginTop: 20, padding: 24, background: "#fff", border: "1px solid #dfe5e9", borderRadius: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
        <div>
          <p style={{ margin: "0 0 8px", color: "#127d78", fontSize: 11, fontWeight: 800 }}>КОНСТРУКТОР СЦЕНАРИЯ</p>
          <h2 id="scenario-title" style={{ margin: 0, fontSize: 19 }}>Выберите пять мероприятий</h2>
          <p style={{ color: "#7e8d95", fontSize: 12 }}>Районную меру можно назначить конкретному району.</p>
        </div>
        <strong>{selections.length} / 5</strong>
      </div>
      <div className={styles.layout} style={{ display: "grid", gap: 20 }}>
        <div className={styles.catalog} style={{ display: "grid", gap: 12 }}>
          {MEASURES.map((measure) => {
            const selected = selections.some((item) => item.measureId === measure.id);
            const directionFull = selectedMeasures.filter((item) => item.measure.direction === measure.direction).length >= 2;
            const unavailable = !selected && (selections.length >= 5 || usedBudget + measure.cost > 100 || directionFull);
            return (
              <article key={measure.id} style={{ display: "flex", minHeight: 175, flexDirection: "column", padding: 14, border: selected ? "1px solid #168c78" : "1px solid #dfe5e9", borderRadius: 5, background: selected ? "#f2faf7" : "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, color: "#75858e", fontSize: 11 }}>
                  <span style={{ color: "#127d78", fontWeight: 700 }}>{directionLabels[measure.direction]}</span>
                  <span>{measure.scope === "city" ? "Весь город" : "Один район"}</span>
                </div>
                <h3 style={{ margin: "13px 0", fontSize: 14, lineHeight: 1.35 }}>{measure.name}</h3>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "auto", fontSize: 11 }}>
                  <strong>{measure.cost} ед.</strong><span>Эффект через {measure.lag} кв.</span>
                </div>
                <button disabled={unavailable} title={unavailable ? (directionFull ? "Не более двух мер одного направления" : selections.length >= 5 ? "Выбрано пять решений" : "Недостаточно бюджета") : undefined} onClick={() => selected ? removeMeasure(measure.id) : addMeasure(measure)} style={{ minHeight: 34, marginTop: 14, border: 0, borderRadius: 4, cursor: unavailable ? "not-allowed" : "pointer" }} type="button">
                  {selected ? "Убрать" : "Выбрать"}
                </button>
              </article>
            );
          })}
        </div>
        <aside className={styles.summary} style={{ padding: 16, background: "#f8faf9", border: "1px solid #e3e8ea", borderRadius: 5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, borderBottom: "1px solid #e0e7e8", paddingBottom: 14 }}>
            <div><p style={{ margin: "0 0 8px", color: "#127d78", fontSize: 11, fontWeight: 800 }}>ВАШ ПЛАН</p><strong>{selections.length} / 5 решений</strong></div>
            <strong>{usedBudget} / 100</strong>
          </div>
          {selections.length === 0 ? <p style={{ color: "#7a8991", fontSize: 13 }}>Выберите мероприятия из каталога.</p> : selectedMeasures.map(({ measure, districtId }) => (
            <div key={measure.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "center", padding: "12px 0", borderBottom: "1px solid #e0e7e8" }}>
              <div><span style={{ display: "block", color: "#6e8089", fontSize: 10 }}>{measure.id} · {measure.cost} ед.</span><strong style={{ fontSize: 11 }}>{measure.name}</strong></div>
              {measure.scope === "district" ? <select aria-label={"Район для " + measure.name} onChange={(event) => updateDistrict(measure.id, event.target.value as DistrictId)} value={districtId}>
                {districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}
              </select> : <span style={{ fontSize: 11 }}>Весь город</span>}
              <button aria-label={"Удалить " + measure.name} onClick={() => removeMeasure(measure.id)} style={{ gridColumn: 2, border: 0, background: "transparent", color: "#9a5c51", cursor: "pointer" }} type="button">Удалить</button>
            </div>
          ))}
          <p style={{ marginTop: 18 }}>Осталось бюджета: <strong>{100 - usedBudget} ед.</strong></p>
          <button disabled={selections.length !== 5} onClick={onCalculate} style={{ width: "100%", minHeight: 42, border: 0, borderRadius: 4, color: "#fff", background: selections.length === 5 ? "#127d78" : "#bdc7ca", cursor: selections.length === 5 ? "pointer" : "not-allowed" }} type="button">
            {selections.length === 5 ? "Рассчитать сценарий" : "Выберите ещё " + (5 - selections.length)}
          </button>
        </aside>
      </div>
    </section>
  );
}
