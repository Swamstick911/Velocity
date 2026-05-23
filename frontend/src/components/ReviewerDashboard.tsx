"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle, XCircle, AlertTriangle, ExternalLink, Code, Clock, LogOut, Copy, Plus, Search, Key, Server } from "lucide-react";

// Types
interface CheckResult { passed: boolean; detail: string; }
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

const COPYPASTAS = [
    { label: "Short README", text: "We loved your project, but your README was a bit too short, try to add more details about the project and then resubmit!"},
    { label: "Broken Link", text: "Hey! Your playable link seems to be returning an error. Make sure the URL is live and active, then resubmit when fixed"},
    { label: "AI Slop", text: "Our checks flagged your submission for a suspiciously high amount of AI-generated content, if you want to reappeal, DM any of us"},
    { label: "Double Dip", text: "Seems like this project is already submitted to another YSWS. Each project can only be submitted to one YSWS program"},
];

// Sub-components
const StatusDot = ({ status }: { status: Submission["status"] }) => {
    const color = status === "clean" ? "bg-[#33d6a6]" : status === "flagged" ? "bg-[#ff8c37]" : "bg-[#8492a6]";
    return <span className={`w-2 h-2 rounded-full inline-block ${color}`} />;
};

const CheckRow = ({ result, label }: { result: CheckResult, label: string }) => (
    <div className="flex items-start gap-2 py-1.5 border-b border-[#e0e6ed] last:border-0">
        {result.passed
          ? <CheckCircle className="w-4 h-4 text-[#33d6a6] mt-0.5 shrink-0" />
          : <XCircle className="w-4 h-4 text-[#ec3750] mt-0.5 shrink-0" />}
        <div>
            <p className="text-xs font-bold text-[#17171d] uppercase tracking-wide">{label}</p>
            <p className="text-xs text-[#8492a6] leading-snug">{result.detail}</p>
        </div>
    </div>
);

// Main dashboard
export default function ReviewerDashboard() {
    const [queue, setQueue] = useState<Submission[]>([]);
    const [activeProject, setActiveProject] = useState<Submission | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showStats, setShowStats] = useState(false);
    const [repoStats, setRepoStats] = useState<any>(null);

    const [iframeMode, setIframeMode] = useState<"demo" | "github" | "stats">("demo");
    const [preflight, setPreflight] = useState<PreflightResponse | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [copied, setCopied] = useState<number | null>(null);
    const [urlInput, setUrlInput] = useState("");

    const [backendUrl, setBackendUrl] = useState(
        process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
    );
    const [githubApiKey, setGithubApiKey] = useState("");
    const [configSaved, setConfigSaved] = useState(false);

    useEffect(() => {
        async function fetchQueue() {
            try {
                const res = await fetch("/api/airtable");
                if (!res.ok) throw new Error("Failed to fetch queue");

                const data = await res.json();
                setQueue(data);

                if (data.length > 0) {
                    setActiveProject(data[0]);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchQueue();
    }, []);

    if (loading) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-gray-50 text-gray-500">
                <p>Loading YSWS queue...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-gray-50 text-red-500">
                <p>Error: {error}</p>
                <p className="mt-2 text-sm text-gray-500">Check your .env.local file</p>
            </div>
        );
    }

    if (!activeProject) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-gray-50 text-gray-500">
                <p>Queue is empty! 🎉</p>
            </div>
        );
    }

    const saveConfig = () => {
        setConfigSaved(true);
        setTimeout(() => setConfigSaved(false), 1500);
    };

    const getGithubHeaders = () => {
        const headers: HeadersInit = {};
        if (githubApiKey.trim()) {
            headers["Authorization"] = `Bearer ${githubApiKey.trim()}`;
        }
        return headers;
    };

    const runPreflight = async () => {
        setLoading(true);
        setPreflight(null);
        try {
            const headers: HeadersInit = {
                "Content-Type": "application/json",
            };

            if (githubApiKey.trim()) {
                headers["Authorization"] = `Bearer ${githubApiKey.trim()}`;
            }

            const res = await fetch(`${backendUrl}/api/v1/preflight`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    github_url: activeProject.github_url,
                    playable_url: activeProject.playable_url,
                    birth_year: activeProject.birth_year,
                    target_program: activeProject.target_program,
                }),
            });

            setPreflight(await res.json());
        } catch {
            /* Server might be off */
        }
        setLoading(false);
    };

    const fetchRepoStats = async (githubUrl: string) => {
        setStatsLoading(true);
        setRepoStats(null);
        try {
            const [owner, repo] = githubUrl.replace("https://github.com/", "").split("/");

            const githubHeaders = getGithubHeaders();

            const [repoRes, commitsRes, contributorsRes] = await Promise.all([
                fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: githubHeaders }),
                fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`, { headers: githubHeaders }),
                fetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=10`, { headers: githubHeaders }),
            ]);

            const repoData = await repoRes.json();
            const commitsData = await commitsRes.json();
            const contributorsData = await contributorsRes.json();

            const commitDetails = await Promise.all(
                (Array.isArray(commitsData) ? commitsData : []).slice(0, 5).map((c: any) =>
                    fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${c.sha}`, {
                        headers: githubHeaders,
                    }).then((r) => r.json())
                )
            );

            const maxAdditions = commitDetails.length > 0
                ? Math.max(...commitDetails.map((c: any) => c.stats?.additions ?? 0))
                : 0;

            setRepoStats({
                name: repoData.name,
                description: repoData.description,
                stars: repoData.stargazers_count,
                forks: repoData.forks_count,
                language: repoData.language,
                openIssues: repoData.open_issues_count,
                pushedAt: repoData.pushed_at,
                commitCount: Array.isArray(commitsData) ? commitsData.length : 0,
                commits: Array.isArray(commitsData) ? commitsData.slice(0, 10) : [],
                contributors: Array.isArray(contributorsData) ? contributorsData : [],
                maxAdditions,
                aiSlopFlag: Array.isArray(commitsData) && commitsData.length <= 3 && maxAdditions > 500,
            });
        } catch (e) {
            console.error("Github API error", e);
        }
        setStatsLoading(false);
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (!activeProject) return;

        try {
            const res = await fetch("/api/airtable", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: activeProject.id, status: newStatus }),
            });

            if (!res.ok) throw new Error("Failed to update status");

            const updatedQueue = queue.filter(p => p.id !== activeProject.id);
            setQueue(updatedQueue);

            if (updatedQueue.length > 0) {
                handleProjectSwitch(updatedQueue[0]);
            } else {
                setActiveProject(null);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to update project status. Please try again.");
        }
    };

    const handleProjectSwitch = (p: Submission) => {
        setActiveProject(p);
        setIframeMode("demo");
        setRepoStats(null);
        setPreflight(null);
    };

    const handleCopy = (idx: number, text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(idx);
        setTimeout(() => setCopied(null), 1800);
    };

    const activeUrl = iframeMode === "demo"
        ? activeProject.playable_url
        : activeProject.github_url.replace("https://github.com/", "https://github1s.com/");

    return (
        <div
            className="h-screen w-full flex overflow-hidden"
            style={{ fontFamily: "'Phantom Sans', system-ui, sans-serif", background: "#ec3750" }}>
                {/* Left Panel */}
                <div className="w-[220px] shrink-0 flex flex-col" style={{ background: "#f9d8de", borderRight: "2px solid #ec3750" }}>
                    {/* Logo */}
                    <div className="relative p-3 pb-2 flex items-center justify-end h-20 border-b border-[#ec3750]/30">
                        <img
                            src="https://assets.hackclub.com/flag-orpheus-top.png"
                            alt="Hack Club"
                            className="absolute -top-2 -left-4 w-32 h-auto drop-shadow-md z-10"
                        />
                        <div className="text-right z-0">
                            <p className="font-black text-xl text-[#ec3750] leading-none">Velocity</p>
                            <p className="text-xs text-[#8492a6] font-bold uppercase tracking-widest leading-none mt-1">
                            by Hack Club
                            </p>
                        </div>
                    </div>

                    {/* Reviewer Name */}
                    <div className="mx-3 mt-3 mb-2 bg-[#17171d] text-white rounded-xl px-3 py-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#33d6a6] animate-pulse shrink-0" />
                        <div>
                            <p className="text-[10px] text-[#8492a6] font-bold uppercase tracking-wider leading-none">Reviewer</p>
                            <p className="text-sm font-bold text-white leading-tight">Swamstick</p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="px-3 mb-2 relative">
                        <Search className="w-3 h-3 absolute left-5 top-1/2 -translate-y-1/2 text-[#8492a6]" />
                        <input
                        type="text"
                        placeholder="Search..."
                        className="w-full text-xs pl-7 pr-2 py-1.5 rounded-lg border border-[#ec3750]/30 bg-white focus:outline-none focus:border-[#ec3750] transition-colors" />
                    </div>

                    {/* Queue Label */}
                    <p className="px-4 text-[10px] font-black text-[#8492a6] uppercase tracking-widest mb-1">Queue ({queue.length})</p>

                    {/* Project List */}
                    <div className="flex-1 overflow-y-auto px-3 space-y-1.5 pb-3">
                        {queue.map((p) => {
                            const repoName = p.github_url.split("/").pop() || "Unknown";
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => handleProjectSwitch(p)}
                                    className={`w-full text-left px-3 py-2 rounded-xl border transition-all ${
                                        activeProject?.id === p.id
                                        ? "bg-white border-[#17171d] shadow-sm"
                                        : "bg-transparent border-transparent hover:bg-white/60"
                                    }`}>
                                        <div className="flex items-center justify-between mb-0.5">
                                            <p className="font-mono text-xs font-bold text-[#17171d] truncate max-w-[120px]">{repoName}</p>
                                            <StatusDot status={p.status} />
                                        </div>
                                        <span className="text-[9px] bg-[#e0e6ed] text-[#17171d] px-1.5 py-0.5 rounded font-black uppercase tracking-wide">
                                            {p.target_program}
                                        </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Touch Grass */}
                    <div className="p-3 border-t border-[#ec3750]/30">
                        <Link href="/" className="w-full bg-[#33d6a6] hover:bg-[#2bb88e] text-[#17171d] font-black text-xs py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5">
                            <LogOut className="w-3.5 h-3.5" />
                            Touch Grass
                        </Link>
                    </div>
                </div>

                {/* Center Panel */}
                <div className="flex-1 flex flex-col p-3 gap-3 min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="flex bg-[#17171d] rounded-xl p-1 gap-1 shrink-0 border-2 border-[#17171d]">
                            {[
                                { mode: "demo", label: "Live", icon: <ExternalLink className="w-3 h-3" />},
                                { mode: "github", label: "Code", icon: <Code className="w-3 h-3" />},
                                { mode: "stats", label: "Stats", icon: <Search className="w-3 h-3" />},
                            ].map(({ mode, label, icon }) => (
                                <button
                                    key={mode}
                                    onClick={() => {
                                        setIframeMode(mode as any);
                                        if (mode === "stats" && !repoStats) fetchRepoStats(activeProject.github_url);
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                                        iframeMode === mode
                                            ? "bg-[#ec3750] text-white shadow-[0_2px_0_#000]"
                                            : "text-[#8492a6] hover:text-white"
                                    }`}>
                                        {icon}{label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* URL Bar */}
                    <div className="flex items-center gap-2 bg-[#f9d8de] rounded-xl px-4 py-2 border-2 border-[#17171d]/10">
                        <ExternalLink className="w-4 h-4 text-[#8492a6] shrink-0" />
                        <input
                            className="flex-1 text-sm font-mono text-[#17171d] bg-transparent outline-none truncate"
                            value={activeUrl}
                            onChange={(e) => setUrlInput(e.target.value)}
                        />
                        <a href={activeUrl} target="_blank" rel="noreferrer"
                            className="text-xs text-[#ec3750] font-bold hover:underline shrink-0">
                            Open
                        </a>
                    </div>

                    {/* Iframe */}
                    <div className="flex-1 bg-[#252429] rounded-2xl overflow-hidden border-2 border-[#17171d]/30 relative">
                        {iframeMode !== "stats" ? (
                            <iframe
                                key={activeUrl}
                                src={activeUrl}
                                className="w-full h-full border-none"
                                title="Preview"
                                sandbox="allow-scripts allow-same-origin allow-forms"/>
                        ) : (
                            <div className="w-full h-full overflow-y-auto p-5 text-white">
                                {statsLoading ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-3">
                                        <div className="w-8 h-8 border-4 border-[#ec3750] border-t-transparent rounded-full animate-spin" />
                                        <p className="text-[#8492a6] text-sm font-bold">Fetching repo stats...</p>
                                    </div>
                                ) : repoStats ? (
                                    <div className="space-y-5">
                                        {repoStats.aiSlopFlag && (
                                            <div className="bg-[#ff8c37]/20 border-2 border-[#ff8c37] rounded-xl p-3 flex items-start gap-2">
                                                <AlertTriangle className="w-4 h-4 text-[#ff8c37] mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-xs font-black text-[#ff8c37] uppercase tracking-wide">AI Slop Detected</p>
                                                    <p className="text-xs text-[#8492a6] mt-0.5">
                                                        Only {repoStats.commitCount} commit{repoStats.commitCount !== 1 ? "s" : ""} with {repoStats.maxAdditions.toLocaleString()} lines added in one push.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-[#17171d] rounded-xl p-4 space-y-2 border border-white/5">
                                            <p className="font-black text-white text-base">{repoStats.name}</p>
                                            {repoStats.description && (
                                                <p className="text-xs text-[#8492a6] leading-relaxed">{repoStats.description}</p>
                                            )}
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {[
                                                    { label: "Stars", value: repoStats.stars },
                                                    { label: "Forks", value: repoStats.forks},
                                                    { label: "Issues", value: repoStats.openIssues },
                                                    { label: "Commits", value: repoStats.commitCount },
                                                ].map(({ label, value }) => (
                                                    <div key={label} className="bg-[#252429] rounded-lg px-3 py-1.5 text-center">
                                                        <p className="text-[10px] text-[#8492a6] font-bold">{label}</p>
                                                        <p className="text-sm font-black text-white">{value}</p>
                                                    </div>
                                                ))}
                                                {repoStats.language && (
                                                    <div className="bg-[#252429] rounded-lg px-3 py-1.5 text-center">
                                                        <p className="text-[10px] text-[#8492a6] font-bold">Language</p>
                                                        <p className="text-sm font-black text-white">{repoStats.language}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-[#17171d] rounded-xl p-4 border border-white/5">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[#8492a6] mb-3">Recent Commits</p>
                                            <div className="space-y-2">
                                                {repoStats.commits.map((c: any, i: number) => (
                                                    <div key={i} className="flex items-start gap-2 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                                        <img
                                                            src={c.author?.avatar_url ?? "https://github.com/ghost.png"}
                                                            alt=""
                                                            className="w-5 h-5 rounded-full shrink-0 mt-0.5" />
                                                        <div className="min-w-0">
                                                            <p className="text-xs text-white font-medium truncate leading-snug">{c.commit.message.split("\n")[0]}</p>
                                                            <p className="text-[10px] text-[#8492a6]">
                                                                {c.commit.author.name} - {new Date(c.commit.author.date).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {repoStats.contributors.length > 0 && (
                                            <div className="bg-[#17171d] rounded-xl p-4 border border-white/5">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[#8492a6] mb-3">Contributors</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {repoStats.contributors.map((c: any) => (
                                                        <div key={c.login} className="flex items-center gap-1.5 bg-[#252429] rounded-full px-2 py-1">
                                                            <img src={c.avatar_url} alt={c.login} className="w-4 h-4 rounded-full" />
                                                            <span className="text-[10px] font-bold text-white">{c.login}</span>
                                                            <span className="text-[10px] text-[#8492a6]">{c.contributions}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-[#8492a6] text-sm">
                                        Failed to load stats
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel */}
                <div className="w-[260px] shrink-0 flex flex-col bg-[#f9d8de] border-l-2 border-[#ec3750]">
                    {/* User Dossier */}
                    <div className="m-3 mb-2 bg-[#17171d] text-white rounded-2xl p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#8492a6] mb-2">User Dossier</p>
                        <div className="flex items-center gap-2 mb-1">
                            <Code className="w-4 h-4 text-[#333eda]" />
                            <p className="text-sm font-bold truncate">{activeProject.github_url.split("/").pop()}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] bg-[#252429] text-[#33d6a6] px-2 py-0.5 rounded-full font-bold uppercase">
                                {activeProject.target_program}
                            </span>
                            <span className="text-[9px] bg-[#252429] text-[#8492a6] px-2 py-0.5 rounded-full font-bold uppercase">
                                Age: {activeProject.birth_year ? 2026 - activeProject.birth_year : "Unknown"}
                            </span>
                        </div>
                    </div>

                    {/* API Config */}
                    <div className="mx-3 mb-2 bg-[#17171d] text-white rounded-2xl p-3 flex-none">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#8492a6] mb-2">API Config</p>

                        <label className="block mb-2">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Server className="w-3 h-3 text-[#8492a6]" />
                                <span className="text-[10px] font-bold uppercase tracking-wide text-[#8492a6]">Backend URL</span>
                            </div>
                            <input
                                type="text"
                                value={backendUrl}
                                onChange={(e) => setBackendUrl(e.target.value)}
                                placeholder="https://your-backend.onrender.com"
                                className="w-full rounded-lg bg-[#252429] border border-white/10 px-3 py-2 text-xs text-white outline-none focus:border-[#ec3750]"
                            />
                        </label>

                        <label className="block">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Key className="w-3 h-3 text-[#8492a6]" />
                                <span className="text-[10px] font-bold uppercase tracking-wide text-[#8492a6]">GitHub API Key</span>
                            </div>
                            <input
                                type="password"
                                value={githubApiKey}
                                onChange={(e) => setGithubApiKey(e.target.value)}
                                placeholder="Paste token here"
                                className="w-full rounded-lg bg-[#252429] border border-white/10 px-3 py-2 text-xs text-white outline-none focus:border-[#ec3750]"
                            />
                        </label>

                        <button
                            onClick={saveConfig}
                            className="mt-2 w-full bg-[#338eda] text-white font-black text-xs py-2.5 rounded-xl border-2 border-[#080861] shadow-[0_4px_0_#080861] active:shadow-[0_0px_0_#17171d] active:translate-y-1 transition-all"
                        >
                            {configSaved ? "Saved!" : "Save Config"}
                        </button>
                    </div>

                    {/* Preflight Checks */}
                    <div className="mx-3 mb-2 bg-[#17171d] text-white rounded-2xl p-3 flex-none">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#8492a6]">Preflight Checks</p>
                            {loading && <span className="text-[9px] text-[#ff8c37] font-bold animate-pulse">Scanning...</span>}
                        </div>

                        {preflight ? (
                            <div className="space-y-0">
                                <CheckRow result={preflight.readme_check} label="README" />
                                <CheckRow result={preflight.playable_url_check} label="Playable URL" />
                                <CheckRow result={preflight.birth_year_check} label="Age" />
                                <CheckRow result={preflight.anti_fraud_check} label="Anti Fraud" />
                            </div>
                        ) : (
                            <div className="space-y-2 py-1">
                                {["README Check", "Playable Link", "Age"].map((l) => (
                                    <div key={l} className="flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5 text-[#8492a6]" />
                                        <p className="text-xs text-[#8492a6]">{l}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Fraud Warnings */}
                    {preflight && preflight.flags.length > 0 && (
                        <div className="mx-3 mb-2 bg-[#fff3cd] border-2 border-[#ff8c37] rounded-2xl p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#ff8c37] flex items-center gap-1 mb-1.5">
                                <AlertTriangle className="w-3 h-3" /> Fraud Warning
                            </p>
                            {preflight.flags.map((f, i) => (
                                <p key={i} className="text-xs text-[#17171d] font-medium leading-snug">{f}</p>
                            ))}
                        </div>
                    )}

                    {/* Copypasta palette */}
                    <div className="mx-3 mb-2 bg-[#17171d] text-white rounded-2xl p-3 flex-none">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#8492a6] mb-2">Copypasta Palette</p>
                        <div className="space-y-1.5">
                            {COPYPASTAS.map((c, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleCopy(i, c.text)}
                                    className="w-full flex items-center justify-between bg-[#252429] hover:bg-[#333] text-white rounded-lg px-3 py-1.5 text-xs font-bold transition-all active:scale-95">
                                        <span>{c.label}</span>
                                        {copied === i
                                            ? <span className="text-[#33d6a6] text-[10px]">Copied!</span>
                                            : <Copy className="w-3 h-3 text-[#8492a6]" />}
                                </button>
                            ))}
                        </div>
                        <button className="mt-2 w-full flex items-center justify-center gap-1 text-[#8492a6] hover:text-white text-xs py-1 transition-colors">
                            <Plus className="w-3 h-3" />
                            <span>Create a copypasta</span>
                        </button>
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Accept/Reject */}
                    <div className="p-3 space-y-3 border-t border-[#ec3750]/30">
                            {!preflight && (
                                <button
                                    onClick={runPreflight}
                                    disabled={loading}
                                    className="w-full bg-[#338eda] text-white font-black text-xs py-3 rounded-xl border-2 border-[#080861] shadow-[0_4px_0_#080861] active:shadow-[0_0px_0_#17171d] active:translate-y-1 transition:all disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[0_4px_0_#17171d]">
                                        {loading ? "Scanning..." : "Run Preflight Scan"}
                                </button>
                            )}

                            <button
                                onClick={() => handleStatusUpdate("Approved")}
                                className="w-full bg-[#33d6a6] text-[#17171d] font-black text-sm py-3.5 rounded-xl border-2 border-[#1b7b5d] shadow-[0_4px_0_#1b7b5d] hover:bg-[#2bb88e] active:shadow-[0_0px_0_#17171d] active:translate-y-1 transition-all flex justify-center items-center">
                                Approve
                            </button>

                            <button
                                onClick={() => handleStatusUpdate("Rejected")}
                                className="w-full bg-[#ec3750] text-white font-black text-sm py-3.5 rounded-xl border-2 border-[#7e0630] shadow-[0_4px_0_#7e0630] hover:bg-[#d02b42] active:shadow-[0_0px_0_#17171d] active:translate-y-1 transition-all flex justify-center items-center">
                                Reject
                            </button>
                    </div>
                </div>
            </div>
    );
}