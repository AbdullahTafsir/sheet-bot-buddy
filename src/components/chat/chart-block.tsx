import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartSpec = {
  type: "bar" | "line" | "pie" | "horizontal-bar";
  title?: string;
  subtitle?: string;
  xKey?: string;
  yKey?: string;
  unit?: string; // e.g. "%", "★", "$"
  series?: string[];
  data: Array<Record<string, string | number>>;
};

const COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#a855f7",
  "#14b8a6",
  "#ec4899",
];

const AXIS_TICK = { fontSize: 11, fill: "#475569" };
const AXIS_LINE = { stroke: "#cbd5e1" };
const GRID = "#e2e8f0";

const TOOLTIP_STYLE: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  fontSize: 12,
  color: "#0f172a",
  boxShadow: "0 8px 24px -8px rgba(15,23,42,0.15)",
  padding: "8px 12px",
};

function formatNum(n: unknown, unit?: string) {
  if (typeof n !== "number") return String(n ?? "");
  const v = Math.abs(n) >= 1000 ? n.toLocaleString() : Number(n.toFixed(2)).toString();
  return unit ? `${v}${unit}` : v;
}

export function ChartBlock({ raw }: { raw: string }) {
  let spec: ChartSpec | null = null;
  try {
    spec = JSON.parse(raw) as ChartSpec;
  } catch {
    return (
      <pre className="my-3 overflow-auto rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
        Invalid chart JSON
      </pre>
    );
  }
  if (!spec || !Array.isArray(spec.data) || spec.data.length === 0) return null;

  const xKey = spec.xKey ?? "name";
  const yKey = spec.yKey ?? "value";
  const series = spec.series && spec.series.length > 0 ? spec.series : [yKey];
  const unit = spec.unit ?? "";
  const isHorizontal = spec.type === "horizontal-bar";
  const isPie = spec.type === "pie";
  const isLine = spec.type === "line";

  // Coerce + recover from common model mistakes (label put in value field,
  // value put in label field like "4.73★", numeric strings with units).
  const parseNum = (raw: unknown): number => {
    if (typeof raw === "number") return raw;
    if (typeof raw === "string") {
      const n = Number(raw.replace(/[^0-9.\-]/g, ""));
      return Number.isFinite(n) ? n : NaN;
    }
    return NaN;
  };
  const looksNumeric = (s: string) => /^\s*-?\d+(\.\d+)?\s*[★%$€]?\s*$/.test(s);

  const data = spec.data
    .map((row, idx) => {
      const out: Record<string, string | number> = { ...row };
      let label = row[xKey] == null ? "" : String(row[xKey]).trim();
      const primary = series[0];
      let primaryNum = parseNum(row[primary]);

      // Recover when the model swapped label/value or left the label blank.
      // Look across all other fields for a real text label (non-numeric string).
      const needsRecovery =
        !label ||
        looksNumeric(label) ||
        !Number.isFinite(primaryNum);
      if (needsRecovery) {
        const altLabel = Object.entries(row)
          .filter(([k, v]) => k !== xKey && typeof v === "string" && String(v).trim() !== "" && !looksNumeric(String(v)))
          .map(([, v]) => String(v).trim())[0];
        if (looksNumeric(label) && (!Number.isFinite(primaryNum) || primaryNum === 0)) {
          primaryNum = parseNum(label);
        }
        if (altLabel && (!label || looksNumeric(label))) {
          label = altLabel;
        }
      }
      if (!label) label = `Item ${idx + 1}`;

      out[xKey] = label;
      for (const s of series) {
        const n = s === primary ? primaryNum : parseNum(row[s]);
        out[s] = Number.isFinite(n) ? n : 0;
      }
      return out;
    })
    .filter((row) => {
      const hasValue = series.some((s) => typeof row[s] === "number" && (row[s] as number) !== 0);
      return hasValue;
    });

  // Compute value-axis domain so tightly-clustered values (e.g. ratings 4.2–4.8)
  // render as distinguishable bars instead of all looking ~the same from 0.
  const allValues = data.flatMap((r) => series.map((s) => Number(r[s])).filter(Number.isFinite));
  let valueDomain: [number | "auto", number | "auto"] = ["auto", "auto"];
  if (allValues.length > 0) {
    const min = Math.min(...allValues);
    if (unit === "★") {
      // Ratings: zoom so 4.2 vs 4.8 are distinguishable; always cap at 5.
      const lo = Math.max(0, Math.floor((min - 0.3) * 10) / 10);
      valueDomain = [lo, 5];
    }
    // For %, $, counts etc. keep auto domain anchored at 0 so widths stay proportional.
  }

  // Dynamic height: more rows → taller (esp. horizontal bars)
  const rowCount = data.length;
  const height = isHorizontal
    ? Math.max(180, rowCount * 44 + 60)
    : isPie
    ? 280
    : Math.max(240, 240);

  // Compute left margin for horizontal labels
  const longestLabel = isHorizontal
    ? Math.max(...data.map((d) => String(d[xKey] ?? "").length))
    : 0;
  const leftMargin = isHorizontal ? Math.min(160, Math.max(80, longestLabel * 7)) : 8;

  const valueFormatter = (v: unknown) => formatNum(v, unit);

  const horizontalMetric = series[0];
  const horizontalValues = isHorizontal
    ? data.map((row) => Number(row[horizontalMetric])).filter(Number.isFinite)
    : [];
  const horizontalMin = horizontalValues.length ? Math.min(...horizontalValues) : 0;
  const horizontalMax = horizontalValues.length ? Math.max(...horizontalValues) : 0;
  const horizontalStart = unit === "★" ? Math.max(0, Math.floor((horizontalMin - 0.3) * 10) / 10) : 0;
  const horizontalEnd = unit === "★" ? 5 : Math.max(1, Math.ceil(horizontalMax * 1.15 * 10) / 10);
  const horizontalRange = Math.max(0.0001, horizontalEnd - horizontalStart);
  const horizontalTicks = Array.from({ length: 5 }, (_, i) => horizontalStart + (horizontalRange * i) / 4);
  const horizontalWidth = (value: number) => {
    const pct = ((value - horizontalStart) / horizontalRange) * 100;
    return `${Math.min(100, Math.max(value > 0 ? 3 : 0, pct))}%`;
  };

  return (
    <figure className="my-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {(spec.title || spec.subtitle) && (
        <div className="border-b border-slate-100 px-5 py-3">
          {spec.title && (
            <figcaption className="text-sm font-semibold tracking-tight text-slate-900">
              {spec.title}
            </figcaption>
          )}
          {spec.subtitle && (
            <p className="mt-0.5 text-xs text-slate-500">{spec.subtitle}</p>
          )}
        </div>
      )}
      {isHorizontal ? (
        <div className="px-5 py-4">
          <div className="space-y-3">
            {data.map((row, idx) => {
              const label = String(row[xKey] ?? `Item ${idx + 1}`);
              const value = Number(row[horizontalMetric]);
              return (
                <div
                  key={`${label}-${idx}`}
                  className="grid items-center gap-3"
                  style={{ gridTemplateColumns: "minmax(120px, 34%) minmax(0, 1fr) 56px" }}
                >
                  <div
                    className="min-w-0 text-xs font-medium leading-snug text-slate-700"
                    title={label}
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {label}
                  </div>
                  <div className="relative h-7 min-w-0 overflow-hidden rounded-sm">
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `linear-gradient(to right, ${GRID} 1px, transparent 1px)`,
                        backgroundSize: "25% 100%",
                      }}
                    />
                    <div
                      className="absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r"
                      style={{
                        width: horizontalWidth(Number.isFinite(value) ? value : 0),
                        backgroundColor: COLORS[idx % COLORS.length],
                      }}
                    />
                  </div>
                  <div className="text-right text-xs font-semibold text-slate-700">
                    {valueFormatter(Number.isFinite(value) ? value : 0)}
                  </div>
                </div>
              );
            })}
          </div>
          <div
            className="mt-2 grid gap-3"
            style={{ gridTemplateColumns: "minmax(120px, 34%) minmax(0, 1fr) 56px" }}
          >
            <div />
            <div className="flex justify-between text-[10px] font-medium text-slate-400">
              {horizontalTicks.map((tick, idx) => (
                <span key={idx}>{formatNum(tick, unit)}</span>
              ))}
            </div>
            <div />
          </div>
        </div>
      ) : (
        <div className="px-3 py-4" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
          {isPie ? (
            <PieChart>
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number, n: string) => [valueFormatter(v), n]}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ fontSize: 12, color: "#475569", paddingTop: 8 }}
              />
              <Pie
                data={data}
                dataKey={yKey}
                nameKey={xKey}
                outerRadius={90}
                innerRadius={50}
                paddingAngle={2}
                stroke="white"
                strokeWidth={2}
                label={(e: { value: number }) => valueFormatter(e.value)}
                labelLine={false}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : isLine ? (
            <LineChart data={data} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey={xKey}
                tick={AXIS_TICK}
                axisLine={AXIS_LINE}
                tickLine={false}
              />
              <YAxis
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatNum(v, unit)}
                width={48}
                domain={valueDomain}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={valueFormatter} />
              {series.length > 1 && (
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, color: "#475569", paddingTop: 8 }}
                />
              )}
              {series.map((s, i) => (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 0, fill: COLORS[i % COLORS.length] }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart
              data={data}
              layout={isHorizontal ? "vertical" : "horizontal"}
              margin={{
                top: 16,
                right: isHorizontal ? 48 : 16,
                left: isHorizontal ? 0 : 8,
                bottom: 8,
              }}
              barCategoryGap={isHorizontal ? "20%" : "25%"}
            >
              <CartesianGrid
                stroke={GRID}
                horizontal={isHorizontal ? false : true}
                vertical={isHorizontal ? true : false}
              />
              {isHorizontal ? (
                <>
                  <XAxis
                    type="number"
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatNum(v, unit)}
                    domain={valueDomain}
                    allowDataOverflow={false}
                  />
                  <YAxis
                    type="category"
                    dataKey={xKey}
                    tick={AXIS_TICK}
                    axisLine={AXIS_LINE}
                    tickLine={false}
                    width={leftMargin}
                  />
                </>
              ) : (
                <>
                  <XAxis
                    dataKey={xKey}
                    tick={AXIS_TICK}
                    axisLine={AXIS_LINE}
                    tickLine={false}
                    interval={0}
                    angle={data.length > 5 ? -20 : 0}
                    textAnchor={data.length > 5 ? "end" : "middle"}
                    height={data.length > 5 ? 56 : 30}
                  />
                  <YAxis
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatNum(v, unit)}
                    width={48}
                    domain={valueDomain}
                  />
                </>
              )}
              <Tooltip
                cursor={{ fill: "rgba(15,23,42,0.04)" }}
                contentStyle={TOOLTIP_STYLE}
                formatter={valueFormatter}
              />
              {series.length > 1 && (
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, color: "#475569", paddingTop: 8 }}
                />
              )}
              {series.map((s, i) => (
                <Bar
                  key={s}
                  dataKey={s}
                  fill={COLORS[i % COLORS.length]}
                  radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                  maxBarSize={isHorizontal ? 28 : 56}
                >
                  {series.length === 1 &&
                    data.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  {series.length === 1 && (
                    <LabelList
                      dataKey={s}
                      position={isHorizontal ? "right" : "top"}
                      formatter={valueFormatter as (v: unknown) => string}
                      style={{ fontSize: 11, fill: "#334155", fontWeight: 500 }}
                    />
                  )}
                </Bar>
              ))}
            </BarChart>
          )}
          </ResponsiveContainer>
        </div>
      )}
    </figure>
  );
}
