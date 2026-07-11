import { todayUtc } from "@/lib/dates";

// One-click date ranges for from/to reports.
export default function PresetLinks({ basePath }: { basePath: string }) {
  const today = todayUtc();
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const q = Math.floor(m / 3);
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const presets = [
    { label: "This month", from: Date.UTC(y, m, 1), to: Date.UTC(y, m + 1, 0) },
    {
      label: "This quarter",
      from: Date.UTC(y, q * 3, 1),
      to: Date.UTC(y, q * 3 + 3, 0),
    },
    { label: "This year", from: Date.UTC(y, 0, 1), to: Date.UTC(y, 11, 31) },
    {
      label: "Last year",
      from: Date.UTC(y - 1, 0, 1),
      to: Date.UTC(y - 1, 11, 31),
    },
  ];
  return (
    <p className="report-controls" data-testid="preset-links">
      {presets.map((p) => (
        <a key={p.label} href={`${basePath}?from=${iso(p.from)}&to=${iso(p.to)}`}>
          {p.label}
        </a>
      ))}
    </p>
  );
}
