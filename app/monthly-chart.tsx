import type { MonthlyTotals } from "@/lib/dashboard";
import { formatCents } from "@/lib/money";

// Palette validated with the dataviz six-checks script against #ffffff:
// slot 1 blue (income), slot 2 aqua (expenses). Aqua sits below 3:1 on
// white, so the chart ships a legend, per-bar hover values, and a data table.
const INCOME_COLOR = "#2a78d6";
const EXPENSE_COLOR = "#1baf7a";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Round tick step (1/2/5 × 10^n), so the axis reads $500, $1k, $1.5k —
// never $625 or $1.9k.
function niceScale(maxCents: number): { ceiling: number; step: number } {
  if (maxCents <= 0) return { ceiling: 100_00, step: 25_00 };
  const rough = maxCents / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const step =
    [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow;
  return { ceiling: step * Math.ceil(maxCents / step), step };
}

function compactDollars(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000) {
    const k = dollars / 1000;
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `$${dollars}`;
}

// Top-rounded bar anchored to the baseline (4px data-end radius).
function barPath(x: number, yTop: number, width: number, yBase: number): string {
  const r = Math.min(4, width / 2, Math.max(0, yBase - yTop));
  return [
    `M ${x} ${yBase}`,
    `L ${x} ${yTop + r}`,
    `Q ${x} ${yTop} ${x + r} ${yTop}`,
    `L ${x + width - r} ${yTop}`,
    `Q ${x + width} ${yTop} ${x + width} ${yTop + r}`,
    `L ${x + width} ${yBase}`,
    "Z",
  ].join(" ");
}

export default function MonthlyChart({
  months,
  year,
}: {
  months: MonthlyTotals[];
  year: number;
}) {
  const width = 720;
  const height = 240;
  const pad = { top: 12, right: 12, bottom: 26, left: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const yBase = pad.top + plotH;

  const { ceiling, step } = niceScale(
    Math.max(...months.map((m) => Math.max(m.incomeCents, m.expenseCents))),
  );
  const yFor = (cents: number) => yBase - (cents / ceiling) * plotH;
  const ticks: number[] = [];
  for (let t = 0; t <= ceiling; t += step) ticks.push(t);

  const slot = plotW / 12;
  const barW = Math.min(14, (slot - 10) / 2);

  return (
    <div className="card chart-card" data-testid="monthly-chart">
      <p className="card-title">
        Income vs expenses · {year}
      </p>
      <div className="legend">
        <span>
          <span className="swatch" style={{ background: INCOME_COLOR }} />
          Income
        </span>
        <span>
          <span className="swatch" style={{ background: EXPENSE_COLOR }} />
          Expenses
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        role="img"
        aria-label={`Monthly income versus expenses for ${year}`}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke={t === 0 ? "#c3c2b7" : "#e1e0d9"}
              strokeWidth="1"
            />
            <text
              x={pad.left - 8}
              y={yFor(t) + 4}
              textAnchor="end"
              fontSize="11"
              fill="#898781"
            >
              {compactDollars(t)}
            </text>
          </g>
        ))}
        {months.map((m, i) => {
          const cx = pad.left + slot * i + slot / 2;
          return (
            <g key={m.month}>
              {m.incomeCents > 0 && (
                <path
                  d={barPath(cx - barW - 1, yFor(m.incomeCents), barW, yBase)}
                  fill={INCOME_COLOR}
                  data-bar="income"
                >
                  <title>{`${MONTH_LABELS[i]} income: ${formatCents(m.incomeCents)}`}</title>
                </path>
              )}
              {m.expenseCents > 0 && (
                <path
                  d={barPath(cx + 1, yFor(m.expenseCents), barW, yBase)}
                  fill={EXPENSE_COLOR}
                  data-bar="expense"
                >
                  <title>{`${MONTH_LABELS[i]} expenses: ${formatCents(m.expenseCents)}`}</title>
                </path>
              )}
              <text
                x={cx}
                y={height - 8}
                textAnchor="middle"
                fontSize="11"
                fill="#898781"
              >
                {MONTH_LABELS[i]}
              </text>
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>Monthly income and expenses, {year}</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Income</th>
            <th>Expenses</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m, i) => (
            <tr key={m.month}>
              <td>{MONTH_LABELS[i]}</td>
              <td>{formatCents(m.incomeCents)}</td>
              <td>{formatCents(m.expenseCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
