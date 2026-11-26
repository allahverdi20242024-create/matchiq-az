"use client";

import dynamic from "next/dynamic";

export const DeferredOutcomeChart = dynamic(
  () => import("./outcome-chart").then(module => module.OutcomeChart),
  { ssr: false, loading: () => <div className="chart" aria-hidden="true" /> },
);
