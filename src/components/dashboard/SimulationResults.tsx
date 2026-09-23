import type { DistrictId, SimulationResult } from "@/types/domain";
import { districts, indicators } from "./districts";

type Props = {
  result: SimulationResult | null;
  error: string | null;
  selectedDistrictId: DistrictId;
};

const format = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function signed(value: number) {
  return (value > 0 ? "+" : "") + format.format(value);
}

export default function SimulationResults({ result, error, selectedDistrictId }: Props) {
  if (!result && !error) return null;

  if (error || result?.valid === false) {
    const messages = error ? [error] : result?.validationErrors ?? [];
    return (
      <section aria-labelledby="result-title" role="alert" style={{ marginTop: 20, padding: 24, border: "1px solid #e7b8a7", borderRadius: 6, background: "#fff8f5" }}>
        <h2 id="result-title" style={{ margin: "0 0 12px", fontSize: 19 }}>Сценарий не рассчитан</h2>
        <ul style={{ margin: 0, paddingLeft: 20, color: "#944531" }}>
          {messages.map((message) => <li key={message}>{message}</li>)}
        </ul>
      </section>
    );
  }

  if (!result) return null;

  const selectedDistrict = result.districts.find((item) => item.districtId === selectedDistrictId);
  const weakestName = districts.find((item) => item.id === result.weakestDistrict)?.name ?? result.weakestDistrict;

  return (
    <section aria-labelledby="result-title" style={{ marginTop: 20, padding: 24, border: "1px solid #dfe5e9", borderRadius: 6, background: "#fff" }}>
      <p style={{ margin: "0 0 8px", color: "#127d78", fontSize: 11, fontWeight: 800 }}>РЕЗУЛЬТАТ СИМУЛЯЦИИ · 8 КВАРТАЛОВ</p>
      <h2 id="result-title" style={{ margin: "0 0 18px", fontSize: 19 }}>Последствия ваших решений</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12, marginBottom: 24 }}>
        <div style={{ padding: 18, background: "#eef8f4", borderLeft: "3px solid #127d78" }}>
          <span style={{ display: "block", fontSize: 12, color: "#62767a" }}>Качество жизни</span>
          <strong style={{ display: "block", marginTop: 8, fontSize: 25 }}>{format.format(result.scoreBefore)} → {format.format(result.scoreAfter)}</strong>
          <span style={{ color: result.scoreDelta >= 0 ? "#127d78" : "#a54135", fontWeight: 700 }}>{signed(result.scoreDelta)} балла</span>
        </div>
        <div style={{ padding: 18, background: "#f5f7f8" }}>
          <span style={{ display: "block", fontSize: 12, color: "#62767a" }}>Критические показатели</span>
          <strong style={{ display: "block", marginTop: 8, fontSize: 25 }}>{result.criticalBefore} → {result.criticalAfter}</strong>
          <span style={{ fontSize: 12 }}>Значения ниже 40</span>
        </div>
        <div style={{ padding: 18, background: "#f5f7f8" }}>
          <span style={{ display: "block", fontSize: 12, color: "#62767a" }}>Бюджет</span>
          <strong style={{ display: "block", marginTop: 8, fontSize: 25 }}>{result.cost} / 100</strong>
          <span style={{ fontSize: 12 }}>Осталось {result.remainingBudget} ед.</span>
        </div>
        <div style={{ padding: 18, background: "#f5f7f8" }}>
          <span style={{ display: "block", fontSize: 12, color: "#62767a" }}>Самый слабый район</span>
          <strong style={{ display: "block", marginTop: 8, fontSize: 22 }}>{weakestName}</strong>
          <span style={{ fontSize: 12 }}>После реализации плана</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: 30 }}>
        <div>
          <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>Районы: до и после</h3>
          <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 11, color: "#64757b" }}><span>■ До</span><span style={{ color: "#127d78" }}>■ После</span></div>
          {result.districts.map((item) => {
            const name = districts.find((district) => district.id === item.districtId)?.name ?? item.districtId;
            return (
              <div key={item.districtId} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, marginBottom: 5 }}>
                  <strong>{name}</strong>
                  <span>{format.format(item.scoreBefore)} → {format.format(item.scoreAfter)} <b style={{ color: item.scoreDelta >= 0 ? "#127d78" : "#a54135" }}>({signed(item.scoreDelta)})</b></span>
                </div>
                <div style={{ height: 6, background: "#edf1f2", marginBottom: 3 }}><div style={{ width: String(item.scoreBefore) + "%", height: "100%", background: "#9aa8ad" }} /></div>
                <div style={{ height: 6, background: "#edf1f2" }}><div style={{ width: String(item.scoreAfter) + "%", height: "100%", background: "#127d78" }} /></div>
              </div>
            );
          })}
        </div>
        {selectedDistrict && (
          <div>
            <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>Показатели: {districts.find((item) => item.id === selectedDistrictId)?.name}</h3>
            {selectedDistrict.indicators.map((item) => (
              <div key={item.indicator} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "8px 0", borderBottom: "1px solid #edf1f2", fontSize: 12 }}>
                <span>{indicators.find((indicator) => indicator.id === item.indicator)?.label ?? item.indicator}</span>
                <strong style={{ whiteSpace: "nowrap", color: item.delta > 0 ? "#127d78" : item.delta < 0 ? "#a54135" : "#43545a" }}>
                  {format.format(item.before)} → {format.format(item.after)}
                </strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}