/* eslint-disable react-hooks/rules-of-hooks */
// src/pages/user/Support.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "@/api/api";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

/** Tiny helpers */
function StatusPill({ status = "Pending" }) {
    const s = String(status).toLowerCase();
    const tone = /success|resolved|done/.test(s)
        ? "success"
        : /cancel|fail|denied|reject/.test(s)
            ? "danger"
            : "warn";
    const map = {
        success: "bg-emerald-50 text-emerald-700 border-emerald-200",
        warn: "bg-amber-50 text-amber-700 border-amber-200",
        danger: "bg-rose-50 text-rose-700 border-rose-200",
    };
    const icon =
        tone === "success" ? "check-circle" : tone === "danger" ? "x-circle" : "hourglass-split";
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${map[tone]}`}>
            <i className={`bi bi-${icon}`} />
            {status}
        </span>
    );
}

function EmptyCard({ title, subtitle, action }) {
    return (
        <div className="border rounded-2xl p-6 text-center bg-white">
            <div className="h-12 w-12 mx-auto rounded-xl bg-blue-600/10 text-blue-600 grid place-items-center mb-3">
                <i className="bi bi-life-preserver" />
            </div>
            <p className="font-semibold text-gray-900">{title}</p>
            <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
            {action}
        </div>
    );
}

export default function Support() {
    const [reportTypes, setReportTypes] = useState([]);
    const [selectedType, setSelectedType] = useState("");
    const [reportNote, setReportNote] = useState("");
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // “Recent reports” (client-side cache to avoid trống)
    const [recent, setRecent] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("recent_reports") || "[]");
        } catch {
            return [];
        }
    });

    const MAX_LEN = 300;
    const leftChars = useMemo(() => Math.max(0, MAX_LEN - reportNote.length), [reportNote]);

    useEffect(() => {
        const fetchReportTypes = async () => {
            try {
                const res = await api.get("/Report/get-driver-report-list");
                setReportTypes(res.data?.data || []);
            } catch {
                setMessage("❌ Failed to load report types.");
            } finally {
                setLoading(false);
            }
        };
        fetchReportTypes();
    }, []);

    const quickIssues = [
        { label: "Payment / Billing", hint: "Double-charged / refund" },
        { label: "Battery Swap Issue", hint: "Slot stuck / wrong slot" },
        { label: "Login Problem", hint: "Cannot sign in" },
        { label: "Technical Support", hint: "App glitch" },
    ];

    const useQuick = (label) => {
        const rt = reportTypes.find((t) =>
            String(t.reportType || "").toLowerCase().includes(label.toLowerCase())
        );
        if (rt) setSelectedType(String(rt.reportTypeId));
        setReportNote((v) =>
            v
                ? v
                : `Describe your ${label.toLowerCase()} here (time, station, subscription, steps)…`
        );
    };

    const handleSubmit = async () => {
        if (!selectedType) return alert("⚠️ Please select report type!");
        if (!reportNote.trim()) return alert("⚠️ Please enter report details!");
        const driverId = localStorage.getItem("userId");
        if (!driverId) return alert("⚠️ Please log in first!");

        const payload = {
            driverId,
            reportTypeId: parseInt(selectedType, 10),
            reportNote: reportNote.trim(),
        };

        try {
            setSubmitting(true);
            await api.post("/Report/Driver-create-report", payload);
            setMessage("✅ Report sent successfully!");

            // Push into “recent” (so UI never looks trống)
            const rt = reportTypes.find((x) => String(x.reportTypeId) === String(selectedType));
            const item = {
                id: Date.now().toString(36),
                type: rt?.reportType || "Report",
                note: reportNote.trim(),
                status: "Pending",
                createdAt: new Date().toISOString(),
            };
            const next = [item, ...recent].slice(0, 6);
            setRecent(next);
            localStorage.setItem("recent_reports", JSON.stringify(next));

            setReportNote("");
            setSelectedType("");
            setTimeout(() => setMessage(""), 2500);
        } catch {
            setMessage("❌ Failed to send report.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white grid place-items-center">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 animate-spin border-4 border-blue-600 border-t-transparent rounded-full" />
                    <span className="text-gray-600">Loading support center…</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen">
            <div className="max-w-6xl mx-auto px-4 md:px-6 py-10">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-600 text-white grid place-items-center shadow">
                            <i className="bi bi-life-preserver text-lg" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    Support Center
                                </span>
                            </h2>
                            <p className="text-gray-500 text-sm">Report problems & track responses</p>
                        </div>
                    </div>
                    <span className="text-xs text-gray-500">Last update: {new Date().toLocaleTimeString()}</span>
                </div>

                {/* Layout: Form + Right rail */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* FORM */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="lg:col-span-2 bg-white border rounded-2xl shadow-sm p-6"
                    >
                        {message && (
                            <div
                                className={`mb-4 rounded-xl px-3 py-2 text-sm font-medium ${message.startsWith("✅")
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                    }`}
                            >
                                {message}
                            </div>
                        )}

                        {/* Quick chips */}
                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-2">Quick pick</p>
                            <div className="flex flex-wrap gap-2">
                                {quickIssues.map((q) => (
                                    <button
                                        key={q.label}
                                        onClick={() => useQuick(q.label)}
                                        className="px-3 py-1.5 rounded-full text-sm border bg-white hover:bg-blue-50 text-blue-700 border-blue-200"
                                        title={q.hint}
                                    >
                                        <i className="bi bi-lightning-charge me-1" />
                                        {q.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Type */}
                        <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                        <div className="relative mb-4">
                            <i className="bi bi-ui-checks-grid absolute left-3 top-2.5 text-blue-500/70" />
                            <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                            >
                                <option value="">Choose type</option>
                                {reportTypes.map((r) => (
                                    <option key={r.reportTypeId} value={r.reportTypeId}>
                                        {r.reportType}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Detail */}
                        <label className="block text-sm font-medium text-gray-700 mb-1">Report Detail</label>
                        <div className="relative">
                            <textarea
                                rows={6}
                                value={reportNote}
                                onChange={(e) => setReportNote(e.target.value.slice(0, MAX_LEN))}
                                className="w-full px-3 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y"
                                placeholder="Describe your issue (time, station ID, subscription, steps to reproduce, any error text)…"
                            />
                            <div className="mt-1 flex items-center justify-between text-xs">
                                <span className="text-gray-500">Attach exact error text if available.</span>
                                <span
                                    className={`px-2 py-0.5 rounded-full border ${leftChars <= 20
                                        ? "bg-amber-50 border-amber-200 text-amber-700"
                                        : "bg-blue-50 border-blue-200 text-blue-700"
                                        }`}
                                >
                                    {leftChars} / {MAX_LEN}
                                </span>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className={`w-full mt-6 py-2.5 rounded-xl text-white font-semibold transition ${submitting ? "bg-blue-400 cursor-not-allowed" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95"
                                }`}
                        >
                            <span className="inline-flex items-center gap-2">
                                {submitting ? (
                                    <>
                                        <span className="h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full inline-block animate-spin" />
                                        Sending…
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-send" />
                                        Send Report
                                    </>
                                )}
                            </span>
                        </button>

                        {/* Helpful tips */}
                        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-gray-700">
                            <div className="font-medium text-gray-900 mb-1">Help us resolve faster</div>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Include Station ID & time of issue.</li>
                                <li>Mention Subscription ID for billing/swap cases.</li>
                                <li>Any screenshots or VNPAY number help a lot.</li>
                            </ul>
                        </div>
                    </motion.div>

                    {/* RIGHT RAIL: Recent + FAQ so page không “trống trơn” */}
                    <div className="space-y-6">
                        {/* Recent reports */}
                        <div className="bg-white border rounded-2xl shadow-sm p-6">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-gray-900">Recent reports</h3>
                                {recent.length > 0 && (
                                    <button
                                        className="text-xs text-blue-700 hover:underline"
                                        onClick={() => {
                                            localStorage.removeItem("recent_reports");
                                            setRecent([]);
                                        }}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            {recent.length === 0 ? (
                                <EmptyCard
                                    title="No recent reports"
                                    subtitle="After you submit, they will appear here."
                                    action={
                                        <div className="mt-3">
                                            <button
                                                className="px-3 py-1.5 rounded-full text-sm border bg-white hover:bg-blue-50 text-blue-700 border-blue-200"
                                                onClick={() => useQuick("Payment / Billing")}
                                            >
                                                Try a sample report
                                            </button>
                                        </div>
                                    }
                                />
                            ) : (
                                <ul className="space-y-3">
                                    {recent.map((r) => (
                                        <li key={r.id} className="border rounded-xl p-3 bg-white">
                                            <div className="flex items-center justify-between">
                                                <div className="font-medium text-gray-900">{r.type}</div>
                                                <StatusPill status={r.status} />
                                            </div>
                                            <p className="text-sm text-gray-700 mt-1 line-clamp-3">{r.note}</p>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {new Date(r.createdAt).toLocaleString()}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* FAQ mini accordion */}
                        <div className="bg-white border rounded-2xl shadow-sm p-6">
                            <h3 className="font-semibold text-gray-900 mb-2">Quick FAQ</h3>
                            <details className="group border-b py-2">
                                <summary className="cursor-pointer text-sm text-gray-800 flex items-center justify-between">
                                    How long does it take to get a reply?
                                    <i className="bi bi-chevron-down text-gray-500 group-open:rotate-180 transition" />
                                </summary>
                                <p className="text-sm text-gray-600 mt-1">
                                    Most reports receive a response within 24 hours on business days.
                                </p>
                            </details>
                            <details className="group border-b py-2">
                                <summary className="cursor-pointer text-sm text-gray-800 flex items-center justify-between">
                                    What info is needed for billing issues?
                                    <i className="bi bi-chevron-down text-gray-500 group-open:rotate-180 transition" />
                                </summary>
                                <p className="text-sm text-gray-600 mt-1">
                                    Please include your Subscription ID and the VNPAY transaction number.
                                </p>
                            </details>
                            <details className="group py-2">
                                <summary className="cursor-pointer text-sm text-gray-800 flex items-center justify-between">
                                    Slot stuck during swap—what to do?
                                    <i className="bi bi-chevron-down text-gray-500 group-open:rotate-180 transition" />
                                </summary>
                                <p className="text-sm text-gray-600 mt-1">
                                    Note the station & pillar, time, and the slot ID shown in the app. Submit a report and our staff will assist.
                                </p>
                            </details>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}