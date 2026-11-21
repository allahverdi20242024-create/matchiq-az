"use client";

import { useEffect, useState, type ReactNode } from "react";
import styles from "./season.module.css";

export function SeasonForm({ children, submit, pendingLabel }: {
  children: ReactNode;
  submit: string;
  pendingLabel: string;
}) {
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const reset = () => setPending(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  return <form action="/movsum-proqnozu" className={styles.controls} aria-busy={pending} onSubmit={event => {
    if (pending) event.preventDefault();
    else setPending(true);
  }}>
    {children}
    <button type="submit" className="button primary" disabled={pending}>{pending ? pendingLabel : submit}</button>
    <span className="sr-only" role="status">{pending ? pendingLabel : ""}</span>
  </form>;
}
