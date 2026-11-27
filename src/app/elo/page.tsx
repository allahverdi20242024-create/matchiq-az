import Link from "next/link";
import { ClubLabel, LeagueLabel } from "@/components/club-crest";
import { dateKey } from "@/lib/fixture-date";
import { bakuDate } from "@/lib/demo";
import { rankClubs } from "@/lib/elo";
import { getPreferences } from "@/lib/preferences";
import { fixtureDateTime, loadFixtureFeed } from "@/lib/real-fixtures";

export default async function EloPage({ searchParams }: { searchParams: Promise<{ liqa?: string }> }) {
  const [{ locale, intlLocale }, { liqa }, feed] = await Promise.all([
    getPreferences(), searchParams, loadFixtureFeed("results", dateKey(bakuDate(new Date()))),
  ]);
  const en = locale === "en";
  const groups = feed?.competitions ?? [];
  const selected = groups.find(group => group.competition === liqa) ??
    groups.find(group => group.competition === "CL") ?? groups[0];
  const rows = selected ? rankClubs(selected.matches) : [];
  const number = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 1 });
  return <>
    <div className="heading"><h1>{en ? "Club Elo rankings" : "Klubların Elo sıralaması"}</h1></div>
    {groups.length > 0 && <nav className="tabs flex-wrap mb-4" aria-label={en ? "Competitions" : "Turnirlər"}>
      {groups.map(group => <Link key={group.competition} href={"/elo?liqa=" + group.competition}
        prefetch={false} aria-current={group === selected ? "page" : undefined}>
        <LeagueLabel code={group.competition} />
      </Link>)}
    </nav>}
    {rows.length ? <div className="league-table-scroll" tabIndex={0} role="region" aria-label={en ? "Elo table" : "Elo cədvəli"}>
      <table className="league-table w-full border-collapse text-left text-sm [&_td]:px-2 [&_td]:py-2 [&_th]:px-2 [&_th]:py-2 [&_tr]:border-b [&_tr]:border-[var(--line)]">
        <thead><tr><th scope="col">#</th><th scope="col">{en ? "Club" : "Klub"}</th>
          <th scope="col">{en ? "Played" : "Oyun"}</th><th scope="col">Elo</th></tr></thead>
        <tbody>{rows.map((club, index) => <tr key={club.id}>
          <td>{index + 1}</td><th scope="row"><ClubLabel name={club.name} /></th>
          <td>{club.played}</td><td><strong>{number.format(club.rating)}</strong></td>
        </tr>)}</tbody>
      </table>
    </div> : <p className="panel empty" role="status">{feed
      ? (en ? "Not enough completed matches." : "Kifayət qədər tamamlanmış oyun yoxdur.")
      : (en ? "Match data is temporarily unavailable." : "Oyun məlumatları müvəqqəti əlçatan deyil.")}</p>}
    {selected && <p className="muted text-sm mt-3">
      {en ? "Current-season results within this competition" : "Bu turnirin cari mövsüm nəticələri"}
      {" · "}<time dateTime={selected.fetched_at}>{fixtureDateTime(intlLocale).format(new Date(selected.fetched_at))}</time>
    </p>}
  </>;
}
