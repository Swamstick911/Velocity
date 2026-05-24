"use-client";

import {
    AlertTriangle,
    CheckCircle,
    Clock,
    Code,
    Copy,
    ExternalLink,
    Search,
    XCircle,
} from "lucide-react";

interface CheckResult {
    passed: boolean;
    detail: string;
}

interface PreflightResponse {
    overall_passed: boolean;
    birth_year_check: CheckResult;
    readme_check: CheckResult;
    playable_url_check: CheckResult;
    anti_fraud_check: CheckResult;
    flags: string[];
}

interface Submission {
    id: string;
    github_url: string;
    playable_url: string;
    target_program: string;
    status: "pending" | "clean" | "flagged" | string;
    birth_year: number | null;
}

interface RepoStats {
    name: string;
    description: string | null;
    stars: number;
    forks: number;
    language: string | null;
    openIssues: number;
    pushedAt: string;
    commitCount: number;
    commits: any[];
    contributors: any[];
    maxAdditions: number;
    aiSlopFlag: boolean;
}

interface CopypastaItem {
    label: string;
    text: string;
}

interface MobileReviewerDashboardProps {
    activeProject: Submission | null;
    preflight: PreflightResponse | null;
    repoStats: RepoStats | null;
    statsLoading: boolean;
    iframeMode: "demo" | "github" | "stats";
    setIframeMode: (mode: "demo" | "github" | "stats") => void;
    fetchRepoStats: (githubUrl: string) => void;
    handleStatusUpdate: (newStatus: string) => void;
    scanLoading: boolean;
    runPreflight: () => void;
    copied: number | null;
    handleCopy: (idx: number, text: string) => void;
    copypastas: CopypastaItem[];
    queueCount: number;
}

const MobileCheckRow = ({
    result,
    label,
}: {
    result: CheckResult;
    label: string;
}) => (
    <div className="flex items-start gap-2 rounded-xl bg-white/50 px-2.5 py-2">
        {result.passed ? (
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#19a974]" />
        ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#ec3750]" />
        )}
        <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#17171d]">
                {label}
            </p>
            <p className="text-[11px] leading-snug text-[#5f6c7b]">{result.detail}</p>
        </div>
    </div>
);

function StatusIndicator({ status }: { status?: string}) {
    const normalized = (status || "pending").toLowerCase();

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
                <span
                    className={`h-2.5 w-2.5 rounded-full ${
                        normalized === "pending" ? "bg-[#8492a6]" : "bg-[#d1d5db]"
                    }`}/>
                <span 
                    className={`h-2.5 w-2.5 rounded-full ${
                        normalized === "clean" || normalized === "approved"
                            ? "bg-[#19c37d]"
                            : "bg-[#d1d5db]"
                    }`}/>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-white/90">
                    {normalized === "flagged"
                        ? "Flagged"
                        : normalized === "clean" || normalized === "approved"
                        ? "Clean"
                        : "Pending"}
            </span>
        </div>
    );
}

export default function MobileReviewerDashboard({
    activeProject,
    preflight,
    repoStats,
    statsLoading,
    iframeMode,
    setIframeMode,
    fetchRepoStats,
    handleStatusUpdate,
    scanLoading,
    runPreflight,
    copied,
    handleCopy,
    copypastas,
    queueCount,
}: MobileReviewerDashboardProps) {
    const activeUrl = activeProject
        ? iframeMode === "demo"
            ? activeProject.playable_url
            : activeProject.github_url.replace(
                "https://github.com",
                "https://github1s.com"
            )
        : "";

    return (
        <div className="flex h-screen flex-col bg-[#ec3750] text-[#17171d] lg:hidden">
            <header className="shrink-0 px-3 pt-3">
                <div className="rounded-[28px] border-2 border-[#17171d] bg-[#f7c9d1] p-3 shadow-[0_4px_0_#17171d]">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <img
                                src="https://assets.hackclub.com/icon-rounded.svg"
                                alt="Hack Club Logo" />
                            <div>
                                <p className="text-xs font-semibold text-[#5f6c7b]">Welcome to Velocity!</p>
                                <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-[#8492a6]">
                                    Mobile Reviewer
                                </p>
                            </div>
                        </div>

                        <div className="rounded-full bg-[#338eda] px-3 py-1 text-[10px] font-black text-white shadow-sm">
                            {queueCount} in queue
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto px-3 pb-28 pt-3">
                <div className="rounded-[30px] border-[3px] border-[#338eda] bg-[#f7c9d1] p-3 shadow-[0_6px_0_#338eda]">
                    <div className="rounded-[22px] bg-[#b95de8] p-3 text-white shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-white/80">
                                    <Code className="h-3 w-3"/>
                                    Project
                                </p>
                                <p className="mt-1 truncate text-sm font-black">
                                    {activeProject?.github_url.split("/").pop() || "[Repo Name]"}
                                </p>
                                <p className="mt-1 text-[10px] text-white/85">
                                    {activeProject?.target_program || "[Target YSWS]"}
                                </p>
                            </div>

                            <div className="shrink-0 text-right">
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-white/70">
                                    Status
                                </p>
                                <StatusIndicator status={activeProject?.status} />
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-[18px] bg-[#55a8f6] p-3 text-[#17171d] shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-wider">
                                User Dossier
                            </p>
                            <div className="mt-2 space-y-1 text-[11px]">
                                <p className="truncate">
                                    {activeProject?.github_url || "[Github URL]"}
                                </p>
                                <p>{activeProject?.target_program || "[YSWS Participated]"}</p>
                                <p>
                                    Age:{" "}
                                    {activeProject?.birth_year ? 2026 - activeProject.birth_year : "Unknown"}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-[18px] bg-[#55a8f6] p-3 text-[#17171d] shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-wider">
                                Preflight Check
                            </p>

                            {preflight ? (
                                <div className="mt-2 space-y-1.5">
                                    <div className="rounded-lg bg-white/40 px-2 py-1 text-[11px] font-medium">
                                        README {preflight.readme_check.passed ? "✓" : "X"}
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-2 space-y-1.5 text-[11px]">
                                    <p>README</p>
                                    <p>Playable Link</p>
                                    <p>Age</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            onClick={() => setIframeMode("demo")}
                            className={`rounded-lg px-3 py-1.5 text-[11px] font-black shadow-sm ${
                                iframeMode === "demo"
                                    ? "bg-[#ec3750] text-white"
                                    : "bg-white/70 text-[#17171d]"
                            }`}>
                                Live
                        </button>
                        <button
                            onClick={() => setIframeMode("github")}
                            className={`rounded-lg px-3 py-1.5 text-[11px] font-black shadow-sm ${
                                iframeMode === "github"
                                    ? "bg-[#ec3750] text-white"
                                    : "bg-white17- text-[#17171d]"
                            }`}>
                                Repo
                        </button>
                        <button
                            onClick={() => {
                                setIframeMode("stats");
                                if (activeProject && !repoStats) {
                                    fetchRepoStats(activeProject.github_url);
                                }
                            }}
                            className={`rounded-lg px-3 py-1.5 text-[11px] font-black shadow-sm ${
                                iframeMode === "stats"
                                    ? "bg-[#ec3750] text-white"
                                    : "bg-white/70 text-[#17171d]"
                            }`}>
                                Stats
                        </button>

                        <button
                            onClick={runPreflight}
                            disabled={!activeProject || scanLoading}
                            className="ml-auto rounded-lg bg-[#17171d] px-3 py-1.5 text-[11px] font-black text-white shadow-sm disabled:opacity-50">
                                {scanLoading ? "Scanning..." : "Run Scan"}
                            </button>
                    </div>
                    
                    <div className="mt-3 overflow-hidden rounded-[28px] bg-[#b999a1]">
                        {!activeProject ? (
                            <div className="flex h-[320px] items-center justify-center px-4 text-center text-sm text-white/80">
                                No active project selected
                            </div>
                            ) : iframeMode !== "stats" ? (
                            <iframe
                                key={activeUrl}
                                src={activeUrl}
                                className="h-[340px] w-full border-none bg-white"
                                title="Mobile Preview"
                                sandbox="allow-scripts allow-same-origin allow-forms"
                            />
                            ) : (
                            <div className="h-[340px] overflow-y-auto bg-[#252429] p-3 text-white">
                                {statsLoading ? (
                                <div className="flex h-full items-center justify-center text-sm text-white/70">
                                    Fetching repo stats...
                                </div>
                                ) : repoStats ? (
                                <div className="space-y-3">
                                    {repoStats.aiSlopFlag && (
                                    <div className="rounded-xl border border-[#ffb703] bg-[#ffb703]/15 p-2">
                                        <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#ffb703]">
                                        <AlertTriangle className="h-3 w-3" />
                                        AI Slop Suspected
                                        </p>
                                    </div>
                                    )}

                                    <div className="rounded-xl bg-white/5 p-3">
                                    <p className="text-sm font-black">{repoStats.name}</p>
                                    {repoStats.description && (
                                        <p className="mt-1 text-[11px] leading-snug text-white/70">
                                        {repoStats.description}
                                        </p>
                                    )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-xl bg-white/5 p-2">
                                        <p className="text-[10px] text-white/60">Stars</p>
                                        <p className="text-sm font-black">{repoStats.stars}</p>
                                    </div>
                                    <div className="rounded-xl bg-white/5 p-2">
                                        <p className="text-[10px] text-white/60">Forks</p>
                                        <p className="text-sm font-black">{repoStats.forks}</p>
                                    </div>
                                    <div className="rounded-xl bg-white/5 p-2">
                                        <p className="text-[10px] text-white/60">Commits</p>
                                        <p className="text-sm font-black">{repoStats.commitCount}</p>
                                    </div>
                                    <div className="rounded-xl bg-white/5 p-2">
                                        <p className="text-[10px] text-white/60">Language</p>
                                        <p className="text-sm font-black">
                                        {repoStats.language || "Unknown"}
                                        </p>
                                    </div>
                                    </div>
                                </div>
                                ) : (
                                <div className="flex h-full items-center justify-center text-sm text-white/70">
                                    Failed to load stats
                                </div>
                                )}
                            </div>
                        )}
                        </div>
                </div>
            </main>
        </div>
    )
}