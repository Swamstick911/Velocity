"use client";

import MobileReviewerDashboard from "./MobileReviewerDashboard";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Code,
  Clock,
  LogOut,
  Copy,
  Plus,
  Search,
  Key,
  Database,
  Shield,
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

const COPYPASTAS = [
  {
    label: "Short README",
    text: "We loved your project, but your README was a bit too short, try to add more details about the project and then resubmit!",
  },
  {
    label: "Broken Link",
    text: "Hey! Your playable link seems to be returning an error. Make sure the URL is live and active, then resubmit when fixed",
  },
  {
    label: "AI Slop",
    text: "Our checks flagged your submission for a suspiciously high amount of AI-generated content, if you want to reappeal, DM any of us",
  },
  {
    label: "Double Dip",
    text: "Seems like this project is already submitted to another YSWS. Each project can only be submitted to one YSWS program",
  },
];

const StatusDot = ({ status }: { status: Submission["status"] }) => {
  const color =
    status === "clean"
      ? "bg-[#33d6a6]"
      : status === "flagged"
      ? "bg-[#ff8c37]"
      : "bg-[#8492a6]";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
};

const CheckRow = ({
  result,
  label,
}: {
  result: CheckResult;
  label: string;
}) => (
  <div className="flex items-start gap-2 border-b border-[#e0e6ed] py-1.5 last:border-0">
    {result.passed ? (
      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#33d6a6]" />
    ) : (
      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#ec3750]" />
    )}
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-[#17171d]">
        {label}
      </p>
      <p className="text-xs leading-snug text-[#8492a6]">{result.detail}</p>
    </div>
  </div>
);

export default function ReviewerDashboard() {
  const defaultBackendUrl = process.env.NEXT_PUBLIC_API_URL || "";

  const [queue, setQueue] = useState<Submission[]>([]);
  const [activeProject, setActiveProject] = useState<Submission | null>(null);

  const [pageLoading, setPageLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  const [repoStats, setRepoStats] = useState<RepoStats | null>(null);
  const [preflight, setPreflight] = useState<PreflightResponse | null>(null);

  const [iframeMode, setIframeMode] = useState<"demo" | "github" | "stats">(
    "demo"
  );
  const [copied, setCopied] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [backendUrl] = useState(defaultBackendUrl);

  const [showAirtableGate, setShowAirtableGate] = useState(true);
  const [airtableTokenInput, setAirtableTokenInput] = useState("");
  const [airtableBaseIdInput, setAirtableBaseIdInput] = useState("");
  const [airtableTableNameInput, setAirtableTableNameInput] = useState("Submissions");
  const [githubApiKeyInput, setGithubApiKeyInput] = useState("");

  const [airtableToken, setAirtableToken] = useState("");
  const [airtableBaseId, setAirtableBaseId] = useState("");
  const [airtableTableName, setAirtableTableName] = useState("Submissions");
  const [githubApiKey, setGithubApiKey] = useState("");

  const [configError, setConfigError] = useState<string | null>(null);

  const fetchQueue = async (
    tokenOverride?: string,
    baseIdOverride?: string,
    tableNameOverride?: string
  ) => {
    try {
      setPageLoading(true);
      setQueueError(null);

      const token = tokenOverride ?? airtableToken;
      const baseId = baseIdOverride ?? airtableBaseId;
      const tableName = tableNameOverride ?? airtableTableName;

      const params = new URLSearchParams({
        airtableToken: token,
        airtableBaseId: baseId,
        airtableTableName: tableName,
      });

      const res = await fetch(`/api/airtable?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch queue");

      const data = await res.json();
      setQueue(Array.isArray(data) ? data : []);

      if (Array.isArray(data) && data.length > 0) {
        setActiveProject(data[0]);
      } else {
        setActiveProject(null);
      }
    } catch (err: any) {
      setQueueError(err?.message || "Failed to fetch queue");
      setQueue([]);
      setActiveProject(null);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    setPageLoading(false);
  }, []);

  const filteredQueue = useMemo(() => {
    if (!searchQuery.trim()) return queue;
    const q = searchQuery.toLowerCase();
    return queue.filter((p) => {
      const repoName = p.github_url.split("/").pop() || "";
      return (
        repoName.toLowerCase().includes(q) ||
        p.target_program.toLowerCase().includes(q) ||
        p.github_url.toLowerCase().includes(q)
      );
    });
  }, [queue, searchQuery]);

  const getGithubHeaders = (): HeadersInit => {
    const headers: HeadersInit = {
      Accept: "application/vnd.github+json",
    };

    if (githubApiKey.trim()) {
      headers["Authorization"] = `Bearer ${githubApiKey.trim()}`;
    }

    return headers;
  };

  const handleEnterDashboard = async () => {
    setConfigError(null);

    if (!airtableTokenInput.trim()) {
      setConfigError("Airtable API token is required.");
      return;
    }

    if (!airtableBaseIdInput.trim()) {
      setConfigError("Airtable Base ID is required.");
      return;
    }

    if (!airtableTableNameInput.trim()) {
      setConfigError("Airtable Table Name is required.");
      return;
    }

    const nextToken = airtableTokenInput.trim();
    const nextBaseId = airtableBaseIdInput.trim();
    const nextTable = airtableTableNameInput.trim();
    const nextGithubKey = githubApiKeyInput.trim();

    setAirtableToken(nextToken);
    setAirtableBaseId(nextBaseId);
    setAirtableTableName(nextTable);
    setGithubApiKey(nextGithubKey);
    setShowAirtableGate(false);

    await fetchQueue(nextToken, nextBaseId, nextTable);
  };

  const handleEditConfig = () => {
    setAirtableTokenInput(airtableToken);
    setAirtableBaseIdInput(airtableBaseId);
    setAirtableTableNameInput(airtableTableName);
    setGithubApiKeyInput(githubApiKey);
    setShowAirtableGate(true);
  };

  const runPreflight = async () => {
    if (!activeProject || !backendUrl) return;

    setScanLoading(true);
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

      if (!res.ok) {
        throw new Error(`Preflight failed with status ${res.status}`);
      }

      const data = await res.json();
      setPreflight(data);
    } catch (err) {
      console.error(err);
      alert("Preflight failed. Check backend env or backend status.");
    } finally {
      setScanLoading(false);
    }
  };

  const fetchRepoStats = async (githubUrl: string) => {
    setStatsLoading(true);
    setRepoStats(null);

    try {
      const cleaned = githubUrl.replace("https://github.com/", "");
      const [owner, repo] = cleaned.split("/");

      if (!owner || !repo) {
        throw new Error("Invalid GitHub URL");
      }

      const headers = getGithubHeaders();

      const [repoRes, commitsRes, contributorsRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
        fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`, {
          headers,
        }),
        fetch(
          `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=10`,
          { headers }
        ),
      ]);

      const repoData = await repoRes.json();
      const commitsData = await commitsRes.json();
      const contributorsData = await contributorsRes.json();

      const safeCommits = Array.isArray(commitsData) ? commitsData : [];
      const safeContributors = Array.isArray(contributorsData)
        ? contributorsData
        : [];

      const commitDetails = await Promise.all(
        safeCommits.slice(0, 5).map((c: any) =>
          fetch(
            `https://api.github.com/repos/${owner}/${repo}/commits/${c.sha}`,
            { headers }
          ).then((r) => r.json())
        )
      );

      const maxAdditions =
        commitDetails.length > 0
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
        commitCount: safeCommits.length,
        commits: safeCommits.slice(0, 10),
        contributors: safeContributors,
        maxAdditions,
        aiSlopFlag: safeCommits.length <= 3 && maxAdditions > 500,
      });
    } catch (e) {
      console.error("GitHub API error", e);
      setRepoStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!activeProject) return;

    try {
      const res = await fetch("/api/airtable", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeProject.id,
          status: newStatus,
          airtableToken,
          airtableBaseId,
          airtableTableName,
        }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      const updatedQueue = queue.filter((p) => p.id !== activeProject.id);
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

  const handleCopy = async (idx: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(idx);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      alert("Could not copy text.");
    }
  };

  const activeUrl = activeProject
    ? iframeMode === "demo"
      ? activeProject.playable_url
      : activeProject.github_url.replace(
          "https://github.com/",
          "https://github1s.com/"
        )
    : "";

  return (
    <>
      <div className="block lg:hidden">
        <MobileReviewerDashboard
          activeProject={activeProject}
          preflight={preflight}
          repoStats={repoStats}
          statsLoading={statsLoading}
          iframeMode={iframeMode}
          setIframeMode={setIframeMode}
          fetchRepoStats={fetchRepoStats}
          handleStatusUpdate={handleStatusUpdate}
          scanLoading={scanLoading}
          runPreflight={runPreflight}
          copied={copied}
          handleCopy={handleCopy}
          copypastas={COPYPASTAS}
          queueCount={queue.length}
        />
      </div>
    <div 
      className="hidden lg:flex relative h-screen w-full overflow-hidden"
      style={{
        fontFamily: "'Phantom Sans', system-ui, sans-serif",
        background: "#ec3750",
      }}>
        {showAirtableGate && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border-2 border-[#17171d] bg-[#f9d8de] p-5 shadow-[0_10px_0_#17171d]">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-[#17171d] p-3 text-white">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8492a6]">
                    Dashboard Access
                  </p>
                  <h1 className="text-2xl font-black text-[#17171d]">
                    Enter Airtable Config
                  </h1>
                </div>
              </div>

              <p className="mb-4 text-sm leading-relaxed text-[#17171d]/80">
                Enter your Airtable credentials to load the review queue.
              </p>

              <div className="space-y-3">
                <label className="block">
                  <div className="mb-1 flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-[#8492a6]" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#8492a6]">
                      Airtable API Token
                    </span>
                  </div>
                  <input
                    type="password"
                    value={airtableTokenInput}
                    onChange={(e) => setAirtableTokenInput(e.target.value)}
                    placeholder="pat_xxxxxxxxx"
                    className="w-full rounded-xl border border-[#17171d]/15 bg-white px-3 py-3 text-sm text-[#17171d] outline-none focus:border-[#ec3750]"
                  />
                </label>

                <label className="block">
                  <div className="mb-1 flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-[#8492a6]" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#8492a6]">
                      Airtable Base ID
                    </span>
                  </div>
                  <input
                    type="text"
                    value={airtableBaseIdInput}
                    onChange={(e) => setAirtableBaseIdInput(e.target.value)}
                    placeholder="appXXXXXXXXXXXXXX"
                    className="w-full rounded-xl border border-[#17171d]/15 bg-white px-3 py-3 text-sm text-[#17171d] outline-none focus:border-[#ec3750]"
                  />
                </label>

                <label className="block">
                  <div className="mb-1 flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-[#8492a6]" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#8492a6]">
                      Airtable Table Name
                    </span>
                  </div>
                  <input
                    type="text"
                    value={airtableTableNameInput}
                    onChange={(e) => setAirtableTableNameInput(e.target.value)}
                    placeholder="Submissions"
                    className="w-full rounded-xl border border-[#17171d]/15 bg-white px-3 py-3 text-sm text-[#17171d] outline-none focus:border-[#ec3750]"
                  />
                </label>

                <label className="block">
                  <div className="mb-1 flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-[#8492a6]" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#8492a6]">
                      GitHub API Key
                    </span>
                  </div>
                  <input
                    type="password"
                    value={githubApiKeyInput}
                    onChange={(e) => setGithubApiKeyInput(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-[#17171d]/15 bg-white px-3 py-3 text-sm text-[#17171d] outline-none focus:border-[#ec3750]"
                  />
                </label>
              </div>

              {configError && (
                <div className="mt-3 rounded-xl border border-[#7e0630] bg-[#ec3750]/10 px-3 py-2 text-sm font-medium text-[#7e0630]">
                  {configError}
                </div>
              )}

              <button
                onClick={handleEnterDashboard}
                className="mt-4 flex w-full items-center justify-center rounded-xl border-2 border-[#080861] bg-[#338eda] py-3 text-sm font-black text-white shadow-[0_4px_0_#080861] transition-all active:translate-y-1 active:shadow-none"
              >
                Continue to Dashboard
              </button>
            </div>
          </div>
        )}

        <div
          className="flex w-[220px] shrink-0 flex-col"
          style={{ background: "#f9d8de", borderRight: "2px solid #ec3750" }}
        >
          <div className="relative flex h-20 items-center justify-end border-b border-[#ec3750]/30 p-3 pb-2">
            <img
              src="https://assets.hackclub.com/banners/2026.svg"
              alt="Hack Club"
              className="absolute -left-4 -top-2 h-auto w-32 drop-shadow-md"
            />
            <div className="z-0 text-right">
              <p className="text-xl font-black leading-none text-[#ec3750]">
                Velocity
              </p>
              <p className="mt-1 text-xs font-bold uppercase leading-none tracking-widest text-[#8492a6]">
                by Hack Club
              </p>
            </div>
          </div>

          <div className="mx-3 mb-2 mt-3 flex items-center gap-2 rounded-xl bg-[#17171d] px-3 py-2 text-white">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#33d6a6]" />
            <div>
              <p className="text-[10px] font-bold uppercase leading-none tracking-wider text-[#8492a6]">
                Reviewer
              </p>
              <p className="text-sm font-bold leading-tight text-white">
                Swamstick
              </p>
            </div>
          </div>

          <div className="relative mb-2 px-3">
            <Search className="absolute left-5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#8492a6]" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[#ec3750]/30 bg-white py-1.5 pl-7 pr-2 text-xs transition-colors focus:outline-none focus:border-[#ec3750]"
            />
          </div>

          <p className="mb-1 px-4 text-[10px] font-black uppercase tracking-widest text-[#8492a6]">
            Queue ({filteredQueue.length})
          </p>

          {queueError && (
            <div className="mx-3 mb-2 rounded-xl border border-[#ff8c37] bg-[#fff3cd] px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-[#ff8c37]">
                Queue Error
              </p>
              <p className="mt-1 text-xs font-medium text-[#17171d]">
                {queueError}
              </p>
            </div>
          )}

          <div className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
            {pageLoading ? (
              <div className="rounded-xl bg-white/70 px-3 py-3 text-xs font-bold text-[#8492a6]">
                Loading queue...
              </div>
            ) : filteredQueue.length > 0 ? (
              filteredQueue.map((p) => {
                const repoName = p.github_url.split("/").pop() || "Unknown";
                return (
                  <button
                    key={p.id}
                    onClick={() => handleProjectSwitch(p)}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition-all ${
                      activeProject?.id === p.id
                        ? "border-[#17171d] bg-white shadow-sm"
                        : "border-transparent bg-transparent hover:bg-white/60"
                    }`}
                  >
                    <div className="mb-0.5 flex items-center justify-between">
                      <p className="max-w-[120px] truncate font-mono text-xs font-bold text-[#17171d]">
                        {repoName}
                      </p>
                      <StatusDot status={p.status} />
                    </div>
                    <span className="rounded bg-[#e0e6ed] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#17171d]">
                      {p.target_program}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="rounded-xl bg-white/70 px-3 py-3 text-xs font-bold text-[#8492a6]">
                No submissions loaded yet.
              </div>
            )}
          </div>

          <div className="border-t border-[#ec3750]/30 p-3">
            <Link
              href="/"
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#33d6a6] py-2.5 text-xs font-black text-[#17171d] transition-all active:scale-95 hover:bg-[#2bb88e]"
            >
              <LogOut className="h-3.5 w-3.5" />
              Touch Grass
            </Link>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 p-3">
          <div className="flex items-center gap-2">
            <div className="flex shrink-0 gap-1 rounded-xl border-2 border-[#17171d] bg-[#17171d] p-1">
              {[
                { mode: "demo", label: "Live", icon: <ExternalLink className="h-3 w-3" /> },
                { mode: "github", label: "Code", icon: <Code className="h-3 w-3" /> },
                { mode: "stats", label: "Stats", icon: <Search className="h-3 w-3" /> },
              ].map(({ mode, label, icon }) => (
                <button
                  key={mode}
                  onClick={() => {
                    setIframeMode(mode as "demo" | "github" | "stats");
                    if (mode === "stats" && activeProject && !repoStats) {
                      fetchRepoStats(activeProject.github_url);
                    }
                  }}
                  disabled={!activeProject}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition-all ${
                    iframeMode === mode
                      ? "bg-[#ec3750] text-white shadow-[0_2px_0_#000]"
                      : "text-[#8492a6] hover:text-white"
                  } disabled:opacity-50`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={handleEditConfig}
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:bg-white/15"
            >
              Edit Airtable Config
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-xl border-2 border-[#17171d]/10 bg-[#f9d8de] px-4 py-2">
            <ExternalLink className="h-4 w-4 shrink-0 text-[#8492a6]" />
            <input
              className="flex-1 truncate bg-transparent font-mono text-sm text-[#17171d] outline-none"
              value={activeUrl || "No active project selected"}
              readOnly
            />
            {activeUrl ? (
              <a
                href={activeUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-xs font-bold text-[#ec3750] hover:underline"
              >
                Open
              </a>
            ) : (
              <span className="shrink-0 text-xs font-bold text-[#8492a6]">
                —
              </span>
            )}
          </div>

          <div className="relative flex-1 overflow-hidden rounded-2xl border-2 border-[#17171d]/30 bg-[#252429]">
            {!activeProject ? (
              <div className="flex h-full items-center justify-center p-6 text-center">
                <div>
                  <p className="text-lg font-black text-white">Dashboard ready</p>
                  <p className="mt-2 text-sm text-[#8492a6]">
                    Enter Airtable config to load the queue.
                  </p>
                </div>
              </div>
            ) : iframeMode !== "stats" ? (
              <iframe
                key={activeUrl}
                src={activeUrl}
                className="h-full w-full border-none"
                title="Preview"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            ) : (
              <div className="h-full w-full overflow-y-auto p-5 text-white">
                {statsLoading ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#ec3750] border-t-transparent" />
                    <p className="text-sm font-bold text-[#8492a6]">
                      Fetching repo stats...
                    </p>
                  </div>
                ) : repoStats ? (
                  <div className="space-y-5">
                    {repoStats.aiSlopFlag && (
                      <div className="flex items-start gap-2 rounded-xl border-2 border-[#ff8c37] bg-[#ff8c37]/20 p-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#ff8c37]" />
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-[#ff8c37]">
                            AI Slop Detected
                          </p>
                          <p className="mt-0.5 text-xs text-[#8492a6]">
                            Only {repoStats.commitCount} commit
                            {repoStats.commitCount !== 1 ? "s" : ""} with{" "}
                            {repoStats.maxAdditions.toLocaleString()} lines added
                            in one push.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 rounded-xl border border-white/5 bg-[#17171d] p-4">
                      <p className="text-base font-black text-white">
                        {repoStats.name}
                      </p>
                      {repoStats.description && (
                        <p className="text-xs leading-relaxed text-[#8492a6]">
                          {repoStats.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {[
                          { label: "Stars", value: repoStats.stars },
                          { label: "Forks", value: repoStats.forks },
                          { label: "Issues", value: repoStats.openIssues },
                          { label: "Commits", value: repoStats.commitCount },
                        ].map(({ label, value }) => (
                          <div
                            key={label}
                            className="rounded-lg bg-[#252429] px-3 py-1.5 text-center"
                          >
                            <p className="text-[10px] font-bold text-[#8492a6]">
                              {label}
                            </p>
                            <p className="text-sm font-black text-white">
                              {value}
                            </p>
                          </div>
                        ))}
                        {repoStats.language && (
                          <div className="rounded-lg bg-[#252429] px-3 py-1.5 text-center">
                            <p className="text-[10px] font-bold text-[#8492a6]">
                              Language
                            </p>
                            <p className="text-sm font-black text-white">
                              {repoStats.language}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-[#17171d] p-4">
                      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#8492a6]">
                        Recent Commits
                      </p>
                      <div className="space-y-2">
                        {repoStats.commits.map((c: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 border-b border-white/5 pb-2 last:border-0 last:pb-0"
                          >
                            <img
                              src={c.author?.avatar_url ?? "https://github.com/ghost.png"}
                              alt=""
                              className="mt-0.5 h-5 w-5 shrink-0 rounded-full"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium leading-snug text-white">
                                {c.commit.message.split("\n")[0]}
                              </p>
                              <p className="text-[10px] text-[#8492a6]">
                                {c.commit.author.name} -{" "}
                                {new Date(c.commit.author.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {repoStats.contributors.length > 0 && (
                      <div className="rounded-xl border border-white/5 bg-[#17171d] p-4">
                        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#8492a6]">
                          Contributors
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {repoStats.contributors.map((c: any) => (
                            <div
                              key={c.login}
                              className="flex items-center gap-1.5 rounded-full bg-[#252429] px-2 py-1"
                            >
                              <img
                                src={c.avatar_url}
                                alt={c.login}
                                className="h-4 w-4 rounded-full"
                              />
                              <span className="text-[10px] font-bold text-white">
                                {c.login}
                              </span>
                              <span className="text-[10px] text-[#8492a6]">
                                {c.contributions}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#8492a6]">
                    Failed to load stats
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex w-[260px] shrink-0 flex-col border-l-2 border-[#ec3750] bg-[#f9d8de]">
          <div className="m-3 mb-2 rounded-2xl bg-[#17171d] p-3 text-white">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#8492a6]">
              User Dossier
            </p>
            <div className="mb-1 flex items-center gap-2">
              <Code className="h-4 w-4 text-[#333eda]" />
              <p className="truncate text-sm font-bold">
                {activeProject?.github_url.split("/").pop() || "No active project"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-[#252429] px-2 py-0.5 text-[9px] font-bold uppercase text-[#33d6a6]">
                {activeProject?.target_program || "No program"}
              </span>
              <span className="rounded-full bg-[#252429] px-2 py-0.5 text-[9px] font-bold uppercase text-[#8492a6]">
                Age:{" "}
                {activeProject?.birth_year ? 2026 - activeProject.birth_year : "Unknown"}
              </span>
            </div>
          </div>

          <div className="mx-3 mb-2 rounded-2xl bg-[#17171d] p-3 text-white">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#8492a6]">
                Active Config
              </p>
              <button
                onClick={handleEditConfig}
                className="text-[10px] font-black uppercase tracking-wide text-[#33d6a6]"
              >
                Edit
              </button>
            </div>
            <div className="space-y-2">
              <div className="rounded-xl bg-[#252429] px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#8492a6]">
                  Airtable Base
                </p>
                <p className="truncate text-xs text-white">
                  {airtableBaseId || "Not set"}
                </p>
              </div>
              <div className="rounded-xl bg-[#252429] px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#8492a6]">
                  Airtable Table
                </p>
                <p className="truncate text-xs text-white">
                  {airtableTableName || "Not set"}
                </p>
              </div>
              <div className="rounded-xl bg-[#252429] px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#8492a6]">
                  Backend URL
                </p>
                <p className="truncate text-xs text-white">
                  {backendUrl || "Missing NEXT_PUBLIC_API_URL"}
                </p>
              </div>
            </div>
          </div>

          <div className="mx-3 mb-2 flex-none rounded-2xl bg-[#17171d] p-3 text-white">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#8492a6]">
                Preflight Checks
              </p>
              {scanLoading && (
                <span className="animate-pulse text-[9px] font-bold text-[#ff8c37]">
                  Scanning...
                </span>
              )}
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
                {["README Check", "Playable Link", "Age", "Anti Fraud"].map((l) => (
                  <div key={l} className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-[#8492a6]" />
                    <p className="text-xs text-[#8492a6]">{l}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {preflight && preflight.flags.length > 0 && (
            <div className="mx-3 mb-2 rounded-2xl border-2 border-[#ff8c37] bg-[#fff3cd] p-3">
              <p className="mb-1.5 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#ff8c37]">
                <AlertTriangle className="h-3 w-3" /> Fraud Warning
              </p>
              {preflight.flags.map((f, i) => (
                <p key={i} className="text-xs font-medium leading-snug text-[#17171d]">
                  {f}
                </p>
              ))}
            </div>
          )}

          <div className="mx-3 mb-2 flex-none rounded-2xl bg-[#17171d] p-3 text-white">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#8492a6]">
              Copypasta Palette
            </p>
            <div className="space-y-1.5">
              {COPYPASTAS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => handleCopy(i, c.text)}
                  className="flex w-full items-center justify-between rounded-lg bg-[#252429] px-3 py-1.5 text-xs font-bold text-white transition-all active:scale-95 hover:bg-[#333]"
                >
                  <span>{c.label}</span>
                  {copied === i ? (
                    <span className="text-[10px] text-[#33d6a6]">Copied!</span>
                  ) : (
                    <Copy className="h-3 w-3 text-[#8492a6]" />
                  )}
                </button>
              ))}
            </div>
            <button className="mt-2 flex w-full items-center justify-center gap-1 py-1 text-xs text-[#8492a6] transition-colors hover:text-white">
              <Plus className="h-3 w-3" />
              <span>Create a copypasta</span>
            </button>
          </div>

          <div className="flex-1" />

          <div className="space-y-3 border-t border-[#ec3750]/30 p-3">
            {!preflight && (
              <button
                onClick={runPreflight}
                disabled={scanLoading || !backendUrl || !activeProject}
                className="w-full rounded-xl border-2 border-[#080861] bg-[#338eda] py-3 text-xs font-black text-white shadow-[0_4px_0_#080861] transition-all disabled:opacity-50 active:translate-y-1 active:shadow-none"
              >
                {scanLoading ? "Scanning..." : "Run Preflight Scan"}
              </button>
            )}

            <button
              onClick={() => handleStatusUpdate("Approved")}
              disabled={!activeProject}
              className="flex w-full items-center justify-center rounded-xl border-2 border-[#1b7b5d] bg-[#33d6a6] py-3.5 text-sm font-black text-[#17171d] shadow-[0_4px_0_#1b7b5d] transition-all disabled:opacity-50 active:translate-y-1 active:shadow-none hover:bg-[#2bb88e]"
            >
              Approve
            </button>

            <button
              onClick={() => handleStatusUpdate("Rejected")}
              disabled={!activeProject}
              className="flex w-full items-center justify-center rounded-xl border-2 border-[#7e0630] bg-[#ec3750] py-3.5 text-sm font-black text-white shadow-[0_4px_0_#7e0630] transition-all disabled:opacity-50 active:translate-y-1 active:shadow-none hover:bg-[#d02b42]"
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </>
  );
}