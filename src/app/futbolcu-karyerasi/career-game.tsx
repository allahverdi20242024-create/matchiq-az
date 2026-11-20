"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { Globe2, Lightbulb, RotateCcw, Trophy } from "lucide-react";
import { ClubLabel } from "@/components/crest-icons";
import { normalizeSearch } from "@/lib/search-text";
import careerArt from "@/lib/career-art.json";
import dataset from "../../../football-careers.json";
import styles from "./career.module.css";

type Player = (typeof dataset.players)[number];
const roundsPerGame = 5;
const levels = ["easy", "medium", "hard", "all"] as const;
type Level = (typeof levels)[number];
const flags: Record<string, { src: string }> = careerArt.flags;
const crests: Record<string, { src: string }> = careerArt.clubs;

function CountryFlag({ country }: { country: string }) {
  const [failed, setFailed] = useState(false);
  const art = flags[country];
  return art && !failed
    ? <Image className={styles.flag} src={art.src} unoptimized alt="" width={24} height={17} onError={() => setFailed(true)} />
    : <Globe2 size={15} aria-hidden="true" />;
}

function CareerClub({ name }: { name: string }) {
  const [failed, setFailed] = useState(false);
  const art = crests[name];
  if (!art || failed) return <ClubLabel name={name} />;
  return <span className="crest-label">
    <span className="club-crest" data-size="small" data-surface="light" aria-hidden="true">
      <Image src={art.src} unoptimized alt="" width={22} height={22} onError={() => setFailed(true)} />
    </span>
    <span>{name}</span>
  </span>;
}

function drawPlayers(level: Level) {
  const pool = dataset.players.filter(player => level === "all" || player.difficulty === level);
  for (let index = 0; index < roundsPerGame; index++) {
    const pick = index + Math.floor(Math.random() * (pool.length - index));
    [pool[index], pool[pick]] = [pool[pick], pool[index]];
  }
  return pool.slice(0, roundsPerGame);
}

function Round({ player, en, next }: { player: Player; en: boolean; next: (points: number) => void }) {
  const [guess, setGuess] = useState("");
  const [misses, setMisses] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [points, setPoints] = useState<number | null>(null);
  const possible = Math.max(1, 3 - misses - hintCount);

  function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeSearch(guess);
    if (!normalized || points !== null) return;
    if (player.acceptedAnswers.some(answer => normalizeSearch(answer) === normalized)) {
      setPoints(possible);
    } else if (misses >= 2) {
      setPoints(0);
    } else {
      setMisses(misses + 1);
    }
    setGuess("");
  }

  return <>
    <ol className={styles.clubs} aria-label={en ? "Club career" : "Klub karyerası"}>
      {player.clubs.map((club, index) => <li key={index}>
        <CareerClub name={club.name} />
        <small>{club.fromYear}{club.toYear !== club.fromYear && `–${club.toYear ?? (en ? "present" : "indi")}`}{club.loan && (en ? " · Loan" : " · İcarə")}</small>
      </li>)}
    </ol>
    {points === null ? <>
      <form className={styles.guess} onSubmit={check}>
        <label className="sr-only" htmlFor="career-answer">{en ? "Player name" : "Futbolçunun adı"}</label>
        <input id="career-answer" placeholder={en ? "Player name" : "Futbolçunun adı"} value={guess} onChange={event => setGuess(event.target.value)} required maxLength={100} autoComplete="off" />
        <button type="submit" className="primary">{en ? "Check answer" : "Cavabı yoxla"}</button>
      </form>
      <div className={styles.actions}>
        <button type="button" onClick={() => setHintCount(hintCount + 1)} disabled={hintCount === 2}>
          <Lightbulb size={16} aria-hidden="true" />{en ? "Hint" : "İpucu"}
        </button>
        <button type="button" onClick={() => setPoints(0)}>{en ? "Reveal answer" : "Cavabı göstər"}</button>
      </div>
      <div role="status" className={styles.feedback}>
        {hintCount > 0 && <p><CountryFlag country={player.countryEn} /> {en ? player.countryEn : player.countryAz}
          {hintCount === 2 && ` · ${en ? player.positionEn : player.positionAz}`}</p>}
        {misses > 0 && <p>{en ? `Try again. ${3 - misses} attempts left.` : `Yenidən yoxla. Qalan cəhd sayı: ${3 - misses}.`}</p>}
      </div>
    </> : <div className={styles.reveal}>
      <p role="status"><strong>{player.name}</strong> · +{points} {en ? "pts" : "xal"}</p>
      <div className={styles.actions}>
        <button type="button" className="primary" onClick={() => next(points)}>{en ? "Continue" : "Davam et"}</button>
        {player.sources.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer">
          {en ? "Source" : "Mənbə"}{player.sources.length > 1 && ` ${index + 1}`}
        </a>)}
      </div>
    </div>}
  </>;
}

export function CareerGame({ en }: { en: boolean }) {
  const [level, setLevel] = useState<Level>("all");
  const [players, setPlayers] = useState<Player[]>([]);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const names = en ? ["Easy", "Medium", "Hard", "Mixed"] : ["Asan", "Orta", "Çətin", "Qarışıq"];
  const player = players[round];
  function start() {
    setPlayers(drawPlayers(level));
    setRound(0);
    setScore(0);
  }

  return <section className={`panel detail ${styles.game}`} aria-label={en ? "Player career quiz" : "Futbolçu karyerası oyunu"}>
    {player ? <>
      <div className={styles.top}><h2>{en ? "Who is the player?" : "Bu futbolçu kimdir?"}</h2>
        <span>{round + 1}/{roundsPerGame} · {score} {en ? "pts" : "xal"}</span></div>
      <Round key={player.id} player={player} en={en} next={points => {
        setScore(score + points);
        setRound(round + 1);
      }} />
    </> : <>
      {players.length > 0 ? <h2 className={styles.score}><Trophy size={24} aria-hidden="true" /> {score}/{roundsPerGame * 3} {en ? "points" : "xal"}</h2>
        : <p>{en ? "Guess the player from their club career." : "Klub karyerasına baxıb futbolçunu tap."}</p>}
      <p className="muted">{en ? "5 rounds · Earn 1–3 points per correct answer. Hints and wrong guesses reduce the score." : "5 raund · Düzgün cavaba 1–3 xal. İpucları və səhv cavablar xalı azaldır."}</p>
      <div className={styles.actions}>
        <label htmlFor="career-level">{en ? "Difficulty" : "Çətinlik"}</label>
        <select id="career-level" value={level} onChange={event => setLevel(event.target.value as Level)}>
          {levels.map((value, index) => <option key={value} value={value}>{names[index]}</option>)}
        </select>
        <button type="button" className="primary" onClick={start}>
          {players.length > 0 && <RotateCcw size={16} aria-hidden="true" />}
          {players.length > 0 ? (en ? "Play again" : "Yenidən oyna") : (en ? "Start" : "Başla")}
        </button>
      </div>
    </>}
    <footer className={styles.artCredit}>
      {en ? "Club logos" : "Klub loqoları"} · <a href="https://football-logos.cc/">football-logos.cc</a>
      {" · "}{en ? "Flags" : "Bayraqlar"} · <a href="https://www.countryflags.com/">Countryflags.com</a>
    </footer>
  </section>;
}
