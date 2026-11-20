"use client";

import { useId, useState } from "react";
import { ClubLabel, LeagueCrest } from "@/components/crest-icons";
import { usePreferences } from "@/components/preferences-context";

import { filterFixtureGroups, type FixtureGroup } from "@/lib/fixture-search";

const fieldStyle = "min-w-0 w-full rounded-lg border border-[var(--line)] bg-[var(--side)] p-2";

function FixtureIdentity({ home, away, label, code }: {
  home: string; away: string; label: string; code: string;
}) {
  return <>
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <ClubLabel name={home} /><span aria-hidden="true">–</span><ClubLabel name={away} />
    </span>
    <small className="muted mt-1 flex items-center gap-2"><LeagueCrest code={code} />{label}</small>
  </>;
}

export function FixturePicker({ groups, initialChoice }: { groups: FixtureGroup[]; initialChoice: string }) {
  const { t } = usePreferences();
  const searchId = useId();
  const matchId = useId();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(initialChoice);
  const filtered = filterFixtureGroups(groups, query);
  const suggestions = query.trim() ? filtered.flatMap(({ label, code, choices }) =>
    choices.map((choice) => ({ ...choice, label, code }))).slice(0, 8) : [];
  const selectedGroup = filtered.find((group) => group.choices.some(({ id }) => id === selected));
  const selectedChoice = selectedGroup?.choices.find(({ id }) => id === selected);
  const visibleSelection = selectedChoice?.id ?? "";

  return <div className="grid min-w-0 gap-2">
    <label className="sr-only" htmlFor={searchId}>{t.searchFixtures}</label>
    <input id={searchId} type="search" className={fieldStyle} placeholder={t.searchFixtures} value={query}
      onChange={(event) => setQuery(event.target.value)} />
    {suggestions.length > 0 && <ul className="max-h-56 overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--side)]">
      {suggestions.map(({ id, home, away, label, code }) => <li key={id}>
        <button type="button" className="block w-full px-3 py-2 text-left hover:bg-[var(--panel)]"
          onClick={() => { setSelected(id); setQuery(""); }}>
          <FixtureIdentity home={home} away={away} label={label} code={code} />
        </button>
      </li>)}
    </ul>}
    <label className="grid min-w-0 gap-1" htmlFor={matchId}>{t.match}
      <select id={matchId} required name="oyun" className={fieldStyle} value={visibleSelection}
        onChange={(event) => setSelected(event.target.value)}>
        <option value="" disabled>{filtered.length ? t.selectAMatch : t.noFixtureSearchResults}</option>
        {filtered.map((group) => <optgroup key={group.code} label={group.label}>
          {group.choices.map((item) => <option value={item.id} key={item.id}>{item.home} – {item.away}</option>)}
        </optgroup>)}
      </select>
    </label>
    {selectedGroup && selectedChoice && <div className="rounded-lg border border-[var(--line)] px-3 py-2">
      <FixtureIdentity home={selectedChoice.home} away={selectedChoice.away} label={selectedGroup.label} code={selectedGroup.code} />
    </div>}
    <span className="sr-only" aria-live="polite">{!filtered.length && t.noFixtureSearchResults}</span>
  </div>;
}
