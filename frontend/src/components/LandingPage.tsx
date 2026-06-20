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
      </div>
    </div>
  )
}