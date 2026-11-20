"use client";

import { useId, useState } from "react";
import { usePreferences } from "@/components/preferences-context";

type FixtureChoice = { id: string; home: string; away: string };
export type FixtureGroup = { code: string; label: string; choices: FixtureChoice[] };

const fieldStyle = "min-w-0 w-full rounded-lg border border-[var(--line)] bg-[var(--side)] p-2";
const normalize = (value: string) => value.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replaceAll("ı", "i");

export function FixturePicker({ groups, initialChoice }: { groups: FixtureGroup[]; initialChoice: string }) {
  const { t } = usePreferences();
  const searchId = useId();
  const matchId = useId();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(initialChoice);
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const filtered = terms.length ? groups.map((group) => ({
    ...group,
    choices: group.choices.filter(({ home, away }) => {
      const name = normalize(home + " " + away + " " + group.label);
      return terms.every((term) => name.includes(term));
    }),
  })).filter((group) => group.choices.length > 0) : groups;
  const visibleSelection = filtered.some((group) => group.choices.some(({ id }) => id === selected)) ? selected : "";

  return <div className="grid min-w-0 gap-2">
    <label className="sr-only" htmlFor={searchId}>{t.searchFixtures}</label>
    <input id={searchId} type="search" className={fieldStyle} placeholder={t.searchFixtures} value={query}
      onChange={(event) => setQuery(event.target.value)} />
    <label className="grid min-w-0 gap-1" htmlFor={matchId}>{t.match}
      <select id={matchId} required name="oyun" className={fieldStyle} value={visibleSelection}
        onChange={(event) => setSelected(event.target.value)}>
        <option value="" disabled>{filtered.length ? t.selectAMatch : t.noFixtureSearchResults}</option>
        {filtered.map((group) => <optgroup key={group.code} label={group.label}>
          {group.choices.map((item) => <option value={item.id} key={item.id}>{item.home} – {item.away}</option>)}
        </optgroup>)}
      </select>
    </label>
    <span className="sr-only" aria-live="polite">{!filtered.length && t.noFixtureSearchResults}</span>
  </div>;
}
