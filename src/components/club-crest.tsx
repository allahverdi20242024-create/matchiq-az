import { getPreferences } from "@/lib/preferences";
import Image from "next/image";
import { Trophy } from "lucide-react";
import catalogImages from "@/lib/catalog-crests.json";
import { competitionName } from "@/lib/real-fixtures";

type CrestCredit = { author: string; source?: string; license?: string };
type ClubAsset = CrestCredit & { names: readonly string[]; asset: string; light?: boolean };
type CatalogImage = { code?: string; names?: string[]; asset?: string; source: string };

const clubs: readonly ClubAsset[] = [
  { names: ["Le Havre AC", "Le Havre", "Havre AC", "Havre Athletic Club"], asset: "le-havre", author: "Le Havre AC" },
  { names: ["FC Internazionale Milano", "Inter Milan", "Internazionale"], asset: "inter-milan", author: "FC Internazionale Milano", source: "https://commons.wikimedia.org/wiki/File:Inter_Milano_2021_logo_with_2_stars.svg", light: true },
  { names: ["TSG 1899 Hoffenheim", "TSG Hoffenheim", "1899 Hoffenheim"], asset: "hoffenheim", author: "TSG 1899 Hoffenheim", source: "https://commons.wikimedia.org/wiki/File:Logo_TSG_Hoffenheim.svg", light: true },
  { names: ["Olympique de Marseille", "Olympique Marseille"], asset: "marseille", author: "Olympique de Marseille", source: "https://commons.wikimedia.org/wiki/File:Olympique_de_Marseille_2026_logo.svg", light: true },
  {
    names: ["FC Bayern München", "FC Bayern Munich", "Bayern Munich"],
    asset: "bayern-munchen", author: "FC Bayern München",
    source: "https://commons.wikimedia.org/wiki/File:FC_Bayern_M%C3%BCnchen_logo_(2017).svg",
  },
  {
    names: ["1. FC Köln", "1. FC Koln"], asset: "fc-koln", author: "1. FC Köln",
    source: "https://commons.wikimedia.org/wiki/File:Wappen_1_FC_Koeln.svg",
    license: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    names: ["ES Troyes AC", "ESTAC Troyes", "Troyes"], asset: "estac-troyes", author: "ESTAC Troyes",
    source: "https://commons.wikimedia.org/wiki/File:ESTAC_Troyes_Logo.svg",
  },
  {
    names: ["Borussia Dortmund", "BVB"], asset: "borussia-dortmund", author: "Borussia Dortmund",
    source: "https://commons.wikimedia.org/wiki/File:Borussia_Dortmund_logo.svg",
  },
  { names: ["Hamburger SV"], asset: "hamburger-sv", author: "Hamburger SV", source: "https://commons.wikimedia.org/wiki/File:Hamburger_SV_logo.svg" },
  { names: ["SV Werder Bremen","Werder Bremen"], asset: "werder-bremen", author: "SV Werder Bremen", source: "https://commons.wikimedia.org/wiki/File:SV-Werder-Bremen-Logo.svg" },
  { names: ["FC Schalke 04","Schalke 04"], asset: "schalke-04", author: "FC Schalke 04", source: "https://commons.wikimedia.org/wiki/File:FC_Schalke_04_Logo.svg" },
  { names: ["Juventus FC","Juventus","Juventus Turin"], asset: "juventus", author: "Juventus FC", source: "https://commons.wikimedia.org/wiki/File:Juventus_FC_-_logo_black_(Italy%2C_2017).svg", light: true },
];

const leagues: Partial<Record<string, CrestCredit>> = {
  PL: { author: "Premier League" },
  PD: { author: "LaLiga", source: "https://commons.wikimedia.org/wiki/File:LaLiga_EA_Sports_2023_Vertical_Logo.svg" },
  SA: { author: "Lega Serie A", source: "https://commons.wikimedia.org/wiki/File:Serie_A.svg" },
  BL1: { author: "DFL" },
  FL1: { author: "Ligue 1" },
  CL: { author: "UEFA", source: "https://commons.wikimedia.org/wiki/File:UEFA_Champions_League_logo.png" },
};

const normalizeName = (name: string) => name.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();
const catalog: readonly CatalogImage[] = catalogImages;
const catalogClubs = new Map(catalog.flatMap((item) => {
  const { names, asset } = item;
  return names && asset ? names.map((name) => [normalizeName(name), { asset, light: true }] as const) : [];
}));
const catalogLeagues = new Set(catalog.flatMap((item) => item.code ? [item.code] : []));
const clubIndex = new Map(clubs.flatMap((club) => club.names.map((name) => [normalizeName(name), club] as const)));

export function ClubCrest({ name, size = "large" }: { name: string; size?: "small" | "large" }) {
  const normalized = normalizeName(name);
  const crest = clubIndex.get(normalized) ?? catalogClubs.get(normalized);
  const initials = name.split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0, 3).map((word) => word[0]).join("").toLocaleUpperCase("az");
  const dimension = size === "large" ? 56 : 22;
  return <span className="club-crest" data-size={size} data-surface={crest?.light ? "light" : undefined} aria-hidden="true">
    {crest ? <Image src={"/club-crests/" + crest.asset + ".webp"} width={dimension} height={dimension} unoptimized alt="" /> : <b>{initials}</b>}
  </span>;
}

export function ClubLabel({ name }: { name: string }) {
  return <span className="crest-label"><ClubCrest name={name} size="small" /><span>{name}</span></span>;
}

export async function LeagueLabel({ code }: { code: string }) {
  const { t } = await getPreferences();
  const league = leagues[code];
  const hasLogo = Boolean(league) || catalogLeagues.has(code);
  return <span className="crest-label">
    <span className="league-crest" data-surface={hasLogo ? "light" : undefined} aria-hidden="true">
      {hasLogo ? <Image src={"/league-crests/" + code.toLowerCase() + ".webp"} width={24} height={24} unoptimized alt="" />
        : <Trophy size={16} />}
    </span>
    <span>{competitionName(code, t)}</span>
  </span>;
}

async function CreditList({ entries }: { entries: CrestCredit[] | readonly CrestCredit[] }) {
  const { t } = await getPreferences();
  return <ul className="mt-2 space-y-1">
    {entries.map((item) => <li key={item.source ?? item.author}>
      {item.source ? <a href={item.source}>{item.author} · Wikimedia Commons</a> : <>{item.author}{" "}{t.userProvidedLogo}</>}
      {item.license ? <> · <a href={item.license}>CC BY-SA 4.0</a></> : item.source && " " + t.creditPublicDomain}
      {" " + t.convertedToWebp}
    </li>)}
  </ul>;
}

export async function CrestCredits() {
  const { t } = await getPreferences();
  const leagueEntries = Object.values(leagues).filter((item): item is CrestCredit => item !== undefined);
  return <details className="crest-credits">
    <summary>{t.logoSourcesAndLicences}</summary>
    {catalog.length > 0 && <p className="mt-2">
      {t.someClubAndCompetitionLogosComeFrom}{" "}<a href="https://football-logos.cc/">football-logos.cc</a>{t.logosAreDisplayedForIdentification}{" "}<a href="https://football-logos.cc/license/">{t.termsOfUse}</a>
    </p>}
    <p className="mt-2">{t.uefaCrestCredit}{" "}<a href="https://www.uefa.com/uefachampionsleague/clubs/">UEFA.com</a></p>
    <div className="crest-credit-grid">
      <section><h2>{t.clubs}</h2><CreditList entries={clubs} /></section>
      <section><h2>{t.competitions}</h2><CreditList entries={leagueEntries} /></section>
    </div>
  </details>;
}
