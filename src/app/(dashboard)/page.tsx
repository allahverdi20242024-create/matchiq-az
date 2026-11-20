import Link from "next/link";
import { Activity, CalendarDays, ChartNoAxesCombined, FlaskConical, UsersRound } from "lucide-react";
import { ClubLabel, LeagueLabel } from "@/components/club-crest";
import { FixtureList } from "@/components/matches";
import { Badge } from "@/components/ui/badge";
import { bakuDate, formatDate } from "@/lib/demo";
import { fixtureDateOnly, fixtureDateTime, loadFixtureFeed, realMatchPath } from "@/lib/real-fixtures";
import styles from "./dashboard.module.css";

const quickLinks = [
  { title: "Monte Karlo simulyasiyası", description: "1–100 000 sınaq seç", href: "/real-oyunlar#simulation-title", icon: Activity },
  { title: "Komanda statistikası", description: "Forma, ev və səfər nəticələri", href: "/real-komandalar", icon: UsersRound },
  { title: "Modelin tarixi sınağı", description: "Brier göstəricisi və kalibrləmə", href: "/tarixce", icon: ChartNoAxesCombined },
];

function Pitch() {
  return <div className={styles.pitchVisual} aria-hidden="true">
    <div className={styles.pitchHalo} />
    <div className={styles.field}>
      <span className={styles.midline} />
      <span className={styles.centerCircle} />
      <span className={styles.centerSpot} />
      <span className={styles.leftBox} /><span className={styles.rightBox} />
      <span className={styles.leftGoal} /><span className={styles.rightGoal} />
      <span className={styles.route} /><span className={styles.routeSecond} />
      <span className={styles.markerOne} /><span className={styles.markerTwo} /><span className={styles.markerThree} />
    </div>
  </div>;
}

export default async function Home() {
  const feed = await loadFixtureFeed("upcoming");
  const now = new Date();
  const upcoming = feed?.competitions.flatMap((group) => group.matches.slice(0, 8)
    .map((match) => ({ ...match, competition: group.competition, stale: group.stale })))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.kickoff ?? "~").localeCompare(b.kickoff ?? "~"))
    .slice(0, 3) ?? [];

  return <>
    <div className="heading"><div><h1>İdarə paneli</h1><p>Oyun təqvimi və statistik proqnozların icmalı</p></div>
      <span className="date-tag"><CalendarDays size={16} aria-hidden="true" />{formatDate(bakuDate(now))}</span></div>

    <section className={styles.hero}>
      <Pitch />
      <div className={styles.heroContent}>
        <h2>Futbola <em>rəqəmlərlə</em> bax.</h2>
        <p>Real oyunları izlə, sınaq sayını seç və oyunöncəsi ehtimalları özün hesabla.</p>
        <Link className="primary" href="/real-oyunlar"><CalendarDays size={18} aria-hidden="true" /> Real oyunlara bax</Link>
      </div>
    </section>

    <nav className={styles.quickLinks} aria-label="Analitika bölmələri">
      {quickLinks.map(({ title, description, href, icon: Icon }) => <Link className={styles.quickLink} key={href} href={href}>
        <span className="stat-icon"><Icon size={19} aria-hidden="true" /></span>
        <span><strong>{title}</strong><small>{description}</small></span>
      </Link>)}
    </nav>

    <section className={styles.upcoming} aria-labelledby="real-preview">
      <div className="section-heading">
        <h2 id="real-preview"><CalendarDays size={22} aria-hidden="true" /> Qarşıdakı real oyunlar</h2>
        <Link className={styles.allLink} href="/real-oyunlar">Bütün real oyunlar</Link>
      </div>
      {upcoming.length > 0 ? <div className={styles.realGrid}>
        {upcoming.map((match) => <article className={styles.realCard} key={match.competition + match.id}>
          <div className={styles.realMeta}><LeagueLabel code={match.competition} /></div>
          <div className={styles.matchNames}><strong><ClubLabel name={match.home.name} /></strong><strong><ClubLabel name={match.away.name} /></strong></div>
          <time dateTime={match.kickoff ?? match.date}>{(match.kickoff ? fixtureDateTime : fixtureDateOnly).format(new Date(match.kickoff ?? match.date))}</time>
          {!match.kickoff && <span className={styles.timeNote}>Saat təsdiqlənməyib</span>}
          {match.stale && <Badge>Köhnəlmiş məlumat</Badge>}
          <Link className={styles.allLink} href={realMatchPath(match.id)}
            aria-label={match.home.name + " və " + match.away.name + " üçün oyun təhlilini aç"}>Oyun təhlili</Link>
        </article>)}
      </div> : <div className="panel detail muted">{feed ? "Hazırda qarşıdakı real oyun göstərilmir." : "Real oyun xidməti müvəqqəti əlçatan deyil."}</div>}
    </section>

    <div className={styles.demo}>
      <Badge><FlaskConical size={13} aria-hidden="true" /> Nümayiş məlumatları</Badge>
      <FixtureList period="bu-gun" now={now} title="Nümunə oyun cədvəli" showTabs={false} />
    </div>
  </>;
}
