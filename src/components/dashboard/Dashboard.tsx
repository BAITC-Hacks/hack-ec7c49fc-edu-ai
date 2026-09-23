"use client";

import { useState } from "react";
import type { DistrictId } from "@/types/domain";
import ScenarioBuilder from "@/components/scenario/ScenarioBuilder";
import { baselineScore, districts, indicators, totalBudget } from "./districts";
import styles from "./dashboard.module.css";

const numberFormat = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function Dashboard() {
  const [selectedDistrictId, setSelectedDistrictId] = useState<DistrictId>("nura");
  const [scenarioSummary, setScenarioSummary] = useState({ count: 0, usedBudget: 0 });
  const selectedDistrict = districts.find((district) => district.id === selectedDistrictId) ?? districts[4];
  const remainingBudget = totalBudget - scenarioSummary.usedBudget;
  const sortedIndicators = [...indicators].sort(
    (a, b) => selectedDistrict.values[a.id] - selectedDistrict.values[b.id],
  );

  return (
    <main className={styles.app}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">A</span>
          <div>
            <div className={styles.brandName}>ASTANA AI</div>
            <div className={styles.brandDescription}>Городские решения</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.liveDot} aria-hidden="true" />
          Исходное состояние
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.titleRow}>
          <div>
            <p className={styles.eyebrow}>СИМУЛЯТОР УПРАВЛЕНИЯ ГОРОДОМ</p>
            <h1>Качество жизни в Астане</h1>
            <p className={styles.subtitle}>Пять районов. Один бюджет. Решения с измеримыми последствиями.</p>
          </div>
          <span className={styles.period}>Горизонт модели: 8 кварталов</span>
        </div>

        <section className={styles.metrics} aria-label="Показатели города">
          <div className={styles.scoreMetric}>
            <span className={styles.metricLabel}>ASTANA QUALITY OF LIFE SCORE</span>
            <div className={styles.bigScore}>{numberFormat.format(baselineScore)}<span> / 100</span></div>
            <span className={styles.metricHint}>До принятия решений</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Бюджет</span>
            <strong>{remainingBudget}<span> ед.</span></strong>
            <span className={styles.metricHint}>Остаток: использовано {scenarioSummary.usedBudget}</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Решения</span>
            <strong>{scenarioSummary.count} <span>/ 5</span></strong>
            <span className={styles.metricHint}>{scenarioSummary.count === 5 ? "Сценарий готов к расчёту" : "Выберите ещё мероприятия"}</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Критические показатели</span>
            <strong className={styles.criticalNumber}>2</strong>
            <span className={styles.metricHint}>Школы и поликлиники, Нура</span>
          </div>
        </section>

        <div className={styles.workspace}>
          <section className={styles.districtsSection} aria-labelledby="districts-title">
            <div className={styles.sectionHeading}>
              <div>
                <h2 id="districts-title">Районы города</h2>
                <p>Выберите район, чтобы увидеть его показатели.</p>
              </div>
              <span className={styles.sectionCount}>5 районов</span>
            </div>
            <div className={styles.districtList}>
              {districts.map((district) => {
                const weak = [...indicators]
                  .sort((a, b) => district.values[a.id] - district.values[b.id])
                  .slice(0, 2);
                const selected = district.id === selectedDistrictId;
                return (
                  <button
                    aria-pressed={selected}
                    className={`${styles.districtRow} ${selected ? styles.districtRowSelected : ""}`}
                    key={district.id}
                    onClick={() => setSelectedDistrictId(district.id)}
                    type="button"
                  >
                    <span className={styles.districtNameGroup}>
                      <strong>{district.name}</strong>
                      <span>{weak.map((indicator) => indicator.label).join(" · ")}</span>
                    </span>
                    <span className={styles.districtBar} aria-hidden="true">
                      <span style={{ width: `${district.score}%` }} />
                    </span>
                    <span className={styles.districtScore}>{numberFormat.format(district.score)}</span>
                  </button>
                );
              })}
            </div>
            <div className={styles.note}>
              <span className={styles.noteMark} aria-hidden="true">i</span>
              Итоговый балл учитывает средний результат города, самый слабый район и критические показатели.
            </div>
          </section>

          <section className={styles.detailSection} aria-labelledby="detail-title">
            <div className={styles.detailHead}>
              <div>
                <span className={styles.detailEyebrow}>ПРОФИЛЬ РАЙОНА</span>
                <h2 id="detail-title">{selectedDistrict.name}</h2>
              </div>
              <span className={styles.population}>{selectedDistrict.populationShare}% населения</span>
            </div>
            <div className={styles.detailScore}>
              <strong>{numberFormat.format(selectedDistrict.score)}</strong>
              <span>оценка района</span>
            </div>
            <div className={styles.indicatorList}>
              {sortedIndicators.map((indicator) => {
                const value = selectedDistrict.values[indicator.id];
                return (
                  <div className={styles.indicatorRow} key={indicator.id}>
                    <div className={styles.indicatorText}>
                      <span>{indicator.label}</span>
                      <strong className={value < 40 ? styles.dangerText : undefined}>{value}</strong>
                    </div>
                    <div className={styles.indicatorTrack}>
                      <span className={value < 40 ? styles.dangerBar : undefined} style={{ width: `${value}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className={styles.detailFoot}>Шкала 0–100. Чем выше показатель, тем лучше.</p>
          </section>
        </div>
        <ScenarioBuilder initialDistrictId={selectedDistrictId} onChange={setScenarioSummary} />
      </div>
    </main>
  );
}
