"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { ClubLabel, LeagueCrest } from "@/components/crest-icons";
import { usePreferences } from "@/components/preferences-context";
import { normalizeSearch } from "@/lib/search-text";

export type TeamSearchEntry = { href: string; name: string; competition: string; label: string };

export function TeamSearch({ teams }: { teams: TeamSearchEntry[] }) {
  const { t } = usePreferences();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const term = normalizeSearch(query).replaceAll(" ", "");
  const results = term ? teams.filter(({ name }) =>
    normalizeSearch(name).replaceAll(" ", "").includes(term)) : [];

  return <div className="mb-4 w-full max-w-xl">
    <label className="sr-only" htmlFor={inputId}>{t.searchTeams}</label>
    <div className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3">
      <Search size={18} className="muted shrink-0" aria-hidden="true" />
      <input id={inputId} type="search" value={query} placeholder={t.searchTeams}
        onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 py-2" />
    </div>
    {term && (results.length ? <ul className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--panel)]">
      {results.map(({ href, name, competition, label }) => <li key={href}>
        <Link href={href} prefetch={false} onClick={() => setQuery("")}
          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 hover:bg-[var(--accent-bg)]">
          <ClubLabel name={name} />
          <small className="muted flex items-center gap-2"><LeagueCrest code={competition} />{label}</small>
        </Link>
      </li>)}
    </ul> : <p className="muted mt-2 text-sm" role="status">{t.noTeamsFound}</p>)}
  </div>;
}
