"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AdvisorResponse } from "@/lib/agent/advisor";
import type { ScenarioCandidate, SelectedMeasure, ValidSimulationResult } from "@/types/domain";
import { simulateScenario } from "@/lib/simulation";
import { MEASURES } from "@/data/astana-track-data";
import { districts } from "./districts";
import styles from "./AdvisorPanel.module.css";

type Props = {
  selections: SelectedMeasure[];
  currentResult: ValidSimulationResult | null;
  selectedCandidate: ScenarioCandidate | null;
  onCandidateChange: (candidate: ScenarioCandidate | null) => void;
  onApply: (candidate: ScenarioCandidate) => void;
};

const format = new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function readResponse(value: unknown): AdvisorResponse {
  if (!value || typeof value !== "object") throw new Error("Советник вернул некорректный ответ.");
  const data = value as Partial<AdvisorResponse>;
  if (
    typeof data.explanation !== "string"
    || !Array.isArray(data.trace)
    || !data.trace.every((item) => typeof item === "string")
    || !Array.isArray(data.candidates)
    || data.candidates.length > 3
    || !data.interpretedGoal
    || typeof data.interpretedGoal !== "object"
  ) throw new Error("Советник вернул неполный ответ. Повторите запрос.");

  const candidates = data.candidates.map((candidate) => {
    if (
      !candidate || typeof candidate !== "object"
      || !Array.isArray(candidate.selections)
      || candidate.selections.length !== 5
      || !candidate.selections.every((item) => item && typeof item === "object" && typeof item.measureId === "string")
    ) throw new Error("Советник вернул некорректный набор мероприятий.");
    const result = simulateScenario({ selections: candidate.selections });
    if (!result.valid) throw new Error("Предложение советника нарушает ограничения сценария.");
    return {
      selections: candidate.selections,
      result,
      ...(typeof candidate.reason === "string" ? { reason: candidate.reason } : {}),
    };
  });

  return { interpretedGoal: data.interpretedGoal, trace: data.trace, explanation: data.explanation, candidates,
    ...(data.currentScenarioAnalysis ? { currentScenarioAnalysis: data.currentScenarioAnalysis } : {}),
  };
}

export default function AdvisorPanel({ selections, currentResult, selectedCandidate, onCandidateChange, onApply }: Props) {
  const [goal, setGoal] = useState("Улучшить Нуру и устранить критические социальные показатели в пределах бюджета 100.");
  const [status, setStatus] = useState<"idle" | "analyzing" | "result" | "error">("idle");
  const [response, setResponse] = useState<AdvisorResponse | null>(null);
  const [error, setError] = useState("");
  const [comparing, setComparing] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    setStatus("idle");
    setResponse(null);
    setError("");
    setComparing(false);
    onCandidateChange(null);
    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [selections, onCandidateChange]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!goal.trim() || requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setStatus("analyzing");
    setError("");
    setResponse(null);
    onCandidateChange(null);
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: goal.trim(), ...(currentResult ? { currentScenario: { selections } } : {}) }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(res.status === 400
          ? "Проверьте цель: допустимо от 1 до 2000 символов."
          : res.status === 503
            ? "Советник временно недоступен. Ручной расчёт продолжает работать."
            : "Не удалось подобрать сценарии. Повторите запрос.");
      }
      const data = readResponse(await res.json());
      if (requestRef.current !== controller || controller.signal.aborted) return;
      setResponse(data);
      onCandidateChange(data.candidates[0] ?? null);
      setStatus("result");
    } catch (cause) {
      if (requestRef.current !== controller) return;
      setError(controller.signal.aborted
        ? "Запрос занял слишком много времени. Попробуйте ещё раз."
        : cause instanceof TypeError
          ? "Нет соединения с советником. Проверьте подключение и повторите запрос."
          : cause instanceof SyntaxError
            ? "Не удалось прочитать ответ советника."
            : cause instanceof Error ? cause.message : "Не удалось получить предложения.");
      setStatus("error");
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const cancel = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setStatus("idle");
  };

  return (
    <section className={styles.section} aria-labelledby="advisor-title" aria-busy={status === "analyzing"}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>АЛЬТЕРНАТИВЫ РАЗВИТИЯ ГОРОДА</p>
          <h2 id="advisor-title">AI-советник</h2>
        </div>
        <span className={styles.budget}>Бюджет: 100 ед.</span>
      </div>
      <form className={styles.form} onSubmit={submit}>
        <label htmlFor="advisor-goal">Цель городского развития</label>
        <textarea id="advisor-goal" value={goal} onChange={(event) => setGoal(event.target.value)} maxLength={2000} rows={3} disabled={status === "analyzing"} required />
        <div className={styles.actions}>
          <button className={styles.primary} type="submit" disabled={!goal.trim() || status === "analyzing"}>
            {status === "analyzing" ? "Анализируем варианты..." : "Получить предложения"}
          </button>
          {status === "analyzing" && <button className={styles.secondary} type="button" onClick={cancel}>Отменить</button>}
        </div>
      </form>
      {status === "analyzing" && <p className={styles.status} role="status">Подбираем мероприятия и рассчитываем последствия.</p>}
      {status === "error" && <p className={styles.error} role="alert">{error}</p>}
      {response && (
        <div className={styles.results} aria-live="polite">
          <p className={styles.explanation}>{response.explanation}</p>
          {response.trace.length > 0 && (
            <details className={styles.trace}>
              <summary>Ход анализа</summary>
              <ol>{response.trace.map((step, index) => <li key={index}>{step}</li>)}</ol>
            </details>
          )}
          {response.candidates.length === 0 ? (
            <p className={styles.status}>Для этой цели предложения не найдены. Уточните цель и повторите запрос.</p>
          ) : (
            <div className={styles.candidates} role="radiogroup" aria-label="Предложения советника">
              {response.candidates.map((candidate, index) => (
                <label className={styles.candidate} key={index} data-selected={selectedCandidate === candidate}>
                  <div className={styles.candidateHeading}>
                    <strong>Вариант {index + 1}</strong>
                    <input type="radio" name="advisor-candidate" aria-label={"Выбрать вариант " + (index + 1)} checked={selectedCandidate === candidate} onChange={() => onCandidateChange(candidate)} />
                  </div>
                  <div className={styles.score}>
                    <strong>{format.format(candidate.result.scoreAfter)}</strong>
                    <span>{candidate.result.scoreDelta >= 0 ? "+" : ""}{format.format(candidate.result.scoreDelta)} балла</span>
                  </div>
                  <dl className={styles.facts}>
                    <div><dt>Стоимость</dt><dd>{candidate.result.cost} / 100</dd></div>
                    <div><dt>Остаток бюджета</dt><dd>{candidate.result.remainingBudget}</dd></div>
                    <div><dt>Критические</dt><dd>{candidate.result.criticalBefore} → {candidate.result.criticalAfter}</dd></div>
                    <div><dt>Слабейший район</dt><dd>{districts.find((item) => item.id === candidate.result.weakestDistrict)?.name}</dd></div>
                  </dl>
                  <ul className={styles.measures}>
                    {candidate.selections.map((selection) => (
                      <li key={selection.measureId}>
                        {MEASURES.find((measure) => measure.id === selection.measureId)?.name ?? selection.measureId}
                        <span>{selection.districtId ? districts.find((item) => item.id === selection.districtId)?.name : "Весь город"}</span>
                      </li>
                    ))}
                  </ul>
                  {candidate.reason && <p className={styles.reason}>{candidate.reason}</p>}
                </label>
              ))}
            </div>
          )}
          {selectedCandidate && (
            <div className={styles.actions} style={{ marginTop: 20 }}>
              <button className={styles.secondary} type="button" disabled={!currentResult} onClick={() => setComparing(true)}>
                Сравнить с моим планом
              </button>
              <button className={styles.primary} type="button" onClick={() => onApply(selectedCandidate)}>Использовать этот сценарий</button>
              {!currentResult && <p className={styles.status}>Для сравнения сначала рассчитайте свой план.</p>}
            </div>
          )}
          {comparing && currentResult && selectedCandidate && (
            <div className={styles.comparison}>
              <h3>Мой план и AI-предложение</h3>
              <table>
                <caption>Результаты двух сценариев из симулятора</caption>
                <thead><tr><th scope="col">Показатель</th><th scope="col">Мой план</th><th scope="col">AI</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Quality of Life Score</th><td>{format.format(currentResult.scoreAfter)}</td><td>{format.format(selectedCandidate.result.scoreAfter)}</td></tr>
                  <tr><th scope="row">Изменение Score</th><td>{format.format(currentResult.scoreDelta)}</td><td>{format.format(selectedCandidate.result.scoreDelta)}</td></tr>
                  <tr><th scope="row">Расход бюджета</th><td>{currentResult.cost}</td><td>{selectedCandidate.result.cost}</td></tr>
                  <tr><th scope="row">Критические показатели</th><td>{currentResult.criticalAfter}</td><td>{selectedCandidate.result.criticalAfter}</td></tr>
                  <tr><th scope="row">Самый слабый район</th><td>{districts.find((d) => d.id === currentResult.weakestDistrict)?.name}</td><td>{districts.find((d) => d.id === selectedCandidate.result.weakestDistrict)?.name}</td></tr>
                  {currentResult.districts.map((district) => {
                    const proposed = selectedCandidate.result.districts.find((item) => item.districtId === district.districtId);
                    return <tr key={district.districtId}><th scope="row">{districts.find((d) => d.id === district.districtId)?.name}</th><td>{format.format(district.scoreAfter)}</td><td>{proposed ? format.format(proposed.scoreAfter) : "—"}</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
