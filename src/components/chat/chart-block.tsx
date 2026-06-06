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

  // Dynamic height: more rows → taller (esp. horizontal bars)
  const rowCount = spec.data.length;
  const height = isHorizontal
    ? Math.max(180, rowCount * 44 + 60)
    : isPie
    ? 280
    : Math.max(240, 240);

  // Compute left margin for horizontal labels
  const longestLabel = isHorizontal
    ? Math.max(...spec.data.map((d) => String(d[xKey] ?? "").length))
    : 0;
  const leftMargin = isHorizontal ? Math.min(160, Math.max(80, longestLabel * 7)) : 8;

  const valueFormatter = (v: unknown) => formatNum(v, unit);

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
                data={spec.data}
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
                {spec.data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : isLine ? (
            <LineChart data={spec.data} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
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
              data={spec.data}
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
                    angle={spec.data.length > 5 ? -20 : 0}
                    textAnchor={spec.data.length > 5 ? "end" : "middle"}
                    height={spec.data.length > 5 ? 56 : 30}
                  />
                  <YAxis
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatNum(v, unit)}
                    width={48}
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
                    spec!.data.map((_, idx) => (
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
    </figure>
  );
}
