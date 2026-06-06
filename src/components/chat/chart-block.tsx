import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  xKey?: string;
  yKey?: string;
  series?: string[]; // for multi-series bar/line
  data: Array<Record<string, string | number>>;
};

const COLORS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#3b82f6", // blue
  "#a855f7", // purple
  "#14b8a6", // teal
  "#ec4899", // pink
];
const AXIS_COLOR = "hsl(220 9% 46%)";
const GRID_COLOR = "hsl(220 13% 91%)";
const TOOLTIP_STYLE = {
  background: "white",
  border: "1px solid hsl(220 13% 91%)",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(222 47% 11%)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

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

  return (
    <figure className="my-4 rounded-xl border border-border bg-card p-4">
      {spec.title && (
        <figcaption className="mb-3 text-sm font-medium text-foreground">
          {spec.title}
        </figcaption>
      )}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {spec.type === "pie" ? (
            <PieChart>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Pie
                data={spec.data}
                dataKey={yKey}
                nameKey={xKey}
                outerRadius={90}
                innerRadius={40}
                paddingAngle={2}
              >
                {spec.data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : spec.type === "line" ? (
            <LineChart data={spec.data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
              {series.map((s, i) => (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart
              data={spec.data}
              layout={spec.type === "horizontal-bar" ? "vertical" : "horizontal"}
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              {spec.type === "horizontal-bar" ? (
                <>
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey={xKey} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={100} />
                </>
              ) : (
                <>
                  <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                </>
              )}
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
              {series.map((s, i) => (
                <Bar key={s} dataKey={s} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]}>
                  {series.length === 1 &&
                    spec!.data.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                </Bar>
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
