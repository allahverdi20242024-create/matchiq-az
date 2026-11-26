"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, Globe2, Lightbulb, RotateCcw, Trophy, X } from "lucide-react";
import { ClubLabel } from "@/components/crest-icons";
import careerArt from "@/lib/career-art.json";
import archiveArt from "@/lib/career-archive-crests.json";
import dataset from "../../../football-careers.json";
import styles from "./career.module.css";

type Player = (typeof dataset.players)[number];
type Question = { player: Player; options: Player[] };
const roundsPerGame = 5;
const levels = ["easy", "medium", "hard", "all"] as const;
type Level = (typeof levels)[number];
const flags: Record<string, { index: number }> = careerArt.flags;
const crests: Record<string, { src: string }> = careerArt.clubs;
const archiveCrests: Record<string, { index: number; source: string }> = archiveArt;
const reserveClubs = new Set(["Bryne 2", "Molde 2", "Sevilla Atlético", "Tallinna Kalev Juunior"]);
const unusedSpell = "Durgapur Vox Champions"; // The league folded before Okocha made an appearance.

function CountryFlag({ country }: { country: string }) {
  const art = flags[country];
  return art
    ? <span className={styles.flag} aria-hidden="true"
      style={{ backgroundPosition: `${(art.index % 8) * 100 / 7}% ${Math.floor(art.index / 8) * 100 / 3}%` }} />
    : <Globe2 size={15} aria-hidden="true" />;
}

function CareerClub({ name }: { name: string }) {
  const [failed, setFailed] = useState(false);
  const archive = archiveCrests[name];
  const art = crests[name];
  if (archive) return <span className="crest-label">
    <span className={styles.archiveCrest} aria-hidden="true"
      style={{ backgroundPosition: `${(archive.index % 6) * 20}% ${Math.floor(archive.index / 6) * 25}%` }} />
    <span>{name}</span>
  </span>;
  if (!art || failed) return <ClubLabel name={name} />;
  return <span className="crest-label">
    <span className="club-crest" data-size="small" data-surface="light" aria-hidden="true">
      <Image src={art.src} unoptimized alt="" width={22} height={22} onError={() => setFailed(true)} />
    </span>
    <span>{name}</span>
  </span>;
}

function sample<T,>(pool: T[], count: number) {
  for (let index = 0; index < count; index++) {
    const pick = index + Math.floor(Math.random() * (pool.length - index));
    [pool[index], pool[pick]] = [pool[pick], pool[index]];
  }
  return pool.slice(0, count);
}

function drawQuestions(level: Level): Question[] {
  const pool = dataset.players.filter(player => level === "all" || player.difficulty === level);
  return sample(pool, roundsPerGame).map(player => {
    const candidates = dataset.players.filter(other => other.id !== player.id && other.difficulty === player.difficulty);
    const options = sample([player, ...sample(candidates, 3)], 4);
    return { player, options };
  });
}

function Round({ question, en, next }: { question: Question; en: boolean; next: (points: number) => void }) {
  const { player, options } = question;
  const career = player.clubs.filter(club => !reserveClubs.has(club.name) && club.name !== unusedSpell);
  const archiveSources = [...new Set(career.map(club => club.name))].filter(name => Object.hasOwn(archiveCrests, name));
  const [wrong, setWrong] = useState<string[]>([]);
  const [hintCount, setHintCount] = useState(0);
  const [points, setPoints] = useState<number | null>(null);
  const continueButton = useRef<HTMLButtonElement>(null);
  const possible = Math.max(1, 3 - wrong.length - hintCount);

  useEffect(() => {
    if (points !== null) continueButton.current?.focus();
  }, [points]);

  function check(id: string) {
    if (points !== null || wrong.includes(id)) return;
    if (id === player.id) {
      setPoints(possible);
    } else {
      setWrong([...wrong, id]);
      if (wrong.length >= 2) setPoints(0);
    }
  }

  return <>
    <ol className={styles.clubs} aria-label={en ? "Club career" : "Klub karyerası"}>
      {career.map((club, index) => <li key={index}>
        <CareerClub name={club.name} />
        <small>{club.fromYear}{club.toYear !== club.fromYear && `–${club.toYear ?? (en ? "present" : "indi")}`}{club.loan && (en ? " · Loan" : " · İcarə")}</small>
      </li>)}
    </ol>
    <div className={styles.options} role="group" aria-label={en ? "Answer choices" : "Cavab variantları"}>
      {options.map(option => {
        const result = points !== null && option.id === player.id ? "correct" : wrong.includes(option.id) ? "wrong" : undefined;
        return <button type="button" key={option.id} data-result={result}
          disabled={points !== null || result === "wrong"} onClick={() => check(option.id)}>
          <span>{option.name}</span>
          {result === "correct" && <><Check size={17} aria-hidden="true" /><span className="sr-only">{en ? "Correct answer" : "Düzgün cavab"}</span></>}
          {result === "wrong" && <><X size={17} aria-hidden="true" /><span className="sr-only">{en ? "Incorrect answer" : "Yanlış cavab"}</span></>}
        </button>;
      })}
    </div>
    {points === null ? <>
      <div className={styles.actions}>
        <button type="button" onClick={() => setHintCount(hintCount + 1)} disabled={hintCount === 2}>
          <Lightbulb size={16} aria-hidden="true" />{en ? "Hint" : "İpucu"}
        </button>
        <button type="button" onClick={() => setPoints(0)}>{en ? "Reveal answer" : "Cavabı göstər"}</button>
      </div>
      <div role="status" className={styles.feedback}>
        {hintCount > 0 && <p><CountryFlag country={player.countryEn} /> {en ? player.countryEn : player.countryAz}
          {hintCount === 2 && ` · ${en ? player.positionEn : player.positionAz}`}</p>}
        {wrong.length > 0 && <p>{en ? `Try again. ${3 - wrong.length} attempts left.` : `Yenidən yoxla. Qalan cəhd sayı: ${3 - wrong.length}.`}</p>}
      </div>
    </> : <div className={styles.reveal}>
      <p role="status"><strong>{player.name}</strong> · +{points} {en ? "pts" : "xal"}</p>
      <div className={styles.actions}>
        <button ref={continueButton} type="button" className="primary" onClick={() => next(points)}>{en ? "Continue" : "Davam et"}</button>
        {player.sources.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer">
          {en ? "Source" : "Mənbə"}{player.sources.length > 1 && ` ${index + 1}`}
        </a>)}
      </div>
    </div>}
    {archiveSources.length > 0 && <details className={styles.artCredit}>
      <summary>{en ? "Additional logo sources" : "Əlavə loqo mənbələri"}</summary>
      <ul>{archiveSources.map(name => <li key={name}><a href={archiveCrests[name].source}>{name}</a></li>)}</ul>
    </details>}
  </>;
}

export function CareerGame({ en }: { en: boolean }) {
  const [level, setLevel] = useState<Level>("all");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const names = en ? ["Easy", "Medium", "Hard", "Mixed"] : ["Asan", "Orta", "Çətin", "Qarışıq"];
  const question = questions[round];
  const roundHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (questions.length > 0) roundHeading.current?.focus();
  }, [questions, round]);

  function start() {
    setQuestions(drawQuestions(level));
    setRound(0);
    setScore(0);
  }

  return <section className={`panel detail ${styles.game}`} aria-label={en ? "Player career quiz" : "Futbolçu karyerası oyunu"}>
    {question ? <>
      <div className={styles.top}><h2 ref={roundHeading} tabIndex={-1}>{en ? "Who is the player?" : "Bu futbolçu kimdir?"}</h2>
        <span>{round + 1}/{roundsPerGame} · {score} {en ? "pts" : "xal"}</span></div>
      <progress className={styles.progress} value={round + 1} max={roundsPerGame} aria-label={en ? "Quiz round" : "Oyun mərhələsi"} />
      <Round key={question.player.id} question={question} en={en} next={points => {
        setScore(score + points);
        setRound(round + 1);
      }} />
    </> : <>
      {questions.length > 0 ? <h2 ref={roundHeading} tabIndex={-1} className={styles.score}><Trophy size={24} aria-hidden="true" /> {score}/{roundsPerGame * 3} {en ? "points" : "xal"}</h2>
        : <p>{en ? "Guess the player from their club career." : "Klub karyerasına baxıb futbolçunu tap."}</p>}
      <div className={styles.actions}>
        <label htmlFor="career-level">{en ? "Difficulty" : "Çətinlik"}</label>
        <select id="career-level" value={level} onChange={event => setLevel(event.target.value as Level)}>
          {levels.map((value, index) => <option key={value} value={value}>{names[index]}</option>)}
        </select>
        <button type="button" className="primary" onClick={start}>
          {questions.length > 0 && <RotateCcw size={16} aria-hidden="true" />}
          {questions.length > 0 ? (en ? "Play again" : "Yenidən oyna") : (en ? "Start" : "Başla")}
        </button>
      </div>
    </>}
    <footer className={styles.artCredit}>
      {en ? "Club logos" : "Klub loqoları"} · <a href="https://football-logos.cc/">football-logos.cc</a>
      {" · "}{en ? "Flags" : "Bayraqlar"} · <a href="https://www.countryflags.com/">Countryflags.com</a>
    </footer>
  </section>;
}
