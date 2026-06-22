"use client"

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, ArrowRight, Zap } from "lucide-react";
import { Space_Mono } from "next/font/google";

const INK = "#17171d";

//Engine Teaser data
const SCENARIOS = [
  {
    repo: "pixel-pet",
    program: "Boba Drops",
    signals: [
      { label: "Age eligible", ok: true, note: "16 yrs" },
      { label: "Demo is live", ok: true, note: "HTTP 200" },
      { label: "README has substance", ok: true, note: "1,652 words" },
      { label: "Real commit history", ok: true, note: "30 commits" },
      { label: "Not a double dip", ok: true, note: "first seen" }, 
    ],
    score: 0,
    tier: "CLEAN",
    tierColor: "#33d6a6",
  },
  {
    repo: "totally-not-copied",
    program: "Sprig",
    signals: [
      { label: "Age eligible", ok: true, note: "17 yrs" },
      { label: "Demo is live", ok: false, note: "dead link" },
      { label: "README has substance", ok: true, note: "ok" },
      { label: "Real commit history", ok: false, note: "1 commit, 2.4k lines" },
      { label: "Not a double dip", ok: false, note: "also in Blot" }, 
    ],
    score: 80,
    tier: "FLAGGED",
    tierColor: "#ec3750",
  }
];

//Small hand-drawn bits
function RoughUnderline({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 300 18"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M3 12 C 60 4. 120 16, 180 9 S 270 5, 297 11"
        stroke="#ffd43b"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Stamp({
  children,
  color,
  rotate = -6,
  animate = false,
}: {
  children: React.ReactNode;
  color: string;
  rotate?: number;
  animate?: boolean;
}) {
  return (
    <span
      className="inline-block rounded-md border-[3px] px-2 py-0.5 text-xs font-black uppercase tracking-widest"
      style={{
        color,
        borderColor: color,
        transform: `rotate(${rotate}deg)`,
        animation: animate ? "lp-stamp .5s ease-out both" : undefined,
      }}
    >
      {children}
    </span>
  );
}

//The animated engine teaser
function EngineTeaser() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [tick, setTick] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);

  const scenario = SCENARIOS[scenarioIdx];
  const revealCount = scenario.signals.length;
  const endTick = revealCount + 4;

  //main loop
  useEffect(() =>  {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReduced(true);
      return;
    }
    const id = setInterval(() => {
      setTick((t) => {
        if (t >= endTick) {
          setScenarioIdx((x) => (x + 1) % SCENARIOS.length);
          return 0;
        }
        return t + 1;
      });
    }, 760)
    return () => clearInterval(id);
  }, [endTick]);

  const showResult = reduced || tick > revealCount;
  const visibleSignals = reduced
    ? scenario.signals
    : scenario.signals.slice(0, Math.min(tick, revealCount));
  const r = reduced ? SCENARIOS[1] : scenario;
  const resolved = reduced ? SCENARIOS[1] : scenario;

  //score count-up
  useEffect(() => {
    if (!showResult) {
      setDisplayScore(0);
      return;
    }
    const target = resolved.score;
    if (target === 0) {
      setDisplayScore(0);
      return;
    }
    let cur = 0;
    const id = setInterval(() => {
      cur += Math.ceil(target / 12);
      if (cur >= target) {
        cur = target;
        clearInterval(id);
      }
      setDisplayScore(cur);
    }, 45);
    return () => clearInterval(id);
  }, [showResult, resolved.score]);

  const sigs = reduced ? resolved.signals : visibleSignals;

  return (
    <div
      className="w-full max-w-md -rotate-2 rounded-3xl border-4 border-[#17171d] bg-[#f9d8de] p-2 shadow-[0_12px_0_#17171d]"
      style={{ animation: reduced ? undefined : "lp-bob 6s ease-in-out infinite" }}
    >
      {/* browser chrome */}
      <div className="flex items-center gap-2 px-2 py-2">
        <span className="h-3 w-3 rounded-full bg-[#ec3750]"/>
        <span className="h-3 w-3 rounded-full bg-[#ffd43b]"/>
        <span className="h-3 w-3 rounded-full bg-[#33d6a6]"/>
        <span className="ml-2 truncate rounded-md bg-white/70 px-2 py-0.5 text-[10px] font-bold text-[#8492a6]">
          velocity . preflight
        </span>
      </div>

      <div className="rounded-2xl border-2 border=[#17171d] bg-white p-4">
        {/* submission header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8492a6]">
              Now reviewing
            </p>
            <p className="truncate text-lg font-black text-[#17171d]">
              {resolved.repo}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#17171d] px-2 py-1 text-[10px] font-black uppercase text-white">
            {resolved.program}
          </span>
        </div>

        {/* scanning bar */}
        <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-[#f3f4f6]">
          {!showResult && (
            <span 
              className="absolute inset-y-0 w-1/3 rounded-full bg-[#338eda]"
              style={{ animation: "lp-scan 0.9s linear infinite" }}
            />
          )}
          {showResult && (
            <span
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: "100%", background: resolved.tierColor }}
            />
          )}
        </div>
        <p className="mt-2 text-[11px] font-bold text-[#8492a6]">
          {showResult ? "Scan complete": "Running 12 checks..."}
        </p>

        {/* signals */}
        <div className="mt-3 space-y-1.5">
          {sigs.map((s, i) => (
            <div
              key={`${resolved.repo}-${i}`}
              className="flex items-center justify-between gap-2 rounded-lg bg-[#f7f3ea] px-2 py-1.5"
              style={{ animation: "lp-row .35s ease-out both" }}
            >
              <div className="flex items-center gap-2">
                {s.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-[#1aa179]"/>
                ) : (
                  <AlertTriangle className="h-4 w-4 text-[#ff8c37]"/>
                )}
                <span className="text-xs font-bold text-[#17171d]">{s.label}</span>
              </div>
              <span 
                className="text-[10px] font-bold"
                style={{ color: s.ok ? "#8492a6" : "#ec3750" }}
              >
                {s.note}
              </span>
            </div>
          ))}
        </div>

        {/* result */}
        {showResult && (
          <div className="mt-4 flex items-center justify-between border-t-2 border-dashed border-[#e0e6ed] pt-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#8492a6]">
                Risk score
              </p>
              <p 
                className="text-3xl font-black"
                style={{
                  color: resolved.tierColor,
                  animation: "lp-pop .4s ease-out both",
                }}
              >
                {displayScore}
              </p>
            </div>
            <Stamp color={resolved.tierColor} animate>
              {resolved.tier}
            </Stamp>
          </div>
        )}
      </div>
    </div>
  );
}

//The "most wanted" lineup
const LINEUP = [
  {
    name: "The Double Dipper",
    evidence: "Same repo, submitted to 5 different YSWS programs",
    caught: "normalized-URL + root-commit match",
    rotate: "-rotate-2",
    color: "#338eda",
  },
  {
    name: "The AI Slopper",
    evidence: "2,400 lines of code. One commit. No git history",
    caught: "commit-cadence heuristics",
    rotate: "rotate-1",
    color: "#ff8c37",
  },
  {
    name: "The Ghost Demo",
    evidence: "Playable link 404s or is a parked Vercel page",
    caught: "live-URL + placeholder check",
    rotate: "rotate-2",
    color: "#9b59ff",
  },
  {
    name: "The time inflator",
    evidence: "Logged 40 Hackatime hours for 50 lines of code",
    caught: "hours-vs-code ratio",
    rotate: "-rotate-1",
    color: "#33d6a6",
  },
];

//Page
export default function LandingPage() {
  return (
    <main
      style={{ fontFamily: "'Phantom Sans', system-ui, sans-serif" }}
      className="min-h-screen overflow-x-hidden bg-[#ec3750] text-white"  
    >
      <style>{`
        @keyframes lp-stamp { 0%{opacity:0;transform:scale(1.8) rotate(-18deg);} 60%{opacity:1;transform:scale(.92) rotate(-7deg);} 100%{transform:scale(1) rotate(-6deg);} }
        @keyframes lp-pop { 0%{opacity:0;transform:scale(.4);} 70%{transform:scale(1.12);} 100%{opacity:1;transform:scale(1);} }
        @keyframes lp-row { 0%{opacity:0;transform:translateY(10px);} 100%{opacity:1;transform:none;} }
        @keyframes lp-bob { 0%,100%{transform:translateY(0) rotate(-2deg);} 50%{transform:translateY(-10px) rotate(-2deg);} }
        @keyframes lp-scan { 0%{transform:translateX(-120%);} 100%{transform:translateX(320%);} }
        @media (prefers-reduced-motion: reduce){ *{animation:none !important;} }
      `}</style>

      {/* top bar */}
      <nav className="flex items-center justify-between px-5 pb-4 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          <img 
            src="https://assets.hackclub.com/flag-orpheus-top.png"
            alt="Hack Club"
            className="h-12 w-auto sm:h-14"
          />
          <div className="leading-none">
            <span className="text-2xl font-black">Velocity</span>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
              by Swastik (alb)
            </p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="rounded-xl border-2 border-[#17171d] bg-[#ffd43b] px-4 py-2 text-sm font-black text-[#17171d]"
        >
          Open Dashboard
        </Link>
      </nav>

      {/* hero */}
      <section className="grid items-center gap-10 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:px-12 lg:pt-10">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#17171d] bg-white px-3 py-1 text-xs font-black uppercase tracking-wider text-[#17171d]">
            <Zap className="h-3.5 w-3.5" /> 12 checks . ~3 seconds
          </span>

          <h1 className="mt-5 text-5xl font-black leading-[0.95] sm:text-6xl">
            Catch the cheaters.{" "}
            <span className="relative inline-block">
              Ship the real one
              <RoughUnderline className="absolute -bottom-2 left-0 h-3 w-full"/>
            </span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-white/95">
            Velocity pulls every submission from your YSWS Airtable, runs the anti-fraud engine in seconds,
            and stamps the double-dippers, AI Slop, and dead demos- so you spend less time on the projects that
            are actually <span className="font-black">real</span>
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-[#17171d] bg-[#33d6a6] px-6 py-3 text-base font-black text-[#17171d] shadow-[0_5px_0_#17171d] transition active:translate-y-1 active:shadow-none"
            >
              Open Dashboard <ArrowRight className="h-4 w-4"/>
            </Link>
            <a
              href="#how"
              className="rounded-xl border-2 border-white/40 px-6 py-3 text-base font-bold text-white transition hover:border-white"  
            >
              See how it works
            </a>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <EngineTeaser/>
        </div>
      </section>

      {/* the lineup */}
      <section className="border-t-4 border-[#17171d] bg-[#f3f4ea] px-5 py-16 text-[#17171d] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-black sm:text-4xl">The usual suspects</h2>
          <p className="mt-2 max-w-xl text-base font-bold text-[#5c6675]">
            Every YSWS gets them. Velocity sees them all and tells
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {LINEUP.map((s) => (
              <div
                key={s.name}
                className={`${s.rotate} rounded-2xl border-4 border-[#17171d] bg-white p-5 shadow-[0_8px_0_#17171d] transition hover:-translate-y-1`}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h3 className="text-lg font-black leading-tight">{s.name}</h3>
                  <Stamp color="#ec3750" rotate={8}>
                    Caught
                  </Stamp>
                </div>
                <p className="text-sm font-medium leading-6 text-[#17171d]">
                  {s.evidence}
                </p>
                <p
                  className="mt-4 border-t-2 border-dashed border-[#e0e6ed] pt-3 text-[11px] font-black uppercase tracking-wide"
                  style={{ color: s.color }}
                >
                  caught by {s.caught}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="px-5 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-black sm:text-4xl">Three steps, then you ship</h2>

          <div className="relative mt-12 grid gap-8 lg:grid-cols-3">
            {[
              { n: "1", t: "Connect Airtable", d: "Log in with Airtable. Velocity pulls your pending YSWS submissions into a prioritized queue." },
              { n: "2", t: "Velocity scans", d: "Repo health, commit history, demo, Hackatime, double-dips - 12 checks, scored into a clean / review / flagged tier."},
              { n: "3", t: "You decide", d: "Demo, code, and stats in one place. Approve or reject - flagged ones make you look twice first." },
            ].map((step, i) => (
              <div key={step.n} className="relative">
                <div className="h-full rounded-2xl border-4 border-[#17171d] bg-[#338eda] p-6 text-white shadow-[0_8px_0_#17171d]">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#17171d] bg-[#ffd43b] text-lg font-black text-[#17171d]">
                    {step.n}
                  </span>
                  <h3 className="mt-4 text-xl font-black">{step.t}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/90">{step.d}</p>
                </div>
                {/* hand drawn arrow to the next card (desktop only) */}
                {i < 2 && (
                  <svg
                    className="absolute -right-7 top-1/2 hidden h-6 w-8 -translate-y-1/2 lg:block"
                    viewBox="0 0 40 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path d="M2 12 C 14 4, 26 20, 34 12" stroke="#17171d" strokeWidth="3" strokeLinecap="round"/>
                    <path d="M34 12 L 27 8 M34 12 L 27 17" stroke="#17171d" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* footer */}
      <section className="relative overflow-hidden border-t-4 border-[#17171d] bg-[#17171d] px-5 py-20 text-center sm:px-8">
        <span className="absolute -left-4 top-6 hidden -rotate-12 rounded-lg border-2 border-white/30 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white/40 sm:block">
          as seen by sleep-deprived reviewers
        </span>
        <h2 className="mx-auto max-w-2xl text-4xl font-black leading-tight text-white sm:text-5xl">
          Stop playing detective.{" "}
          <span className="text-[#33d6a6]">Let Velocity do it</span>
        </h2>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-xl border-2 border-[#17171d] bg-[#33d6a6] px-7 py-3.5 text-lg font-black text-[#17171d] shadow-[0_5px_0_#0f5e44] transition active:translate-y-1 active:shadow-none"
        >
          Open Dashboard <ArrowRight className="h-5 w-5"/>
        </Link>
        <p className="mt-8 flex items-center justify-center gap-2 text-sm font-bold text-white/60">
          made with <span className="text-[#ec3750]">♥</span> at Hack Club
          <img
            src="https://assets.hackclub.com/icon-rounded.png"
            alt=""
            className="h-6 w-auto"
            style={{ animation: "lp-bob 5s ease-in-out infinite" }}
          />
        </p>
      </section>
    </main>
  );
}