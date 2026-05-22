export default function LandingPage() {
  const features = [
    { id: "1.", title: "Import Airtable", text: "Connect the YSWS base and pull pending submissions instantly." },
    { id: "2.", title: "Check Repo Stats", text: "Fetch commits, contributors, repo health, and suspicious patterns." },
    { id: "3.", title: "Detect Fraud", text: "Spot reused repos, suspicious activity, and possible double dippers." },
    { id: "4.", title: "Review Faster", text: "See everything reviewers need in one place with less tab switching." },
    { id: "5.", title: "Approve Clearly", text: "Make decisions faster with cleaner context and a better queue." },
  ];

  return (
    <main className="min-h-screen bg-[#e82d45] text-white">
      <section className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-12">
        <nav className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src="/orpheus-flag.png"
                alt="Hack Club flag"
                className="h-14 w-auto object-contain sm:h-16"
              />
            </div>

            <div>
              <h1 className="text-4xl font-light tracking-tight sm:text-5xl">Velocity</h1>
              <div className="mt-1 h-[2px] w-28 bg-white/80" />
            </div>
          </div>

          <button className="rounded-xl border border-black/10 bg-[#49e0c2] px-5 py-2 text-sm font-medium text-[#16332b] shadow-[0_4px_0_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_0_rgba(0,0,0,0.14)] active:translate-y-0">
            Sign Up
          </button>
        </nav>

        <div className="mt-10 max-w-3xl">
          <p className="text-xl leading-relaxed sm:text-2xl">
            Velocity is the anti-fraud, auto-checking, lightning-fast command center
            for YSWS reviewers.
          </p>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-semibold">Features:</h2>

          <div className="mt-8 hidden lg:block">
            <div className="grid grid-cols-3 gap-10">
              <FeatureCard {...features[0]} />
              <FeatureCard {...features[1]} />
              <FeatureCard {...features[2]} />
            </div>

            <div className="pointer-events-none relative mx-auto mt-4 h-12 max-w-5xl">
              <div className="absolute left-[16.5%] top-1/2 h-[3px] w-[17%] -translate-y-1/2 bg-white/90" />
              <div className="absolute left-[50%] top-1/2 h-[3px] w-[17%] -translate-y-1/2 bg-white/90" />
              <div className="absolute right-[16.5%] top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-r-[3px] border-t-[3px] border-white" />
            </div>

            <div className="grid grid-cols-3 gap-10">
              <div />
              <FeatureCard {...features[4]} />
              <FeatureCard {...features[3]} />
            </div>

            <div className="pointer-events-none relative mx-auto -mt-36 h-44 max-w-5xl">
              <div className="absolute right-[15.5%] top-0 h-24 w-[3px] bg-white/90" />
              <div className="absolute right-[15.5%] top-24 h-[3px] w-24 bg-white/90" />
              <div className="absolute right-[34%] bottom-8 h-[3px] w-24 bg-white/90" />
              <div className="absolute right-[15.1%] top-[5.4rem] h-3 w-3 rotate-45 border-r-[3px] border-t-[3px] border-white" />
              <div className="absolute right-[33.5%] bottom-[1.55rem] h-3 w-3 rotate-[225deg] border-r-[3px] border-t-[3px] border-white" />
            </div>
          </div>

          <div className="mt-8 grid gap-5 lg:hidden">
            {features.map((feature) => (
              <div key={feature.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <FeatureCard {...feature} />
                </div>
              </div>
            ))}
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

                    <button className="rounded-xl bg-[#49e0c2] px-6 py-3 text-base font-semibold text-[#16332b] shadow-[0_4px_0_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_0_rgba(0,0,0,0.14)] active:translate-y-0">
                        Open Dashboard
                    </button>
                </div>
            </div>
        </div>
      </section>
    </main>
    );
}

function FeatureCard({
    id,
    title,
    text,
}: {
    id: string;
    title: string;
    text: string;
}) {
    return (
        <div className="rounded-[28px] border border-black/10 bg-[#49e0c2] p-6 text-[#16332b] shadow-[0_6px_0_rgba(0,0,0,0.14)]">
            <p className="text-sm font-semibold">{id}</p>
            <h3 className="mt-3 text-xl font-bold">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-[#16332b]/85">{text}</p>
        </div>
    );
}