"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Code,
  Copy,
  ExternalLink,
  Search,
  XCircle,
} from "lucide-react";
import type { Copypasta, Submission } from "./ReviewerDashboard";

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

type IframeMode = "demo" | "github" | "stats";
type MobileTab = "queue" | "review" | "context";

interface MobileReviewerDashboardProps {
  queue: Submission[];
  activeProject: Submission | null;
  handleProjectSwitch: (project: Submission) => void;
  preflight: PreflightResponse | null;
  repoStats: RepoStats | null;
  statsLoading: boolean;
  iframeMode: IframeMode;
  setIframeMode: (mode: IframeMode) => void;
  fetchRepoStats: (githubUrl: string) => void;
  handleStatusUpdate: (status: string) => void;
  scanLoading: boolean;
  runPreflight: () => void;
  copied: number | null;
  handleCopy: (idx: number, text: string) => void;
  handleInsertCopypasta: (copypasta: Copypasta) => void;
  copypastas: Copypasta[];
  copypastaFeedback: string | null;
  publicComment: string;
  privateComment: string;
  setPublicComment: React.Dispatch<React.SetStateAction<string>>;
  setPrivateComment: React.Dispatch<React.SetStateAction<string>>;
  previousSubmissions: PreviousSubmission[];
  historyLoading: boolean;
  queueCount: number;
}

function StatusDot({ status }: { status: Submission["status"] }) {
  const color =
    status === "clean"
      ? "bg-[#33d6a6]"
      : status === "flagged"
      ? "bg-[#ff8c37]"
      : "bg-[#8492a6]";

  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />;
}

function CheckRow({
  label,
  result,
}: {
  label: string;
  result: CheckResult;
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-[#252429] px-3 py-2">
      {result.passed ? (
        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#33d6a6]" />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#ec3750]" />
      )}
      <div>
        <p className="text-[11px] font-black uppercase tracking-wider text-white">
          {label}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-[#a5b0c2]">
          {result.detail}
        </p>
      </div>
    </div>
  );
}

function normalizeHackatimeProjects(
  value: string[] | string | null | undefined
): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

const previewModes: {
  mode: IframeMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { mode: "demo", label: "Live", icon: ExternalLink },
  { mode: "github", label: "Code", icon: Code },
  { mode: "stats", label: "Stats", icon: Search },
];

export default function MobileReviewerDashboard({
  queue,
  activeProject,
  handleProjectSwitch,
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
  handleInsertCopypasta,
  copypastas,
  copypastaFeedback,
  publicComment,
  privateComment,
  setPublicComment,
  setPrivateComment,
  previousSubmissions,
  historyLoading,
  queueCount,
}: MobileReviewerDashboardProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>("queue");

  useEffect(() => {
    if (activeProject) {
      setActiveTab("review");
    }
  }, [activeProject]);

  const activeUrl = activeProject
    ? iframeMode === "demo"
      ? activeProject.playable_url
      : activeProject.github_url.replace(
          "https://github.com",
          "https://github1s.com"
        )
    : "";

  const repoName = useMemo(() => {
    if (!activeProject?.github_url) return "No active project";
    return activeProject.github_url.split("/").pop() || "Unknown repo";
  }, [activeProject]);

  const hackatimeProjects = normalizeHackatimeProjects(
    activeProject?.hackatime_projects
  );

  return (
    <div
      className="min-h-screen bg-[#ec3750] text-[#17171d]"
      style={{ fontFamily: "Phantom Sans, system-ui, sans-serif" }}
    >
      <div className="sticky top-0 z-30 border-b-2 border-[#17171d] bg-[#f9d8de] px-4 pb-3 pt-4 shadow-[0_4px_0_#17171d]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2rem] text-[#8492a6]">
              Velocity Mobile
            </p>
            <h1 className="text-xl font-black text-[#17171d]">
              {queueCount} in queue
            </h1>
          </div>

          <div className="rounded-2xl bg-[#17171d] px-3 py-2 text-white shadow-[0_3px_0_#080861]">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8492a6]">
              Active
            </p>
            <p className="max-w-[120px] truncate text-xs font-black">
              {repoName}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl border-2 border-[#17171d] bg-[#17171d] p-1">
          {[
            { key: "queue", label: "Queue" },
            { key: "review", label: "Review" },
            { key: "context", label: "Context" },
          ].map((tab) => {
            const selected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as MobileTab)}
                className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                  selected
                    ? "bg-[#ec3750] text-white shadow-[0_2px_0_#7e0630]"
                    : "text-[#a5b0c2]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="space-y-4 px-4 pb-28 pt-4">
        {activeTab === "queue" && (
          <section className="space-y-3">
            {queue.length === 0 ? (
              <div className="rounded-3xl border-2 border-[#17171d] bg-white p-5 shadow-[0_6px_0_#17171d]">
                <p className="text-sm font-bold text-[#8492a6]">
                  No submissions loaded yet
                </p>
              </div>
            ) : (
              queue.map((project) => {
                const isActive = activeProject?.id === project.id;
                const projectRepo =
                  project.github_url.split("/").pop() || "Unknown repo";

                return (
                  <button
                    key={project.id}
                    onClick={() => handleProjectSwitch(project)}
                    className={`w-full rounded-3xl border-2 px-4 py-4 text-left shadow-[0_5px_0_#17171d] transition active:translate-y-1 active:shadow-none ${
                      isActive
                        ? "border-[#17171d] bg-[#ffd43b]"
                        : "border-[#17171d] bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <StatusDot status={project.status} />
                      <p className="truncate text-sm font-black text-[#17171d]">
                        {projectRepo}
                      </p>
                    </div>

                    <p className="mt-1 pl-4 text-[11px] font-bold uppercase tracking-wider text-[#8492a6]">
                      {project.target_program}
                    </p>

                    {project.description?.trim() && (
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#5c6675]">
                        {project.description}
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </section>
        )}

        {activeTab === "review" && (
          <section className="space-y-4">
            {!activeProject ? (
              <div className="rounded-3xl border-2 border-[#17171d] bg-white p-6 text-center shadow-[0_6px_0_#17171d]">
                <p className="text-sm font-bold text-[#8492a6]">
                  Pick a submission from the queue to start reviewing
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-3xl border-2 border-[#17171d] bg-white p-4 shadow-[0_6px_0_#17171d]">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-[#8492a6]">
                      Preview Mode
                    </p>
                    <p className="text-sm font-black text-[#17171d]">
                      {repoName}
                    </p>
                  </div>

                  <div className="flex gap-1 rounded-xl border-2 border-[#17171d] bg-[#17171d] p-1">
                    {previewModes.map(({ mode, label, icon: Icon }) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setIframeMode(mode);
                          if (mode === "stats" && activeProject && !repoStats) {
                            fetchRepoStats(activeProject.github_url);
                          }
                        }}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-black transition ${
                          iframeMode === mode
                            ? "bg-[#ec3750] text-white"
                            : "text-[#a5b0c2]"
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border-2 border-[#17171d] bg-[#252429]">
                  {iframeMode !== "stats" ? (
                    activeUrl ? (
                      <iframe
                        key={activeUrl}
                        src={activeUrl}
                        title="Mobile Preview"
                        className="h-[320px] w-full border-none"
                        sandbox="allow-scripts allow-same-origin allow-forms"
                      />
                    ) : (
                      <div className="flex h-[320px] items-center justify-center p-4 text-center text-sm font-bold text-[#8492a6]">
                        No Preview URL available
                      </div>
                    )
                  ) : statsLoading ? (
                    <div className="flex h-[320px] flex-col items-center justify-center gap-3 text-white">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#ec3750] border-t-transparent" />
                      <p className="text-sm font-bold text-[#a5b0c2]">
                        Fetching repo stats...
                      </p>
                    </div>
                  ) : repoStats ? (
                    <div className="space-y-3 p-4 text-white">
                      {repoStats.aiSlopFlag && (
                        <div className="rounded-2xl border-2 border-[#ff8c37] bg-[#ff8c3720] p-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#ff8c37]" />
                            <div>
                              <p className="text-[11px] font-black uppercase">
                                AI Slop Detected
                              </p>
                              <p className="mt-1 text-xs text-[#a5b0c2]">
                                Very low commit count with a large additions spike.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "Stars", value: repoStats.stars },
                          { label: "Forks", value: repoStats.forks },
                          { label: "Issues", value: repoStats.openIssues },
                          { label: "Commits", value: repoStats.commitCount },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="rounded-xl bg-[#17171d] px-3 py-2"
                          >
                            <p className="text-[10px] font-bold uppercase tracking-wide text-[#8492a6]">
                              {item.label}
                            </p>
                            <p className="mt-1 text-sm font-black text-white">
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      {repoStats.language && (
                        <div className="rounded-xl bg-[#17171d] px-3 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[#8492a6]">
                            Language
                          </p>
                          <p className="mt-1 text-sm font-black text-white">
                            {repoStats.language}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-[320px] items-center justify-center p-4 text-center text-sm font-bold text-[#8492a6]">
                      Failed to load stats
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border-2 border-[#17171d] bg-white p-4 shadow-[0_6px_0_#17171d]">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18rem] text-[#33d6a6]">
                    Public Comment
                  </p>
                  <textarea
                    value={publicComment}
                    onChange={(e) => setPublicComment(e.target.value)}
                    placeholder="Write feedback visible to the submitter..."
                    rows={5}
                    className="w-full resize-none rounded-2xl border-2 border-[#17171d] bg-[#f7f3ea] px-3 py-3 text-sm text-[#17171d] outline-none focus:border-[#33d6a6]"
                  />
                </div>

                <div className="rounded-3xl border-2 border-[#17171d] bg-white p-4 shadow-[0_6px_0_#17171d]">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18rem] text-[#ff8c37]">
                    Private Comment
                  </p>
                  <textarea
                    value={privateComment}
                    onChange={(e) => setPrivateComment(e.target.value)}
                    placeholder="Internal review notes..."
                    rows={5}
                    className="w-full resize-none rounded-2xl border-2 border-[#17171d] bg-[#f7f3ea] px-3 py-3 text-sm text-[#17171d] outline-none focus:border-[#ff8c37]"
                  />
                </div>

                <div className="rounded-3xl border-2 border-[#17171d] bg-white p-4 shadow-[0_6px_0_#17171d]">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-[#8492a6]">
                      Copypasta Palette
                    </p>
                    {copypastaFeedback && (
                      <span className="text-[10px] font-black text-[#33d6a6]">
                        {copypastaFeedback}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {copypastas.map((copypasta, idx) => (
                      <div
                        key={`${copypasta.label}-${idx}`}
                        className="rounded-2xl border-2 border-[#17171d] bg-[#f7f3ea] p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-black text-[#17171d]">
                              {copypasta.label}
                            </p>
                            <p
                              className={`text-[10px] font-black uppercase tracking-wide ${
                                copypasta.type === "public"
                                  ? "text-[#33d6a6]"
                                  : "text-[#ff8c37]"
                              }`}
                            >
                              {copypasta.type}
                            </p>
                          </div>

                          <button
                            onClick={() => handleCopy(idx, copypasta.text)}
                            className="rounded-lg border-2 border-[#17171d] bg-white px-2 py-1 text-[#17171d]"
                            title="Copy to clipboard"
                          >
                            {copied === idx ? (
                              <span className="text-[10px] font-black text-[#33d6a6]">
                                Copied
                              </span>
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>

                        <p className="text-xs leading-relaxed text-[#5c6675]">
                          {copypasta.text}
                        </p>

                        <button
                          onClick={() => handleInsertCopypasta(copypasta)}
                          className={`mt-3 w-full rounded-xl border-2 border-[#17171d] px-3 py-2 text-xs font-black shadow-[0_3px_0_#17171d] transition active:translate-y-1 active:shadow-none ${
                            copypasta.type === "public"
                              ? "bg-[#33d6a6] text-[#17171d]"
                              : "bg-[#ff8c37] text-[#17171d]"
                          }`}
                        >
                          Insert into{" "}
                          {copypasta.type === "public" ? "Public" : "Private"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === "context" && (
          <section className="space-y-4">
            {!activeProject ? (
              <div className="rounded-3xl border-2 border-[#17171d] bg-white p-6 text-center shadow-[0_6px_0_#17171d]">
                <p className="text-sm font-bold text-[#8492a6]">
                  Pick a submission to see context
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-3xl border-2 border-[#17171d] bg-white p-4 shadow-[0_6px_0_#17171d]">
                  <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-[#8492a6]">
                    Submission
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#17171d] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#33d6a6]">
                      {activeProject.target_program}
                    </span>
                    <span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#8492a6]">
                      Age{" "}
                      {activeProject.birth_year
                        ? 2026 - activeProject.birth_year
                        : "Unknown"}
                    </span>
                  </div>

                  <div className="mt-3 rounded-2xl bg-[#f7f3ea] p-3">
                    <p className="text-[10px] font-black uppercase tracking-wide text-[#8492a6]">
                      Description
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#17171d]">
                      {activeProject.description?.trim() || "No description provided"}
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border-2 border-[#17171d] bg-white p-4 shadow-[0_6px_0_#17171d]">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.18rem] text-[#8492a6]">
                      Preflight Checks
                    </p>
                    {scanLoading && (
                      <span className="text-[10px] font-black text-[#ff8c37]">
                        Scanning...
                      </span>
                    )}
                  </div>

                  {preflight ? (
                    <div className="space-y-2">
                      <CheckRow label="README" result={preflight.readme_check} />
                      <CheckRow
                        label="Playable URL"
                        result={preflight.playable_url_check}
                      />
                      <CheckRow label="Age" result={preflight.birth_year_check} />
                      <CheckRow
                        label="Anti Fraud"
                        result={preflight.anti_fraud_check}
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-[#f7f3ea] p-3 text-sm font-bold text-[#8492a6]">
                      No scan run yet
                    </div>
                  )}

                  {preflight?.flags?.length ? (
                    <div className="mt-3 rounded-2xl border-2 border-[#ff8c37] bg-[#fff3cd] p-3">
                      <div className="mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-[#ff8c37]" />
                        <p className="text-[11px] font-black uppercase tracking-wide text-[#ff8c37]">
                          Fraud Warning
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        {preflight.flags.map((flag, idx) => (
                          <p
                            key={`${flag}-${idx}`}
                            className="text-xs font-medium leading-relaxed text-[#17171d]"
                          >
                            {flag}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-3xl border-2 border-[#17171d] bg-white p-4 shadow-[0_6px_0_#17171d]">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18rem] text-[#8492a6]">
                    Previous Submissions
                  </p>

                  {historyLoading ? (
                    <p className="text-sm font-bold text-[#8492a6]">
                      Loading submission history...
                    </p>
                  ) : previousSubmissions.length > 0 ? (
                    <div className="space-y-2">
                      {previousSubmissions.map((item, idx) => (
                        <div
                          key={`${item.program}-${item.approved_at ?? idx}`}
                          className="rounded-2xl bg-[#f7f3ea] p-3"
                        >
                          <p className="text-sm font-black text-[#17171d]">
                            {item.program}
                          </p>
                          <p className="mt-1 text-xs text-[#5c6675]">
                            {item.approved_at
                              ? `Approved ${new Date(
                                  item.approved_at * 1000
                                ).toLocaleDateString()}`
                              : "Recorded in history"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-[#8492a6]">
                      No previous submissions found for this repo
                    </p>
                  )}
                </div>

                <div className="rounded-3xl border-2 border-[#17171d] bg-white p-4 shadow-[0_6px_0_#17171d]">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18rem] text-[#8492a6]">
                    Hackatime
                  </p>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="rounded-2xl bg-[#f7f3ea] p-3">
                      <p className="text-[10px] font-black uppercase tracking-wide text-[#8492a6]">
                        Tracked Hours
                      </p>
                      <p className="mt-1 text-lg font-black text-[#17171d]">
                        {activeProject.hackatime_hours ?? "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#f7f3ea] p-3">
                      <p className="text-[10px] font-black uppercase tracking-wide text-[#8492a6]">
                        Project Names
                      </p>
                      {hackatimeProjects.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {hackatimeProjects.map((project) => (
                            <span
                              key={project}
                              className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#17171d]"
                            >
                              {project}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-[#5c6675]">
                          No Hackatime project names found
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border-2 border-[#17171d] bg-white p-4 shadow-[0_6px_0_#17171d]">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#8492a6]">
                    Links
                  </p>

                  <div className="space-y-2">
                    <a
                      href={activeProject.playable_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-2xl border-2 border-[#17171d] bg-[#ffd43b] px-3 py-3 text-sm font-black text-[#17171d] shadow-[0_3px_0_#17171d]"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open playable link
                    </a>

                    <a
                      href={activeProject.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-2xl border-2 border-[#17171d] bg-[#338eda] px-3 py-3 text-sm font-black text-white shadow-[0_3px_0_#080861]"
                    >
                      <Code className="h-4 w-4" />
                      Open GitHub repo
                    </a>
                  </div>
                </div>
              </>
            )}
          </section>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-[#17171d] bg-[#f9d8de] px-4 pb-4 pt-3 shadow-[0_-4px_0_#17171d]">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={runPreflight}
            disabled={scanLoading || !activeProject}
            className="rounded-2xl border-2 border-[#080861] bg-[#338eda] px-3 py-3 text-xs font-black text-white shadow-[0_4px_0_#080861] transition active:translate-y-1 active:shadow-none disabled:opacity-50"
          >
            {scanLoading ? "Scanning..." : "Preflight"}
          </button>

          <button
            onClick={() => handleStatusUpdate("Approved")}
            disabled={!activeProject}
            className="rounded-2xl border-2 border-[#080861] bg-[#338eda] px-3 py-3 text-xs font-black text-white shadow-[0_4px_0_#080861] transition active:translate-y-1 active:shadow-none disabled:opacity-50"
          >
            Approve
          </button>

          <button
            onClick={() => handleStatusUpdate("Rejected")}
            disabled={!activeProject}
            className="rounded-2xl border-2 border-[#7e0630] bg-[#ec3750] px-3 py-3 text-xs font-black text-white shadow-[0_4px_0_#7e0630] transition active:translate-y-1 active:shadow-none disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </footer>
    </div>
  );
}