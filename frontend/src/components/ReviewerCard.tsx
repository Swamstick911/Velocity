"use client";

import { useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, ExternalLink, Code } from "lucide-react";

//This defines the shape of the data we get from our FastAPI backend
interface PreflightResponse {
    overall_passed: boolean;
    birth_year_check: { passed: boolean; detail: string };
    playable_url_check: { passed: boolean; detail: string };
    readme_check: { passed: boolean; detail: string };
    anti_fraud_check: { passed: boolean; detail: string };
    flags: string[];
}

export default function ReviewerCard() {
    const [data, setData] = useState<PreflightResponse | null>(null);
    const [loading, setLoading] = useState(false);

    //Hardcoded for testing- later we'll pull this from a queue
    const testPayload = {
        github_url: "https://github.com/hackclub/sprig",
        playable_url: "https://sprig.hackclub.com",
        birth_year: 2008,
        target_program: "Blot",
    };

    const runPreflight = async () => {
        setLoading(true);
        try {
            const response = await fetch("http://127.0.0.1:8000/api/v1/preflight", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(testPayload),
            });
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error("Failed to fetch preflight data", error);
        }
        setLoading(false);
    };

    const StatusIcon = ({ passed }: { passed: boolean }) =>
        passed ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
            <XCircle className="w-5 h-5 text-red-500" />
        );

    return (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="bg-gray-900 p-4 text-white">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Code className="w-5 h-5" /> hackclub/sprig
                </h2>
                <div className="flex gap-4 mt-2 text-sm text-gray-300">
                    <a href={testPayload.playable_url} target="_blank" className="flex items-center gap-1 hover:text-white transition">
                        <ExternalLink className="w-4 h-4" /> Play Demo
                    </a>
                    <span className="bg-gray-700 px-2 py-0.5 rounded text-xs font-mono">
                        Target: {testPayload.target_program}
                    </span>
                </div>
            </div>

            {/* Action Button */}
            <div className="p-4 border-b border-gray-100">
                <button
                    onClick={runPreflight}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50">
                        {loading ? "Running AI checks..." : "Run Pre-flight Scan"}
                </button>
            </div>

            {/* Results Section */}
            {data && (
                <div className="p-4 space-y-4">
                    <div className={`p-3 rounded-lg border ${data.overall_passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <p className={`font-bold ${data.overall_passed ? 'text-green-800' : 'text-red-800'}`}>
                            Status: {data.overall_passed ? "Ready for Review" : "Requires Investigation"}
                        </p>
                    </div>
                    <div className="space-y-3 text-sm text-gray-700">
                        <div className="flex items-start gap-3">
                            <StatusIcon passed={data.playable_url_check.passed} />
                            <p>{data.playable_url_check.detail}</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <StatusIcon passed={data.readme_check.passed} />
                            <p>{data.readme_check.detail}</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <StatusIcon passed={data.birth_year_check.passed} />
                            <p className="font-semibold">{data.anti_fraud_check.detail}</p>
                        </div>
                    </div>

                    {/* Warnings/Flags */}
                    {data.flags.length > 0 && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <h3 className="font-bold text-yellow-800 flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4" /> Fraud Warnings
                            </h3>
                            <ul className="list-disc pl-5 text-sm text-yellow-900 space-y-1">
                                {data.flags.map((flag, i) => (
                                    <li key={i}>{flag}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}