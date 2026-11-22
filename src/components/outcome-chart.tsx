"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart, Bar, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { usePreferences } from "@/components/preferences-context";
import { outcomeColors } from "@/lib/demo";

const duration = 950;

export function OutcomeChart({ values }: { values: readonly number[] }) {
  return <AnimatedOutcomeChart key={values.join(":")} values={values} />;
}

function AnimatedOutcomeChart({ values }: { values: readonly number[] }) {
  const { t, intlLocale } = usePreferences();
  const container = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let start: number | undefined;
    let lastPaint = -Infinity;
    const animate = (now: number) => {
      start ??= now;
      const elapsed = Math.min((now - start) / duration, 1);
      if (motion.matches || elapsed === 1 || now - lastPaint >= 1000 / 30) {
        lastPaint = now;
        setProgress(motion.matches ? 1 : 1 - (1 - elapsed) ** 3);
      }
      if (elapsed < 1 && !motion.matches) frame = requestAnimationFrame(animate);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      frame = requestAnimationFrame(animate);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  const format = useMemo(() => new Intl.NumberFormat(intlLocale, {
    style: "percent", maximumFractionDigits: 2,
  }), [intlLocale]);
  const data = [t.home, t.draw, t.away].map((name, index) => {
    const value = values[index] * progress;
    return { name, value, label: format.format(value / 100) };
  });

  return <div ref={container} className="chart" aria-hidden="true">
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart data={data} margin={{ top: 26, right: 12, left: -18, bottom: 4 }} accessibilityLayer={false}>
        <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tickFormatter={(value) => value + "%"} tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
        <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={56} isAnimationActive={false}>
          {data.map(({ name }, index) => <Cell key={name} fill={`var(--outcome-${index}, ${outcomeColors[index]})`} />)}
          <LabelList dataKey="label" position="top" offset={6} fill="var(--ink)" fontSize={12} fontWeight={750} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>;
}
