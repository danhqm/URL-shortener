import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { AnalyticsOverview } from "../lib/api";

export function AnalyticsChart({
  data,
}: {
  data: AnalyticsOverview | undefined;
}) {
  const total = data?.series.reduce((sum, point) => sum + point.clicks, 0) ?? 0;

  return (
    <section className="panel analytics-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">LAST 30 DAYS</span>
          <h2>{total.toLocaleString()} clicks</h2>
        </div>
        <span className="live-pill">
          <i /> Live data
        </span>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data?.series ?? []}
            margin={{ top: 12, right: 6, left: 6, bottom: 0 }}
          >
            <defs>
              <linearGradient id="clicks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff6b35" stopOpacity={0.42} />
                <stop offset="100%" stopColor="#ff6b35" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: string) => value.slice(5)}
              minTickGap={28}
            />
            <Tooltip
              labelFormatter={(value) =>
                new Date(`${value}T00:00:00Z`).toLocaleDateString()
              }
              contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
            />
            <Area
              type="monotone"
              dataKey="clicks"
              stroke="#ff6b35"
              strokeWidth={3}
              fill="url(#clicks)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
