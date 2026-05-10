"use client";

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

//Main dashboard
export default function ReviewerDashboard() {
    const [activeProject, setActiveProject] = useState<Project>(PROJECTS[0]);
    const [preflight, setPreflight] = useState<PreflightResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState<number | null>(null);
    const [urlInput, setUrlInput] = useState(PROJECTS[0].playable_url);

    const runPreflight = async () => {
        setLoading(true);
        setPreflight(null);
        try {
            const res = await fetch("http://127.0.0.1:8000/api/v1/preflight", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    github_url: activeProject.github_url,
                    playable_url: activeProject.playable_url,
                    birth_year: activeProject.birth_year,
                    target_program: activeProject.target,
                }),
            });
            setPreflight(await res.json());
        } catch { /*Server might be off*/}
    };

    const handleProjectSwitch = (p: Project) => {
        setActiveProject(p);
        setUrlInput(p.playable_url);
        setPreflight(null);
    };

    const handleCopy = (idx: number, text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(idx);
        setTimeout(() => setCopied(null), 1800);
    };

    return (
        <div
            className="h-screen w-full flex overflow-hidden"
            style={{ fontFamily: "'Phantom Sans', system-ui, sans-serif", background: "#ec3750"}}>
                {/* Left Panel */}
                <div className="w-[220px] shrink-0 flex flex-col" style={{ background: "#f9d8de", borderRight: "2px solid #ec3750" }}>
                    {/* Logo */}
                    <div className="p-3 pb-2 flex items-center gap-2 border-b border-[#ec3750]/30">
                        <img 
                            src="https://assets.hackclub.com/flag-orpheus-top.svg"
                            alt="Hack Club"
                            className="h-10 w-auto"
                        />
                        <div>
                            <p className="font-black text-sm text-[#ec3750] leading-none">Velocity</p>
                            <p className="text-[10px] text-[#8492a6] font-bold uppercase tracking-wider leading-none mt-0.5">by Swastik Bajpai</p>
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
                    <p className="px-4 text-[10px] font-black text-[#8492a6] uppercase tracking-widest mb-1">Queue ({PROJECTS.length})</p>

                    {/* Project List */}
                    <div className="flex-1 overflow-y-auto px-3 space-y-1.5 pb-3">
                        {PROJECTS.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => handleProjectSwitch(p)}
                                className={`w-full text-left px-3 py-2 rounded-xl border transition-all ${
                                    activeProject.id === p.id
                                    ? "bg-white border-[#17171d] shadow-sm"
                                    : "bg-transparent border-transparent hover:bg-white/60"
                                }`}>
                                    <div className="flex items-center justify-between mb-0.5">
                                        <p className="font-mono text-xs font-bold text-[#17171d] truncate max-w-[120px]">{p.name}</p>
                                        <StatusDot status={p.status} />
                                    </div>
                                    <span className="text-[9px] bg-[#e0e6ed] text-[#17171d] px-1.5 py-0.5 rounded font-black uppercase tracking-wide">
                                        {p.target}
                                    </span>
                            </button>
                        ))}
                    </div>

                    {/* Touch Grass */}
                    <div className="p-3 border-t border-[#ec3750]/30">
                        <button className="w-full bg-[#33d6a6] hover:bg-[#2bb88e] text-[#17171d] font-black text-xs py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5">
                            <LogOut className="w-3.5 h-3.5" />
                            Touch Grass
                        </button>
                    </div>
                </div>

                {/* Center Panel */}
                <div className="flex-1 flex flex-col p-3 gap-3 min-w-0">
                    {/* URL Bar */}
                    <div className="flex items-center gap-2 bg-[#f9d8de] rounded-xl px-4 py-2 border-2 border-[#17171d]/10">
                        <ExternalLink className="w-4 h-4 text-[#8492a6] shrink-0" />
                        <input
                            className="flex-1 text-sm font-mono text-[#17171d] bg-transparent outline-none truncate"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                        />
                        <a href={urlInput} target="_blank" rel="noreferrer"
                            className="text-xs text-[#ec3750] font-bold hover:underline shrink-0">
                            Open         
                        </a> 
                    </div>

                    {/* Iframe */}
                    <div className="flex-1 bg-[#252429] rounded-2xl overflow-hidden border-2 border-[#17171d]/30 relative">
                        <iframe
                            src={activeProject.playable_url}
                            className="w-full h-full border-none"
                            title="Live Preview"
                            sandbox="allow-scripts allow-same-origin allow-forms"/>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#17171d]/80 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full font-bold pointer-events-none">
                            Demo Screen
                        </div>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="w-[260px] shrink-0 flex flex-col bg-[#f9d8de] border-1-2 border-[#ec3750]">
                    {/* User Dossier */}
                    <div className="m-3 mb-2 bg-[#17171d] text-white rounded-2xl p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#8492a6] mb-2">User Dossier</p>
                        <div className="flex items-center gap-2 mb-1">
                            <Code className="w-4 h-4 text-[#333eda]" />
                            <p className="text-sm font-bold truncate">{activeProject.name.split("/")[0]}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] bg-[#252429] text-[#33d6a6] px-2 py-0.5 rounded-full font-bold uppercase">
                                {activeProject.target}
                            </span>
                            <span className="text-[9px] bg-[#252429] text-[#8492a6] px-2 py-0.5 rounded-full font-bold uppercase">
                                Age: {2026 - activeProject.birth_year}
                            </span>
                        </div>
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
                    <div className="p-3 space-y-2 border-t border-[#ec3750]/30">
                            {!preflight && (
                                <button
                                    onClick={runPreflight}
                                    disabled={loading}
                                    className="w-full bg-[#338eda] hover:bg-[#2670b8] text-white font-black text-xs py-2.5 rounded-xl transititon-all active:scale-95 disabled:opacity-50">
                                        {loading ? "Scanning..." : "Run Preflight Scan"}
                                </button>
                            )}
                            <button className="w-full bg-[#33d6a6] hover:bg-[#2bb88e] text-[#17171d] font-black text-sm py-3 rounded-xl transition-all active:scale-95 shadow">
                                Accept
                            </button>
                            <button className="w-full bg-[#ec3750] hover:bg-[#d024b2] text-white font-black text-sm py-3 rounded-xl transition-all active:scale-95 shadow">
                                Reject
                            </button>
                    </div>
                </div>
            </div>
    );
}