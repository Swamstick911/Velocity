"use-client";

import { useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, ExternalLink, Code, Clock, LogOut, Copy, Plus, Search } from "lucide-react";

//Types
interface CheckResult { passed: boolean; detail: string; }
interface PreflightResponse {
    overall_passed: boolean;
    birth_year_check: CheckResult;
    readme_check: CheckResult;
    anti_fraud_check: CheckResult;
    flags: string[];
}
interface Project {
    id: number;
    name: string;
    target: string;
    status: "pending" | "clean" | "flagged";
    github_url: string;
    playable_url: string;
    birth_year: number;
}

//Mock Data
const PROJECTS: Project[] = [
    {id: 1, name: "hackclub/sprig", target: "Blot", status: "flagged", github_url: "https://github.com/hackclub/sprig", playable_url: "https://sprig.hackclub.com", birth_year: 2008 },
    {id: 2, name: "Swamstick911/grindline", target: "High Seas", status: "pending", github_url: "https://github.com/Swamstick911/grindline", playable_url: "https://grindline-xi.vercel.app", birth_year: 2010 },
    {id: 3, name: "Swamstick911/Forxa", target: "Stasis", status: "clean", github_url: "https://github.com/Swamstick911/Forxa", playable_url: "https://github.com/Swamstick911/Forxa", birth_year: 2008 },
    {id: 4, name: "dev42/cool-project", target: "", status: "flagged", github_url: "https://github.com/hackclub/sprig", playable_url: "https://sprig.hackclub.com", birth_year: 2008 },
]

const COPYPASTAS = [
    { label: "Short README", text: "We loved your project, but your README was a bit too short, try to add more details about the project and then resubmit!"},
    { label: "Broken Link", text: "Hey! Your playable link seems to be returning an error. Make sure the URL is live and active, then resubmit when fixed"},
    { label: "AI Slop", text: "Our checks flagged your submission for a suspiciously high amount of AI-generated content, if you want to reappeal, DM any of us"},
    { label: "Double Dip", text: "Seems like this project is already submitted to another YSWS. Each project can only be submitted to one YSWS program"},
];

//Sub-components
const StatusDot = ({ status }: { status: Project["status"] }) => {
    const colors = { pending: "bg-[#8492a6]", clean: "bg-[#33d6a6]", flagged: "bg-[#ff8c37" };
    return <span className={`w-2 h-2 rounded-full inline-block ${colors[status]}`} />;
};

const CheckRow = ({ result, label }: {result: CheckResult, label: string }) => (
    <div className="flex items-start gap-2 py-1.5 border-b border-[#e0e6ed] last:border-0">
        {result.passed
          ? <CheckCircle className="w-4 h-4 text-[#33d6a6] mt-0.5 shrink-0" />
          : <XCircle    className="w-4 h-4 text-[#ec3750] mt-0.5 shrink-0" />}
        <div>
            <p className="text-xs font-bold text-[#17171d] uppercase tracking-wide">{label}</p>
            <p className="text-xs text-[#8492a6] leading-snug">{result.detail}</p>
        </div>
    </div>

);