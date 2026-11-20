"use client";

import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { usePreferences } from "@/components/preferences-context";
import { outcomeColors } from "@/lib/demo";

export function OutcomeChart({ values }: { values: readonly number[] }) {
  const { t } = usePreferences();
  const data = [t.home, t.draw, t.away].map((name, index) => ({ name, value: values[index] }));
  return <div className="chart" aria-hidden="true">
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart data={data} margin={{ top: 10, right: 12, left: -18, bottom: 4 }} accessibilityLayer={false}>
        <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tickFormatter={(value) => value + "%"} tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
        <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={56} isAnimationActive={false}>
          {data.map(({ name }, index) => <Cell key={name} fill={`var(--outcome-${index}, ${outcomeColors[index]})`} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>;
}
