"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    Code,
    Copy,
    ExternalLink,
    FileText,
    Search,
    XCircle
} from "lucide-react";
import type {
    Copypasta,
    Submission,
} from "./ReviewerDashboard";

interface CheckResult {
    passed: boolean;
    detail: string;
}

interface PreflightResponse {
    overallpassed: boolean;
    birthyearcheck: CheckResult;
    readmecheck: CheckResult;
    playableurlcheck: CheckResult;
    antifraudcheck: CheckResult;
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
    githuburl: string;
    program: string;
    approvedat: number | null;
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
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#ec3750]"/>
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
    if(typeof value === "string") {
        return value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
}

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
        if(activeProject) {
            setActiveTab("review");
        }
    }, [activeProject]);

    const activeUrl = activeProject
        ? iframeMode === "demo"
            ? activeProject.playable_url
            : activeProject.github_url.replace("https://github.com", "https://github1s.com")
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
            </div>
        </div>
    )
}