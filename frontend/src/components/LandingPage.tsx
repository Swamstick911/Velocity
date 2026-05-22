"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";

export default function LandingPage() {
  const features = [
    { id: "1.", title: "Import Airtable", text: "Connect the YSWS base and pull pending submissions instantly." },
    { id: "2.", title: "Check Repo Stats", text: "Fetch commits, contributors, repo health, and suspicious patterns." },
    { id: "3.", title: "Detect Fraud", text: "Spot reused repos, suspicious activity, and possible double dippers." },
    { id: "4.", title: "Review Faster", text: "See everything reviewers need in one place with less tab switching." },
    { id: "5.", title: "Approve Clearly", text: "Make decisions faster with cleaner context and a better queue." },
  ];

  const card1 = useRef<HTMLDivElement>(null);
  const card2 = useRef<HTMLDivElement>(null);
  const card3 = useRef<HTMLDivElement>(null);
  const card4 = useRef<HTMLDivElement>(null);
  const card5 = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const drawArrows = () => {
    const svg = svgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap) return;
    if ([card1, card2, card3, card4, card5].some(r => !r.current)) return;

    const base = wrap.getBoundingClientRect();
    svg.setAttribute("width", String(wrap.offsetWidth));
    svg.setAttribute("height", String(wrap.offsetHeight));
    svg.innerHTML = "";

    const mid = (el: HTMLDivElement) => {
      const r = el.getBoundingClientRect();
      return {
        cx: r.left - base.left + r.width / 2,
        top: r.top - base.top,
        bot: r.bottom - base.top,
        left: r.left - base.left,
        right: r.right - base.left,
        midY: r.top - base.top + r.height / 2,
      };
    };

    const c1 = mid(card1.current!);
    const c2 = mid(card2.current!);
    const c3 = mid(card3.current!);
    const c4 = mid(card4.current!);
    const c5 = mid(card5.current!);

    const line = (x1: number, y1: number, x2: number, y2: number) => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
      el.setAttribute("x1", String(x1)); el.setAttribute("y1", String(y1));
      el.setAttribute("x2", String(x2)); el.setAttribute("y2", String(y2));
      el.setAttribute("stroke", "white"); el.setAttribute("stroke-width", "2.5");
      svg.appendChild(el);
    };

    const arrowhead = (tipX: number, tipY: number, dx: number, dy: number) => {
      const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      const size = 8;
      const nx = -dy, ny = dx;
      poly.setAttribute("points",
        `${tipX},${tipY} ` +
        `${tipX - dx * size + nx * size * 0.5},${tipY - dy * size + ny * size * 0.5} ` +
        `${tipX - dx * size - nx * size * 0.5},${tipY - dy * size - ny * size * 0.5}`
      );
      poly.setAttribute("fill", "white");
      svg.appendChild(poly);
    };

    // 1 → 2
    line(c1.right, c1.midY, c2.left, c2.midY);
    arrowhead(c2.left, c2.midY, 1, 0);

    // 2 → 3
    line(c2.right, c2.midY, c3.left, c3.midY);
    arrowhead(c3.left, c3.midY, 1, 0);

    // 3 ↓ then → into card4 right side (clean L-shaped elbow)
    const elbowY = c4.midY;
    line(c3.cx, c3.bot, c3.cx, elbowY);
    line(c3.cx, elbowY, c4.right, elbowY);
    arrowhead(c4.right, elbowY, -1, 0);

    // 5 ← 4
    line(c4.left, c4.midY, c5.right, c5.midY);
    arrowhead(c5.right, c5.midY, -1, 0);
  };

  useEffect(() => {
    drawArrows();
    window.addEventListener("resize", drawArrows);
    return () => window.removeEventListener("resize", drawArrows);
  }, []);

  return (
    <main className="min-h-screen bg-[#e82d45] text-white">
      {/* ↓ CHANGED: removed mx-auto/max-w/px/py so section is truly full-bleed */}
      <section className="relative w-full pb-6">

        <nav className="flex items-start justify-between gap-4 pr-5 sm:pr-8 lg:pr-12">
          <div className="flex items-start gap-2">
            {/* ↓ CHANGED: removed margin/style so it touches top-left corner */}
            <img
              src="https://assets.hackclub.com/flag-orpheus-top.png"
              alt="Hack Club Orpheus flag"
              className="pointer-events-none h-20 w-auto object-contain sm:h-24"
            />
            <div className="mt-8">
              <h1 className="relative inline-block text-4xl font-light tracking-tight sm:text-5xl">
                <svg
                  className="absolute -top-4 left-0 w-full"
                  height="16"
                  viewBox="0 0 100 16"
                  preserveAspectRatio="none"
                  fill="none"
                  aria-hidden="true"
                >
                  <line x1="2" y1="10" x2="92" y2="10" stroke="white" strokeWidth="2" />
                  <polygon points="100,10 88,5 88,15" fill="white" />
                </svg>
                Velocity
              </h1>
              <div className="mt-1 h-[2px] w-36 bg-white/80" />
            </div>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-black/10 bg-[#49e0c2] px-5 py-2 text-sm font-medium text-[#16332b] shadow-[0_4px_0_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_0_rgba(0,0,0,0.14)] active:translate-y-0"
          >
            Sign Up
          </Link>
        </nav>

        {/* ↓ CHANGED: all content below nav gets its own padded container */}
        <div className="px-5 sm:px-8 lg:px-12">
          <div className="mt-8 max-w-3xl">
            <p className="text-xl leading-relaxed sm:text-2xl">
              Velocity is the anti-fraud, auto-checking, lightning-fast command center
              for YSWS reviewers.
            </p>
          </div>

          <div className="mt-10">
            <h2 className="text-2xl font-semibold">Features:</h2>

            <div ref={wrapRef} className="relative mt-8 hidden lg:block">
              <div className="grid grid-cols-3 gap-8">
                <div ref={card1}><FeatureCard {...features[0]} /></div>
                <div ref={card2}><FeatureCard {...features[1]} /></div>
                <div ref={card3}><FeatureCard {...features[2]} /></div>
              </div>

              <div className="mt-6 grid grid-cols-6 gap-8">
                <div className="col-span-1" />
                <div className="col-span-2" ref={card5}><FeatureCard {...features[4]} /></div>
                <div className="col-span-2" ref={card4}><FeatureCard {...features[3]} /></div>
                <div className="col-span-1" />
              </div>

              <svg
                ref={svgRef}
                className="pointer-events-none absolute inset-0"
                style={{ overflow: "visible" }}
                aria-hidden="true"
              />
            </div>

            <div className="mt-8 grid gap-5 lg:hidden">
              {features.map((feature) => (
                <div key={feature.id} className="flex-1">
                  <FeatureCard {...feature} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 border-t border-white/60">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <h2 className="text-4xl font-light sm:text-5xl">How to use it?</h2>
            <div className="mt-3 h-[2px] w-24 bg-white/80" />
            <p className="mt-10 text-xl leading-relaxed text-white/95 sm:text-2xl">
              Connect Velocity to the Airtable base that stores YSWS submissions, then review repos, stats, and fraud checks from one place.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <button className="rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-base font-medium backdrop-blur-sm transition hover:bg-white/15">
                More info
              </button>
              <Link
                href="/dashboard"
                className="rounded-xl bg-[#49e0c2] px-6 py-3 text-base font-semibold text-[#16332b] shadow-[0_4px_0_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_0_rgba(0,0,0,0.14)] active:translate-y-0"
              >
                Open Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ id, title, text }: { id: string; title: string; text: string }) {
  return (
    <div className="rounded-[28px] border border-black/10 bg-[#49e0c2] p-6 text-[#16332b] shadow-[0_6px_0_rgba(0,0,0,0.14)]">
      <p className="text-sm font-semibold">{id}</p>
      <h3 className="mt-3 text-xl font-bold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#16332b]/85">{text}</p>
    </div>
  );
}