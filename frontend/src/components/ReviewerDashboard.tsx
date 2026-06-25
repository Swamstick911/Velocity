"use client";

import { useSearchParams } from "next/navigation"
import MobileReviewerDashboard from "./MobileReviewerDashboard";
import { useEffect, useMemo, useState, useCallback } from "react";
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
  Mail,
} from "lucide-react";

interface CheckResult {
  passed: boolean;
  detail: string;
}

interface RiskSignal {
  id: string;
  vector: string;
  status: string;
  severity: string;
  score: number;
  detail: string;
  evidence?: Record<string, any>;
}

interface RiskReport {
  tier: string;
  score: number;
  gate: string;
  by_vector: Record<string, number>;
  signals: RiskSignal[];
}

interface PreflightResponse {
  overall_passed: boolean;
  birth_year_check: CheckResult;
  readme_check: CheckResult;
  playable_url_check: CheckResult;
  anti_fraud_check: CheckResult;
  flags: string[];
  risk: RiskReport;
}

export interface Submission {
  id: string;
  github_url: string;
  playable_url: string;
  target_program: string;
  status: "pending" | "clean" | "flagged" | string;
  birth_year: number | null;
  description: string;
  public_comment: string;
  private_comment: string;
  hackatime_hours: number | string | null;
  hackatime_projects: string[] | string;
  slack_id?: string | null;
}

const DEMO_QUEUE: Submission[] = [
  {
    id: "demo-1",
    github_url: "https://github.com/hackclub/sprig",
    playable_url: "https://sprig.hackclub.com",
    target_program: "Boba",
    status: "pending",
    birth_year: 2009,
    description: "A console made completely out of scratch which can run games and custom firmwares!",
    public_comment: "",
    private_comment: "",
    hackatime_hours: 30,
    hackatime_projects: ["sprig-website"],
    slack_id: "U0DEM001",
  },
  {
    id: "demo-2",
    github_url: "https://github.com/Swamstick911/Shelby",
    playable_url: "https://shelby-nu.vercel.app",
    target_program: "Hack Club: The Game",
    status: "pending",
    birth_year: 2010,
    description: "A working operating system in micropython for Sprig!",
    public_comment: "",
    private_comment: "",
    hackatime_hours: 40,
    hackatime_projects: ["Shelby"],
    slack_id: "U0DEMO02"
  },
  {
    id: "demo-3",
    github_url: "https://github.com/hackclub/sinerider",
    playable_url: "https://sinerider.hackclub.com",
    target_program: "Arcade",
    status: "pending",
    birth_year: 2008,
    description: "A math puzzle game where you draw equations to guide a guy on a surfboard to get all the coins",
    public_comment: "",
    private_comment: "",
    hackatime_hours: 50,
    hackatime_projects: ["sinerider"],
    slack_id: "U0DEMO03",
  },
  {
    id: "demo-4",
    github_url: "https://github.com/Swamstick911/The-Vault-Portfolio-",
    playable_url: "https://the-vault-portfolio.vercel.app",
    target_program: "Stardance",
    status: "pending",
    birth_year: 2010,
    description: "A portfolio website for showcasing my projects, built with Astro",
    public_comment: "",
    private_comment: "",
    hackatime_hours: 16,
    hackatime_projects: ["The-Vault-Portfolio"],
    slack_id: "U0DEMO04",
  },
  {
    id: "demo-5",
    github_url: "https://github.com/hackclub/site",
    playable_url: "https://this-demo-link-does-not-exist.hackclub.dev",
    target_program: "High Seas",
    status: "pending",
    birth_year: 2006,
    description: "Personal portfolio site. The live link might be down right now, sorry!",
    public_comment: "",
    private_comment: "",
    hackatime_hours: 8,
    hackatime_projects: ["portfolio"],
    slack_id: "U0DEMO05",
  },
]

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

interface PreviousSubmission {
  github_url: string;
  program: string;
  approved_at: number | null;
}

type CopypastaType = "public" | "private";

type FetchStatus = "loading" | "success" | "error";

export interface Copypasta{
  label: string;
  type: CopypastaType;
  text: string;
}

const COPYPASTAS: Copypasta[] = [
  {
    label: "Short README",
    type: "public",
    text: "We liked your project, but the README is too short right now. Please add more detail about what you built, how it works, and how to use it, then resubmit.",
  },
  {
    label: "Broken Link",
    type: "public",
    text: "Your playable link appears to be broken or unavailable right now. Please fix the link and resubmit",
  },
  {
    label: "Needs description",
    type: "public",
    text: "Please add more context in the project description so reviewers can better understand what you built and what should be evaluated",
  },
  {
    label: "Resubmit after fixes",
    type: "public",
    text: "This looks promising, but it needs a few fixes before approval. Please make the requested changes and resubmit"
  },
  {
    label: "AI Slop",
    type: "private",
    text: "Flagged for suspiciously high AI generated content signals. Needs closer manual review.",
  },
  {
    label: "Double Dip",
    type: "private",
    text: "Project may already be submitted to another YSWS. Check previous submissions before approval",
  },
  {
    label: "Check reship",
    type: "private",
    text: "Possible reship project. Compare against previous submission history and prior approval context",
  },
  {
    label: "Needs lead review",
    type: "private",
    text: "Edge case, recommend escalation to the program lead before final decision",
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

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#f7f3ea] text-[#17171d]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 animate-pulse">
          <div className="h-8 w-56 rounded bg-[#17171d]/10"/>
          <div className="mt-3 h-4 w-80 rounded bg-[#17171d]/10" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-3xl border-4 border-[#17171d] bg-white p-5 shadow-[0_8px_0_#17171d]">
            <div className="space-y-3 animate-pulse">
              <div className="h-6 w-40 rounded bg-[#17171d]/10"/>
              <div className="h-20 rounded-2xl bg-[#17171d]/10" />
              <div className="h-20 rounded-2xl bg-[#17171d]/10" />
              <div className="h-20 rounded-2xl bg-[#17171d]/10"/>
            </div>
          </div>

          <div className="rounded-3xl border-4 border-[#17171d] bg-white p-5 shadow-[0_8px_0_#17171d]">
            <div className="space-y-4 animate-pulse">
              <div className="h-8 w-64 rounded bg-[#17171d]/10"/>
              <div className="h-64 rounded-2xl bg-[#17171d]/10" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="h-24 rounded-2xl bg-[#17171d]/10"/>
                <div className="h-24 rounded-2xl bg-[#17171d]/10"/>
              </div>
              <div className="h-28 rounded-2xl bg-[#17171d]/10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#f7f3ea] px-4 py-10 text-[#17171d]">
      <div className="mx-auto max-w-xl rounded-3xl border-4 border-[#17171d] bg-white p-6 shadow-[0_8px_0_#17171d]">
        <div className="mb-4 inline-flex rounded-2xl bg-[#ec3750]/10 px-3 py-1 text-sm font-black text-[#ec3750]">
          Data Fetch failed
        </div>

        <h2 className="text-2xl font-black">Couldn&apos;t load the review queue</h2>
        <p className="mt-3 text-sm leading-6 text-[#17171d]/75">
          {message}
        </p>

        <button
          onClick={onRetry}
          className="mt-6 rounded-2xl border-4 border-[#17171d] bg-[#338eda] px-5 py-3 text-sm font-black text-white shadow-[0_4px_0_#17171d] transition active:translate-y-1 active:shadow-none"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function DashboardEmpty({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="min-h-screen bg-[#f7f3ea] px-4 py-10 text-[#17171d]">
      <div className="mx-auto max-w-xl rounded-3xl border-4 border-[#17171d] bg-white p-6 shadow-[0_8px_0_#17171d]">
        <div className="mb-4 inline-flex rounded-2xl bg-[#33d6a6]/15 px-3 py-1 text-sm font-black text-[#12805c]">
          Queue Clear
        </div>

        <h2 className="text-2xl font-black">No submissions to review</h2>
        <p className="mt-3 text-sm leading-6 text-[#17171d]/75">
          The Airtable queue is currently empty, or all pending items have already been processed
        </p>

        <button
          onClick={onRefresh}
          className="mt-6 rounded-2xl border-4 border-[#17171d] bg-[#ffd43b] px-5 py-3 text-sm font-black text-[#17171d] shadow-[0_4px_0_#17171d] transition active:translate-y-1 active:shadow-none"
        >
          Refresh Queue
        </button>
      </div>
    </div>
  );
}

export default function ReviewerDashboard() {
  const defaultBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";

  const [queue, setQueue] = useState<Submission[]>([]);
  const [activeProject, setActiveProject] = useState<Submission | null>(null);

  const [fetchStatus, setFetchStatus] = useState<FetchStatus>("loading");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [pageLoading, setPageLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  const [repoStats, setRepoStats] = useState<RepoStats | null>(null);
  const [preflight, setPreflight] = useState<PreflightResponse | null>(null);
  const [scanResults, setScanResults] = useState<
    Record<string, { tier: string; score: number; gate: string; result?: PreflightResponse | null }>
  >({});
  const [scanningIds, setScanningIds] = useState<Set<string>>(new Set());
  const [scanProgress, setScanProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [gateAcknowledged, setGateAcknowledged] = useState(false);

  // --- Column mapping (auto-detect + confirm) ---
  const [columnMapping, setColumnMapping] = useState<Record<string, string | null> | null>(null);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [usingHackatime, setUsingHackatime] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [draftMapping, setDraftMapping] = useState<Record<string, string | null>>({});

  const [iframeMode, setIframeMode] = useState<"demo" | "github" | "stats">(
    "demo"
  );
  const [copied, setCopied] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [backendUrl] = useState(defaultBackendUrl);
  const [showAirtableGate, setShowAirtableGate] = useState(true);
  const [emailInput, setEmailInput] = useState("");
  const [airtableTokenInput, setAirtableTokenInput] = useState("");
  const [airtableBaseIdInput, setAirtableBaseIdInput] = useState("");
  const [airtableTableNameInput, setAirtableTableNameInput] = useState("Submissions");
  const [needsSetup, setNeedsSetup] = useState(false)
  const [githubApiKeyInput, setGithubApiKeyInput] = useState("");

  const [email, setEmail] = useState("");
  const [airtableToken, setAirtableToken] = useState("");
  const [airtableBaseId, setAirtableBaseId] = useState("");
  const [airtableTableName, setAirtableTableName] = useState("Submissions");
  const [githubApiKey, setGithubApiKey] = useState("");

  const [configError, setConfigError] = useState<string | null>(null);

  const [publicComment, setPublicComment] = useState("");
  const [privateComment, setPrivateComment] = useState("");
  const [copypastaFeedback, setCopypastaFeedback] = useState<string | null>(null);

  const [previousSubmissions, setPreviousSubmissions] = useState<PreviousSubmission[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyCounts, setHistoryCounts] = useState<Record<string, number>>({});

  const [demoMode, setDemoMode] = useState(false);

  const [statusFilter, setStatusFilter] = useState("all");
  const [programFilter, setProgramFilter] = useState("all");
  const [onlyWithHistory, setOnlyWithHistory] = useState(false);
  const [onlyWithHackatime, setOnlyWithHackatime] = useState(false);
  const [touchGrassMode, setTouchGrassMode] = useState(false);

  const [showNewCopypasta, setShowNewCopypasta] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newText, setNewText] = useState("");
  const [customCopypastas, setCustomCopypastas] = useState<Copypasta[]>(() => {
    if(typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("velocity_custom_copypastas") || "[]");
    } catch { return []; }
  });

  const searchParams = useSearchParams()

  const copyToClipboard = async (text: string) => {
    try {
      if(navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
    } catch (err) {
      console.error("Copy failed", err);
      throw err;
    }
  };

  const fetchQueue = useCallback(
    async (
      token?: string,
      baseId?: string,
      tableName?: string
    ) => {
      setFetchStatus("loading");
      setFetchError(null);
      setQueueError(null);

      const resolvedToken = token ?? airtableToken;
      const resolvedBaseId = baseId ?? airtableBaseId;
      const resolvedTableName = tableName ?? airtableTableName;

      if (!resolvedToken || !resolvedBaseId || !resolvedTableName) {
        setQueue([]);
        setActiveProject(null);
        setFetchError("Missing Airtable configuration.");
        setFetchStatus("error");
        setHasLoadedOnce(true);
        return;
      }

      try {
        const res = await fetch("/api/airtable", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            airtableToken: resolvedToken,
            airtableBaseId: resolvedBaseId,
            airtableTableName: resolvedTableName,
            columnMapping: columnMapping ?? undefined,
            usingHackatime,
          }),
          cache: "no-store",
        });

        if (!res.ok) {
          let message = `Queue request failed with status ${res.status}`;

          try {
            const err = await res.json();
            if (err?.error) message = err.error;
          } catch {}

          throw new Error(message);
        }

        const data = await res.json();

        if (Array.isArray(data?.columns)) setAvailableColumns(data.columns);

        // First load with no confirmed mapping: show what we detected so the
        // reviewer can confirm/override before trusting the queue.
        if (!columnMapping && data?.columnMapping) {
          setDraftMapping(data.columnMapping);
          setShowColumnModal(true);
        }

        const nextQueue: Submission[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.submissions)
          ? data.submissions
          : Array.isArray(data?.records)
          ? data.records
          : [];

        setQueue(nextQueue);

        setActiveProject((current) => {
          if (!nextQueue.length) return null;
          if (!current) return nextQueue[0];

          const matched = nextQueue.find((item) => item.id === current.id);
          return matched ?? nextQueue[0];
        });

        setFetchStatus("success");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Something went wrong while loading the review queue.";

        setQueue([]);
        setActiveProject(null);
        setFetchError(message);
        setQueueError(message);
        setFetchStatus("error");
      } finally {
        setHasLoadedOnce(true);
      }
    },
    [airtableToken, airtableBaseId, airtableTableName, columnMapping, usingHackatime]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") startDemo();
  }, []);

  useEffect(() => {
    if (airtableToken && airtableBaseId && airtableTableName) {
      void fetchQueue();
    }
  }, [fetchQueue, airtableToken, airtableBaseId]);

  useEffect(() => {
    setPageLoading(false);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailFromUrl = params.get("email");

    if (emailFromUrl) {
      fetch(`${backendUrl}/api/config/get`, { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data.airtable_access_token) {
          setEmail(data.email || emailFromUrl);
          setAirtableToken(data.airtable_access_token)

          if (data.airtable_base_id && data.airtable_table_name) {
            setAirtableBaseId(data.airtable_base_id)
            setAirtableTableName(data.airtable_table_name)
            setShowAirtableGate(false)

            if (data.column_mapping) {
              // Saved mapping follows the reviewer across devices — load it
              // silently and let the refetch effect pull the queue with it.
              const saved = data.column_mapping as Record<string, string | null>
              setColumnMapping(saved)
              setUsingHackatime(Boolean(saved.hackatime_hours || saved.hackatime_projects))
            } else {
              fetchQueue(data.airtable_access_token, data.airtable_base_id, data.airtable_table_name)
            }
          } else {
            setNeedsSetup(true)
            setShowAirtableGate(false)
          }
          window.history.replaceState({}, "", "/dashboard")
        }
      })
      .catch((err) => 
        console.error("Failed to fetch config from backend", err));
    }
  }, [searchParams])

  const summaryCounts = useMemo(() => {
    return {
      total: queue.length,
      pending: queue.filter((p) => (p.status || "pending") === "pending").length,
      clean: queue.filter((p) => p.status === "clean").length,
      flagged: queue.filter((p) => p.status === "flagged").length,
    };
  }, [queue]);

  const programOptions = useMemo(() => {
    return Array.from(
      new Set(queue.map((p) => p.target_program).filter(Boolean))
    ).sort();
  }, [queue]);

  const riskRank = (project: Submission) => {
    const tier = scanResults[project.id]?.tier;
    if (tier === "flagged") return 0;
    if (tier === "review") return 1;
    if (tier === "clean") return 2;
    return 3;
  };

  const getQueuePriority = (project: Submission) => {
    const recommendedAction = getRecommendedAction(project);
    const historyCount = getHistoryCountForProject(project);
    const hasHackatime = getHackatimePresence(project);

    if (project.status === "flagged") return 0;
    if (recommendedAction === "review-carefully") return 1;
    if (recommendedAction === "needs-context") return 2;
    if (!hasHackatime) return 3;
    if (historyCount > 0) return 4;
    return 5;
  };

  const filteredQueue = useMemo(() => {
    let results = [...queue];

    if(searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter((p) => {
        const repoName = p.github_url.split("/").pop() || "";
        return (
          repoName.toLowerCase().includes(q) ||
          p.target_program.toLowerCase().includes(q) ||
          p.github_url.toLowerCase().includes(q)
        );
      });
    }

    if (statusFilter !== "all") {
      results = results.filter((p) => (p.status || "pending") === statusFilter);
    }

    if(programFilter !== "all") {
      results = results.filter((p) => p.target_program === programFilter);
    }

    if(onlyWithHackatime) {
      results = results.filter((p) => getHackatimePresence(p))
    }

    if (onlyWithHistory) {
      results = results.filter((p) => getHistoryCountForProject(p) > 0)
    }

    results.sort((a, b) => {
      const riskDiff = riskRank(a) - riskRank(b);
      if (riskDiff !== 0) return riskDiff;

      const scoreDiff = (scanResults[b.id]?.score ?? 0) - (scanResults[a.id]?.score ?? 0);
      if (scoreDiff !== 0) return scoreDiff;

      const priorityDiff = getQueuePriority(a) - getQueuePriority(b);
      if (priorityDiff !== 0) return priorityDiff;

      const historyDiff = 
        getHistoryCountForProject(b) - getHistoryCountForProject(a);
      if (historyDiff !== 0) return historyDiff;

      const repoA = a.github_url.split("/").pop() || "";
      const repoB = b.github_url.split("/").pop() || "";
      return repoA.localeCompare(repoB);
    });

    return results;
  }, [
    queue,
    searchQuery,
    statusFilter,
    programFilter,
    onlyWithHistory,
    onlyWithHackatime,
    historyCounts,
    scanResults,
  ]);

  const scanSummary = useMemo(() => {
    const s = { flagged: 0, review: 0, clean: 0 };
    for (const p of queue) {
      const tier = scanResults[p.id]?.tier;
      if (tier === "flagged") s.flagged++;
      else if (tier === "review") s.review++;
      else if (tier === "clean") s.clean++;
    }
    return s;
  }, [queue, scanResults]);

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

    if (!emailInput.trim() || !emailInput.includes("@")) {
      setConfigError("A valid email address is required.");
      return;
    }

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

    const nextEmail = emailInput.trim();
    const nextToken = airtableTokenInput.trim();
    const nextBaseId = airtableBaseIdInput.trim();
    const nextTable = airtableTableNameInput.trim();
    const nextGithubKey = githubApiKeyInput.trim();

    setEmail(nextEmail);
    setAirtableToken(nextToken);
    setAirtableBaseId(nextBaseId);
    setAirtableTableName(nextTable);
    setGithubApiKey(nextGithubKey);
    setShowAirtableGate(false);

    await fetchQueue(nextToken, nextBaseId, nextTable);
  };

  const handleConfirmColumns = async () => {
    setColumnMapping(draftMapping);
    setShowColumnModal(false);

    // Persist per-reviewer so the mapping follows them across devices.
    try {
      await fetch(`${backendUrl}/api/config/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          airtable_base_id: airtableBaseId,
          airtable_table_name: airtableTableName,
          column_mapping: draftMapping,
        }),
      });
    } catch (err) {
      console.error("Failed to save column mapping", err);
    }
    // setColumnMapping changes fetchQueue's identity → refetch effect reloads
    // the queue with the confirmed mapping.
  };

  const handleEditConfig = () => {
    setEmailInput(email);
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
    setGateAcknowledged(false);

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (githubApiKey.trim()) {
        headers["Authorization"] = `Bearer ${githubApiKey.trim()}`;
      }

      const rawHours = activeProject.hackatime_hours;
      const hackatimeHours =
        rawHours === null || rawHours === undefined || rawHours === ""
          ? null
          : Number(rawHours);

      const res = await fetch(`${backendUrl}/api/v1/preflight`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          github_url: activeProject.github_url,
          playable_url: activeProject.playable_url,
          birth_year: activeProject.birth_year,
          target_program: activeProject.target_program,
          hackatime_hours: Number.isNaN(hackatimeHours) ? null : hackatimeHours,
          hackatime_projects: normalizeHackatimeProjects(activeProject.hackatime_projects),
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

  const buildScanPayload = (p: Submission) => {
    const rawHours = p.hackatime_hours;
    const hours =
      rawHours === null || rawHours === undefined || rawHours === ""
        ? null
        : Number(rawHours);
    return {
      submission_id: p.id,
      github_url: p.github_url,
      playable_url: p.playable_url,
      birth_year: p.birth_year,
      target_program: p.target_program,
      hackatime_hours: Number.isNaN(hours as number) ? null : hours,
      hackatime_projects: normalizeHackatimeProjects(p.hackatime_projects),
    };
  };

  const scanOne = async (p: Submission) => {
    setScanningIds((s) => new Set(s).add(p.id));
    try {
      const res = await fetch(`${backendUrl}/api/scan/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildScanPayload(p)),
      });
      if (res.ok) {
        const data: PreflightResponse = await res.json();
        setScanResults((prev) => ({
          ...prev,
          [p.id]: { tier: data.risk.tier, score: data.risk.score, gate: data.risk.gate, result: data },
        }));
      }
    } catch (err) {
      console.error("Scan failed for", p.id, err);
    } finally {
      setScanningIds((s) => {
        const n = new Set(s);
        n.delete(p.id);
        return n;
      });
      setScanProgress((prev) => ({ ...prev, done: prev.done + 1 }));
    }
  };

  const runTriageScan = async (projects: Submission[], force = false) => {
    if (!backendUrl || !projects.length) return;
    const ids = projects.map((p) => p.id).filter(Boolean);
    
    let staleIds = ids;
    if (!force) {
      try {
        const res = await fetch(`${backendUrl}/api/scan/results`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        if (res.ok) {
          const data = await res.json();
          setScanResults((prev) => ({ ...prev, ...data.results }));
          staleIds = data.stale || [];
        }
      } catch (err) {
        console.error("Cached scan lookup failed", err);
      }
    }

    const toScan = projects.filter((p) => staleIds.includes(p.id));
    setScanProgress({ done: 0, total: toScan.length });

    let idx = 0;
    const worker = async () => {
      while (idx < toScan.length) {
        const cur = toScan[idx++];
        await scanOne(cur);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  };

  useEffect(() => {
    if(queue.length > 0) {
      void runTriageScan(queue);
    }
  }, [queue]);

  const fetchPreviousSubmissions = async (githubUrl: string) => {
    if(!backendUrl || !githubUrl) {
      setPreviousSubmissions([]);
      return;
    }

    try {
      setHistoryLoading(true);

      const params = new URLSearchParams({ github_url: githubUrl });
      const res = await fetch(`${backendUrl}/api/submissions/history?${params.toString()}`);

      if (!res.ok) {
        throw new Error("Failed to fetch submission history");
      }

      const data = await res.json();
      setPreviousSubmissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch previous submissions", err);
      setPreviousSubmissions([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchHistoryCounts = async (projects: Submission[]) => {
    if (!backendUrl || !projects.length) {
      setHistoryCounts({});
      return;
    }

    try {
      const githubUrls = Array.from(
        new Set(
          projects
            .map((p) => p.github_url?.trim().toLowerCase().replace(/\/+$/, ""))
            .filter(Boolean)
        )
      );
      
      if (!githubUrls.length) {
        setHistoryCounts({});
        return;
      }

      const res = await fetch(`${backendUrl}/api/submissions/history-counts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ github_urls: githubUrls }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch history counts");
      }

      const data = await res.json();
      setHistoryCounts(data || {});
    } catch (err) {
      console.error("Failed to fetch history counts", err);
      setHistoryCounts({});
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

  function startDemo() {
    setDemoMode(true);
    setEmail("demo@velocity.app");
    setShowAirtableGate(false);
    setNeedsSetup(false);
    setQueue(DEMO_QUEUE);
    setActiveProject(DEMO_QUEUE[0]);
    setFetchStatus("success");
    setHasLoadedOnce(true);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/dashboard?demo=1");
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!activeProject) return;

    if (newStatus === "Rejected" && !publicComment.trim()) {
      alert("Pick a reason (tap a public copypasta) before rejecting- it gets DM'd to the submitter");
      return;
    }

    if (demoMode) {
      setQueue((prev) => prev.filter((p) => p.id !== activeProject.id));
      setActiveProject(null);
      setPublicComment("");
      setPrivateComment("");
      return;
    }

    try {
      const res = await fetch("/api/airtable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeProject.id,
          status: newStatus,
          publicComment,
          privateComment,
          airtableToken,
          airtableBaseId,
          airtableTableName,
          githubUrl: activeProject.github_url,
          targetProgram: activeProject.target_program,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update status");
      }

      //Record approved repos so double-dip/history checks can see them later
      if (newStatus === "Approved" && backendUrl && activeProject.github_url) {
        try {
          await fetch(`${backendUrl}/api/submissions/record`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              github_url: activeProject.github_url,
              program: activeProject.target_program,
              hackatime_projects: normalizeHackatimeProjects(activeProject.hackatime_projects),
            }),
          });
        } catch (recordErr) {
          console.error("Failed to record submissions history", recordErr);
        }
      }

      if (backendUrl) {
        const repoName = activeProject.github_url.split("/").pop() || "your project";
        try {
          await fetch(`${backendUrl}/api/slack/notify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slack_id: activeProject.slack_id ?? null,
              decision: newStatus === "Approved" ? "approved" : "rejected",
              repo: repoName,
              program: activeProject.target_program,
              reason: publicComment,
            }),
          });
        } catch (slackErr) {
          console.error("Slack notify failed", slackErr);
        }
      }

      //Remove from queue after approval/rejection
      setQueue((prev) => prev.filter((p) => p.id !== activeProject.id));
      setActiveProject(null);
    } catch (err: any) {
      console.error(err);
      alert("Failed to update project status: " + err.message);
    }
  };

  const handleProjectSwitch = (p: Submission) => {
    setTouchGrassMode(false);
    setActiveProject(p);
    setIframeMode("demo");
    setRepoStats(null);
    setPreflight(scanResults[p.id]?.result ?? null);
    setGateAcknowledged(false);
    setPublicComment(p.public_comment || "");
    setPrivateComment(p.private_comment || "");
    setCopied(null);
    setCopypastaFeedback(null);
    fetchPreviousSubmissions(p.github_url);
  };

  const handleCopy = async (idx: number, text: string) => {
    try {
      await copyToClipboard(text);
      setCopied(idx);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      alert("Could not copy text.");
    }
  };

  const appendComment = (
    current: string,
    nextText: string
  ) => (current.trim() ? `${current.trim()}\n\n${nextText}` :  nextText);

  const handleInsertCopypasta = (copypasta: Copypasta) => {
    if(copypasta.type === "public") {
      setPublicComment((prev) => appendComment(prev, copypasta.text));
      setCopypastaFeedback(`Inserted "${copypasta.label}" into public comment`)
    } else {
      setPrivateComment((prev) => appendComment(prev, copypasta.text));
      setCopypastaFeedback(`Inserted "${copypasta.label}" into private comment`)
    }

    setTimeout(() => setCopypastaFeedback(null), 1800);
  };

  const handleSaveNewCopypasta = () => {
    if (!newLabel.trim() || !newText.trim()) return;
    const newEntry: Copypasta = {
      label: newLabel.trim(),
      type: "private",
      text: newText.trim(),
    };
    const updated = [...customCopypastas, newEntry];
    setCustomCopypastas(updated);
    localStorage.setItem("velocity_custom_copypastas", JSON.stringify(updated));
    setNewLabel("");
    setNewText("");
    setShowNewCopypasta(false);
  };

  const handleDeleteCustomCopypasta = (idx: number) => {
    const updated = customCopypastas.filter((_, i) => i !== idx);
    setCustomCopypastas(updated);
    localStorage.setItem("velocity_custom_copypastas", JSON.stringify(updated));
  };

  const activeUrl = activeProject
    ? iframeMode === "demo"
      ? activeProject.playable_url
      : activeProject.github_url.replace(
          "https://github.com/",
          "https://github1s.com/"
        )
    : "";

  function normalizeHackatimeProjects(value: string[] | string | null | undefined): string[] {
    if (Array.isArray(value)) return value.filter(Boolean);

    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    }

    return [];
  };

  function getHistoryCountForProject(project: Submission) {
    if (!project.github_url) return 0;

    const cleanUrl = project.github_url.toLowerCase().replace(/\/+$/, "");
    return historyCounts[cleanUrl] ?? 0;
  }

  function getHackatimePresence(project: Submission) {
    const hasHours =
      project.hackatime_hours !== null &&
      project.hackatime_hours !== "" &&
      project.hackatime_hours !== undefined

    const hasProjects = normalizeHackatimeProjects(project.hackatime_projects).length > 0
    return hasHours || hasProjects
  }

  function getRecommendedAction(project: Submission) {
    const historyCount = getHistoryCountForProject(project)
    const hasHackatime = getHackatimePresence(project)

    if(project.status === "flagged") return "review-carefully"
    if(historyCount > 0) return "review-carefully"
    if(!hasHackatime) return "needs-context"
    return "clean-look"
  }

  const hasAirtableCreds = Boolean(airtableToken && airtableBaseId && airtableTableName);

  const isReturningFromOAuth = searchParams.has("email");

  const gateBlocked = preflight?.risk?.gate === "block";
  const approveBlocked = gateBlocked && !gateAcknowledged;


  if(fetchStatus === "loading" && !hasLoadedOnce && (hasAirtableCreds || isReturningFromOAuth)) {
    return <DashboardSkeleton />;
  }

  if(fetchStatus === "error") {
    return <DashboardError message={fetchError || "Unknown error"} onRetry={() => fetchQueue()} />;
  }

  if(fetchStatus === "success" && queue.length === 0) {
    return <DashboardEmpty onRefresh={() => fetchQueue()}/>;
  }

  return (
    <>
      {demoMode && (
        <div className="fixed bottom-4 left-1/2 z-[55] flex -translate-x-1/2 items-center gap-3 rounded-full border-2 border-[#17171d] bg-[#ffb703] px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#17171d] shadow-[0_4px_0_#17171d]">
          Demo Mode . Mock data
          <a href="/" className="rounded-full bg-[#17171d] px-2 py-0.5 text-white">
            Exit
          </a>
        </div>
      )}
      
      {showColumnModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border-2 border-[#17171d] bg-[#fdf6ec] p-5 shadow-[0_10px_0_#17171d]">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-lg">🔎</span>
              <h2 className="text-lg font-black uppercase tracking-tight text-[#17171d]">
                Confirm columns
              </h2>
            </div>
            <p className="mb-4 text-xs font-semibold text-[#5b6472]">
              We guessed which of your Airtable columns map to each field. Fix
              anything that looks off — this gets saved and follows you across
              devices.
            </p>

            <div className="space-y-2.5">
              {[
                { key: "github_url", label: "GitHub URL" },
                { key: "playable_url", label: "Playable / Demo URL" },
                { key: "target_program", label: "Target Program" },
                { key: "status", label: "Status" },
                { key: "birth_year", label: "Birth Year" },
                { key: "slack_id", label: "Slack ID" },
                { key: "description", label: "Description" },
                { key: "public_comment", label: "Public Comment" },
              ].map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <label className="w-36 shrink-0 text-[11px] font-black uppercase tracking-wide text-[#17171d]">
                    {field.label}
                  </label>
                  <select
                    value={draftMapping[field.key] ?? ""}
                    onChange={(e) =>
                      setDraftMapping((prev) => ({
                        ...prev,
                        [field.key]: e.target.value || null,
                      }))
                    }
                    className="flex-1 rounded-xl border-2 border-[#17171d] bg-white px-2 py-1.5 text-xs font-semibold text-[#17171d]"
                  >
                    <option value="">— none —</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border-2 border-dashed border-[#17171d] bg-[#fff] p-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-black uppercase tracking-wide text-[#17171d]">
                <input
                  type="checkbox"
                  checked={usingHackatime}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setUsingHackatime(on);
                    if (!on)
                      setDraftMapping((prev) => ({
                        ...prev,
                        hackatime_hours: null,
                        hackatime_projects: null,
                      }));
                  }}
                  className="h-4 w-4 accent-[#ec3750]"
                />
                Tracking time with Hackatime?
              </label>

              {usingHackatime && (
                <div className="mt-3 space-y-2.5">
                  {[
                    { key: "hackatime_hours", label: "Hackatime Hours" },
                    { key: "hackatime_projects", label: "Hackatime Projects" },
                  ].map((field) => (
                    <div key={field.key} className="flex items-center gap-3">
                      <label className="w-36 shrink-0 text-[11px] font-black uppercase tracking-wide text-[#17171d]">
                        {field.label}
                      </label>
                      <select
                        value={draftMapping[field.key] ?? ""}
                        onChange={(e) =>
                          setDraftMapping((prev) => ({
                            ...prev,
                            [field.key]: e.target.value || null,
                          }))
                        }
                        className="flex-1 rounded-xl border-2 border-[#17171d] bg-white px-2 py-1.5 text-xs font-semibold text-[#17171d]"
                      >
                        <option value="">— none —</option>
                        {availableColumns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowColumnModal(false)}
                className="rounded-full border-2 border-[#17171d] bg-white px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#17171d]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmColumns}
                className="rounded-full border-2 border-[#17171d] bg-[#ec3750] px-4 py-1.5 text-xs font-black uppercase tracking-widest text-white shadow-[0_4px_0_#17171d]"
              >
                Looks good — load queue
              </button>
            </div>
          </div>
        </div>
      )}

      {needsSetup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-3xl border-2 border-[#17171d] bg-[#f9d8de] p-5 shadow-[0_10px_0_#17171d]">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-2xl bg-[#17171d] p-3 text-white">
                    <Database className="h-5 w-5"/>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8492a6]">
                      One More step
                    </p>
                    <h1 className="text-2xl font-black text-[#17171d]">
                      Connect your Base
                    </h1>
                  </div>
                </div>

                <p className="mb-4 text-sm leading-relaxed text-[#17171d]/80">
                  Enter your Airtable Base ID and Table Name once. We will remember it for all of your devices.
                </p>

                <div className="space-y-3">
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
                      placeholder="appXXXXXXXXXXXXXXX"
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
                </div>

                <button
                  onClick={async () => {
                    if(!airtableBaseIdInput.trim() || !airtableTableNameInput.trim()) return
                    const baseId = airtableBaseIdInput.trim()
                    const tableName = airtableTableNameInput.trim()

                    await fetch(`${backendUrl}/api/config/save`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        airtable_base_id: baseId,
                        airtable_table_name: tableName,
                      }),
                    })

                    setAirtableBaseId(baseId)
                    setAirtableTableName(tableName)
                    setNeedsSetup(false)
                    setShowAirtableGate(false)
                    fetchQueue(airtableToken, baseId, tableName)
                  }}
                  className="mt-4 flex w-full items-center justify-center rounded-xl border-2 border-[#080861] bg-[#338eda] py-3 text-sm font-black text-white shadow-[0_4px_0_#080861] transition-all active:translate-y-1 active:shadow-none"
                >
                  Save and Load Queue
                </button>
              </div>
            </div>
          )}
              {showAirtableGate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
                  <div className="w-full max-w-md rounded-3xl border-2 border-[#17171d] bg-[#f9d8de] p-5 shadow-[0_10px_0_#17171d]">
                    {/* Headers */}
                    <div className="mb-4 flex items-center gap-3">
                      <div className="rounded-2xl bg-[#17171d] p-3 text-white">
                        <Shield className="h-5 w-5"/>
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8492a6]">
                          Dashboard Access
                        </p>
                        <h1 className="text-2xl font-black text-[#17171d]">
                          Welcome to Velocity
                        </h1>
                      </div>
                    </div>

                    {/* OAuth Button - Primary */}
                    <button
                      onClick={() => {
                        window.location.href =
                        `${backendUrl}/api/auth/login`;
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#17171d] bg-[#ffb703] py-3.5 text-sm font-black text-[#17171d] shadow-[0_4px_0_#17171d] transition-all active:translate-y-1 active:shadow-none">
                        <img
                          src="https://www.vectorlogo.zone/logos/airtable/airtable-icon.svg"
                          className="h-4 w-4"
                          alt="Airtable"/>
                          Login with Airtable
                    </button>
                    
                    <button
                      onClick={startDemo}
                      className="mt-2 flex-w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#17171d] bg-white py-3 text-sm font-black text-[#17171d] transition-all active:translate-y-1"
                    >
                      Try a live demo without making an account
                    </button>

                      <p className="mt-3 text-center text-xs font-medium text-[#17171d]/60 lg:hidden">
                        Reviewing on mobile? Just log in- we&apos;ll load the base you set up on desktop.
                      </p>

                      {/* Manual Entry is desktop-only, mobile uses OAuth + saved config */}
                      <div className="hidden lg:block">
                        {/* Divider */}
                        <div className="my-4 flex items-center gap-3">
                          <div className="flex-1 border-t border-[#17171d]/20" />
                          <span className="text-xs font-bold text-[#8492a6]">
                            or enter manually
                          </span>
                          <div className="flex-1 border-t border-[#17171d]/20" />
                        </div>

                        {/* Manual Input */}
                        <div className="space-y-3">
                          <label className="block">
                            <div className="mb-1 flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 text-[#8492a6]"/>
                              <span className="text-[11px] font-black uppercase tracking-wider text-[#8492a6]">
                                Email Address
                              </span>
                            </div>
                            <input
                              type="email"
                              value={emailInput}
                              onChange={e => setEmailInput(e.target.value)}
                              placeholder="reviewer@hackclub.com"
                              className="w-full rounded-xl border border-[#17171d]/15 bg-white px-3 py-3 text-sm text-[#17171d] outline-none focus:border-[#ec3750]" />
                          </label>

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
                              onChange={e => setAirtableTokenInput(e.target.value)}
                              placeholder="pat.xxxxxx"
                              className="w-full rounded-xl border border-[#17171d]/15 bg-white px-3 py-3 text-sm text-[#17171d] outline-none focus:border-[#ec3750]"/>
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
                              onChange={e => setAirtableBaseIdInput(e.target.value)}
                              placeholder="appXXXXXXXXXXXXXX"
                              className="w-full rounded-xl border border-[#17171d]/15 bg-white px-3 py-3 text-sm text-[#17171d] outline-none focus:border-[#ec3750]"/>
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
                              onChange={e => setAirtableTableNameInput(e.target.value)}
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
                              onChange={e => setGithubApiKeyInput(e.target.value)}
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
          </div>
        )}
      <div className="block lg:hidden">
        <MobileReviewerDashboard
          queue={queue}
          activeProject={activeProject}
          handleProjectSwitch={handleProjectSwitch}
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
          handleInsertCopypasta={handleInsertCopypasta}
          copypastas={COPYPASTAS}
          copypastaFeedback={copypastaFeedback}
          publicComment={publicComment}
          privateComment={privateComment}
          setPublicComment={setPublicComment}
          setPrivateComment={setPrivateComment}
          previousSubmissions={previousSubmissions}
          historyLoading={historyLoading}
          queueCount={queue.length}
          gateBlocked={gateBlocked}
          approveBlocked={approveBlocked}
          gateAcknowledged={gateAcknowledged}
          setGateAcknowledged={setGateAcknowledged}
        />
      </div>
    <div 
      className="hidden lg:flex relative h-screen w-full overflow-hidden"
      style={{
        fontFamily: "'Phantom Sans', system-ui, sans-serif",
        background: "#ec3750",
      }}>

        <div
          className="flex w-[220px] shrink-0 flex-col overflow-y-auto themed-scroll"
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
              <div className="text-sm font-black text-[#17171d]">
                {email ? email.split("@")[0] : "Reviewer"}
              </div>
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

          <div className="mb-3 space-y-2 rounded-xl border border-[#ec3750]/20 bg-white/70 p-2">
            <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-widest text-[#8492a6]">
              <div className="rounded-lg bg-[#f3f4f6] px-2 py-2">
                Total
                <div className="mt-1 text-sm text-[#17171d]">{summaryCounts.total}</div>
              </div>
              <div className="rounded-lg bg-[#f3f4f6] px-2 py-2">
                Pending
                <div className="mt-1 text-sm text-[#17171d]">{summaryCounts.pending}</div>
              </div>
              <div className="rounded-lg bg-[#f3f4f6] px-2 py-2">
                Clean
                <div className="mt-1 text-sm text-[#17171d]">{summaryCounts.clean}</div>
              </div>
              <div className="rounded-lg bg-[#f3f4f6] px-2 py-2">
                Flagged
                <div className="mt-1 text-sm text-[#17171d]">{summaryCounts.flagged}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-[#ec3750]/20 bg-white px-2 py-2 text-xs text-[#17171d] outline-none">
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="clean">Clean</option>
                  <option value="flagged">Flagged</option>
              </select>

              <select
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
                className="rounded-lg border border-[#ec3750]/20 bg-white px-2 py-2 text-xs text-[#17171d] outline-none">
                  <option value="all">All programs</option>
                  {programOptions.map((program) => (
                    <option key={program} value={program}>
                      {program}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setOnlyWithHackatime((prev) => !prev)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition ${
                  onlyWithHackatime
                    ? "bg-[#ec3750] text-white"
                    : "bg-[#fef4f6] text-[#8492a6]"
                }`}>
                  Hackatime
                </button>

              <button
                onClick={() => setOnlyWithHistory((prev) => !prev)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest transition ${
                  onlyWithHistory
                    ? "bg-[#ec3750] text-white"
                    : "bg-[#f3f4f6] text-[#8492a6]"
                }`}>
                  History
                </button>

              <button
                onClick={() => {
                  setStatusFilter("all");
                  setProgramFilter("all");
                  setOnlyWithHackatime(false);
                  setOnlyWithHistory(false);
                  setSearchQuery("");
                }}
                className="rounded-full bg-[#17171d] px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                  Reset
              </button>
            </div>
          </div>

          <div>
            <p className="mb-1 px-4 text-[10px] font-black uppercase tracking-widest text-[#8492a6]">
              Prioritized Queue ({filteredQueue.length})
            </p>
            <button
              onClick={() => runTriageScan(queue, true)}
              disabled={!backendUrl || !queue.length || scanProgress.done < scanProgress.total}
              className="rounded-full bg-[#17171d] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white disabled:opacity-40"
            >
              {scanProgress.total > 0 && scanProgress.done < scanProgress.total
                ? `Scanning... ${scanProgress.done}/${scanProgress.total}`
                : "Rescan all"}
            </button>
            <button
              onClick={() => {
                setDraftMapping(columnMapping ?? {});
                setShowColumnModal(true);
              }}
              disabled={!availableColumns.length}
              className="ml-1.5 rounded-full border border-[#17171d] bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#17171d] disabled:opacity-40"
            >
              Columns
            </button>
          </div>

          <div className="mb-2 flex flex-wrap gap-1.5 px-4 text-[9px] font-black uppercase tracking-widest">
            <span className="rounded-full bg-[#ec3750] px-2 py-0.5 text-white">{scanSummary.flagged} flagged</span>
            <span className="rounded-full bg-[#ff8c37] px-2 py-0.5 text-white">{scanSummary.review} review</span>
            <span className="rounded-full bg-[#33d6a6] px-2 py-0.5 text-[#17171d]">{scanSummary.clean} clean</span>                                                                                                   
          </div>
          
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

          <div className="space-y-1.5 px-3 pb-3">
            {pageLoading ? (
              <div className="rounded-xl bg-white/70 px-3 py-3 text-xs font-bold text-[#8492a6]">
                Loading queue...
              </div>
            ) : filteredQueue.length > 0 ? (
              filteredQueue.map((p) => {
                const repoName = p.github_url.split("/").pop() || "Unknown";
                const historyCount = getHistoryCountForProject(p)
                const hasHackatime = getHackatimePresence(p)
                const recommendedAction = getRecommendedAction(p)

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
                    <div className="flex items-center gap-2">
                      <StatusDot status={p.status} />
                      <span className="truncate font-black text-[#17171d]">
                        {repoName}
                      </span>
                    </div>
                    <div className="mt-1 pl-4 text-[10px] font-bold text-[#8492a6]">
                      {p.target_program}
                    </div>

                    <div className="mt-2 pl-4 flex flex-wrap gap-1.5">
                      {scanningIds.has(p.id) ? (
                        <span className="animate-pulse rounded-full bg-[#e0e6ed] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#8492a6]">
                          Scanning…
                        </span>
                      ) : scanResults[p.id] ? (
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                          style={{
                            background:
                              scanResults[p.id]?.tier === "flagged" ? "#ec3750"
                              : scanResults[p.id]?.tier === "review" ? "#ff8c37"
                              : "#33d6a6",
                            color: scanResults[p.id]?.tier === "flagged" ? "#fff" : "#17171d",
                          }}
                        >
                          {scanResults[p.id]?.tier} · {scanResults[p.id]?.score}
                        </span>
                      ) : null}

                      {historyCount > 0 && (
                        <span className="rounded-full bg-[#17171d] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">
                          History {historyCount}
                        </span>
                      )}

                      {hasHackatime && (
                        <span className="rounded-full bg-[#dff8f0] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#18795e]">
                          Hackatime
                        </span>
                      )}

                      {recommendedAction === "review-carefully" && (
                        <span className="rounded-full bg-[#fff1df] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#9a5800]">
                          Review Carefully
                        </span>
                      )}

                      {recommendedAction === "needs-context" && (
                        <span className="rounded-full bg-[#fef4f6] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#ec3750]">
                          Needs Context
                        </span>
                      )}

                      {recommendedAction === "clean-look" && (
                        <span className="rounded-full bg-[#dff8f0] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#18795e]">
                          Clean Look
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-xl bg-white/70 px-3 py-3 text-xs font-bold text-[#8492a6]">
                No submissions loaded yet.
              </div>
            )}
          </div>

          <div className="flex-1" />

          <button
            onClick={() => {
              setTouchGrassMode(true);
              setActiveProject(null);
              setPreflight(null);
              setRepoStats(null);
              setPreviousSubmissions([]);
              setPublicComment("");
              setPrivateComment("");
              setCopied(null);
              setCopypastaFeedback(null);
              setIframeMode("demo");
            }}
            className="mx-3 mb-3 rounded-xl border-2 border-[#17171d] bg-[#33d6a6] px-3 py-2 text-xs font-black text-[#17171d] shadow-[0_3px_0_#17171d] transition-all active:translate-y-1 active:shadow-none">
              Touch Grass
          </button>
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
              <div className="flex h-full min-h-[320px] items-center justify-center">
                <div className="max-w-md rounded-2xl border border-[#17171d]/10 bg-white px-6 py-8 text-center shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.2rem] text-[#8492a6]">
                    {touchGrassMode ? "Break Mode" : "Dashboard Ready"}
                  </p>
                  <h3 className="mt-2 text-xl font-black text-[#17171d]">
                    {touchGrassMode ? "You touched some grass" : "No project selected"}
                  </h3>
                  <p className="mt-2 text-sm text-[#5c6675]">
                    {touchGrassMode
                      ? "Drink some water, blink twice and then pick the next submission"
                      : "Pick a submission from the queue to load reviewer context"}
                  </p>
                  {touchGrassMode && (
                    <button
                      onClick={() => setTouchGrassMode(false)}
                      className="mt-4 rounded-xl border-2 border-[#17171d] bg-[#ffb703] px-4 py-2 text-xs font-black text-[#17171d] shadow-[0_3px_0_#17171d] transition-all active:translate-y-1 active:shadow-none">
                        Back to reviewing
                      </button>
                  )}
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

        <div className="flex w-[260px] shrink-0 flex-col overflow-y-auto themed-scroll border-l-2 border-[#ec3750] bg-[#f9d8de]">
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

          <p className="mb-2 text-[10px] font-medium text-[#8492a6]">
            Saved reviewer context loads automatically for each submission.
          </p>

          <div className="mx-3 mb-2 rounded-2xl bg-[#17171d] p-3 text-white">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#8492a6]">
              Submission Description
            </p>

            {activeProject?.description?.trim() ? (
              <p className="text-xs leading-relaxed text-[#d6d6dc] whitespace-pre-wrap">
                {activeProject.description}
              </p>
            ) : (
              <p className="text-xs text-[#8492a6]">
                No description provided by the submitter
              </p>
            )}
          </div>

          <div className="mx-3 mb-2 rounded-2xl bg-[#17171d] p-3 text-white">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#8492a6]">
              Previous Submissions
            </p>

            {historyLoading ? (
              <p className="text-xs text-[#8492a6]">Loading submission history...</p>
            ) : previousSubmissions.length > 0 ? (
              <div className="space-y-2">
                {previousSubmissions.map((item, i) => (
                  <div key={`${item.program}-${item.approved_at ?? i}`} className="rounded-xl bg-[#252429] px-3 py-2">
                    <p className="text-xs font-bold text-white">{item.program}</p>
                    <p className="mt-0.5 text-[10px] text-[#8492a6]">
                      {item.approved_at
                        ? `Approved ${new Date(item.approved_at * 1000).toLocaleDateString()}`
                        : "Recorded in history"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#8492a6]">
                No previous submissions found for this repo
              </p>
            )}
          </div>

          <div className="mx-3 mb-2 rounded-2xl bg-[#17171d] p-3 text-white">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#8492a6]">
              Hackatime
            </p>

            <div className="mb-2 rounded-xl bg-[#252429] px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-[#8492a6]">
                Tracked Hours
              </p>
              <p className="mt-1 text-lg font-black text-white">
                {activeProject?.hackatime_hours ?? "-"}
              </p>
            </div>

            <div>
              <p className="mb-2 text-[10px] uppercase tracking-widest text-[#8492a6]">
                Project Names
              </p>

              {normalizeHackatimeProjects(activeProject?.hackatime_projects).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {normalizeHackatimeProjects(activeProject?.hackatime_projects).map((project) => (
                    <span
                      key={project}
                      className="rounded-full bg-[#252429] px-2 py-1 text-[10px] font-medium text-[#d6d6dc]">
                        {project}
                      </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8492a6]">
                  No hackatime project names found
                </p>
              )}
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
                  Email
                </p>
                <p className="truncate text-xs text-white">
                  {email || "Not set"}
                </p>
              </div>
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
                  {backendUrl || "Missing NEXT_PUBLIC_BACKEND_URL"}
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

          {preflight?.risk && (
            <div className="mx-3 mb-2 flex-none rounded-2xl bg-[#17171d] p-3 text-white">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#8492a6]">
                  Risk Assessment
                </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                      preflight.risk.tier === "flagged"
                        ? "bg-[#ec3750] text-white"
                        : preflight.risk.tier === "review"
                        ? "bg-[#ff8c37] text-[#17171d]"
                        : "bg-[#33d6a6] text-[#17171d]"
                    }`}
                  >
                    {preflight.risk.tier} · {preflight.risk.score}
                  </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                  {Object.entries(preflight.risk.by_vector)
                    .filter(([, score]) => score > 0)
                    .map(([vector, score]) => (
                      <span
                        key={vector}
                        className="rounded-full bg-[#252429] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#8492a6]"
                      >
                        {vector.replace(/_/g, " ")}: {score}
                      </span>
                    ))}
              </div>
            </div>
          )}

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
            <div className="space-y-2">
              {[...COPYPASTAS, ...customCopypastas].map((c, i) => (
                <div key={i} className="rounded-lg bg-[#252429] p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-1.5">
                      <p className="truncate text-xs font-bold text-white">{c.label}</p>
                      <p className={`text-[10px] font-black uppercase tracking-wide ${c.type === "public" ? "text-[#33d6a6]" : "text-[#ff8c37]"}`}>{c.type}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleCopy(i, c.text)}
                        className="rounded-md px-2 py-1 text-[#8492a6] transition hover:bg-white/5 hover:text-white"
                        title="Copy to clipboard">
                          { copied === i ? <span className="text-[10px] text-[#33d6a6]">Copied!</span> : <Copy className="h-3 w-3"/>}
                        </button>
                        {i >= COPYPASTAS.length && (
                          <button
                            onClick={() => handleDeleteCustomCopypasta(i - COPYPASTAS.length)}
                            className="rounded-md px-2 py-1 text-[#8492a6] transition hover:bg-white/5 hover:text-[#ec3750]"
                            title="Delete">
                              <XCircle className="h-3 w-3"/>
                            </button>
                        )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleInsertCopypasta(c)}
                    className={`w-full rounded-md px-3 py-1.5 text-xs font-black transition ${c.type === "public" ? "bg-[#33d6a6] text-[#17171d] hover:bg-[#2bb88e]" : "bg-[#ff8c37] text-[#17171d] hover:bg-[#f07b22]"}`}>
                      Insert into {c.type === "public" ? "Public" : "Private"}
                    </button>
                </div>
              ))}
            </div>

            {copypastaFeedback && (
              <p className="mt-2 text-[10px] font-bold text-[#8492a6]">{copypastaFeedback}</p>
            )}

            {/* Create new Copypasta */}
            {showNewCopypasta ? (
              <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-[#252429] p-3">
                <p className="text[10px] font-black uppercase tracking-widest text-[#8492a6]">New Copypasta</p>
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Label (e.g. Wrong category)"
                  className="w-full rounded-lg border border-white/10 bg-[#17171d] px-3 py-2 text-xs text-white outline-none placeholder:text-[#8492a6] focus:border-[#ff8c37]"
                />
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Message text..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-white/10 bg-[#17171d] px-3 py-2 text-xs text-white outline-none placeholder:text-[#8492a6] focus:border-[#ff8c37]"/>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNewCopypasta}
                    disabled={!newLabel.trim() || !newText.trim()}
                    className="flex-1 rounded-lg bg-[#ff8c37] py-2 text-xs font-black text-[#17171d] transition hover:bg-[#f07b22] disabled:opacity-40">
                      Save
                  </button>
                  <button
                    onClick={() => { setShowNewCopypasta(false); setNewLabel(""); setNewText("") }}
                    className="rounded-lg bg-white/10 px-3 py-2 text-xs font-black text-[#8492a6] transition hover:text-white">
                      Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewCopypasta(true)}
                className="mt-2 flex w-full items-center justify-center gap-1 py-1 text-xs text-[#8492a6] transition-colors hover:text-white">
                  <Plus className="h-3 w-3"/>
                  <span>Create a Copypasta</span>
                </button>
            )}
          </div>

          <div className="mx-3 mb-2 rounded-2xl bg-[#17171d] p-3 text-white">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#8492a6]">
              Review Comments
            </p>

            <div className="space-y-3">
              <label className="block">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#33d6a6]">
                    Public
                  </span>
                  <span className="text-[10px] text-[#8492a6]">
                    Sent to submitter
                  </span>
                </div>
                <textarea
                  value={publicComment}
                  onChange={(e) => setPublicComment(e.target.value)}
                  placeholder="Write feedback visible to the user..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-white/10 bg-[#252429] px-3 py-2 text-xs text-white outline-none placeholder:text-[#8492a6] focus:border-[#33d6a6]"
                />
              </label>

              <label className="block">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#ff8c37]">
                    Private
                  </span>
                  <span className="text-[10px] text-[#8492a6]">
                    Reviewers and leads only
                  </span>
                </div>
                <textarea
                  value={privateComment}
                  onChange={(e) => setPrivateComment(e.target.value)}
                  placeholder="Internal review notes..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-white/10 bg-[#252429] px-3 py-2 text-xs text-white outline-none placeholder:text-[#8492a6] focus:border-[#ff8c37]"
                />
              </label>
            </div>
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

            {gateBlocked && (
              <label className="flex items-start gap-2 rounded-xl border-2 border-[#ec3750] bg-[#fff3cd] px-3 py-2 text-[11px] font-bold text-[#17171d]">
                <input
                  type="checkbox"
                  checked={gateAcknowledged}
                  onChange={(e) => setGateAcknowledged(e.target.checked)}
                  className="mt-0.5"
                />
                Flagged as high risk- I&apos;ve reviewed it and want to approve anyway
              </label>
            )}

            <button
              onClick={() => handleStatusUpdate("Approved")}
              disabled={!activeProject || approveBlocked}
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