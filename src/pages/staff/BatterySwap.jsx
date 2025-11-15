/* eslint-disable no-unused-vars */
// src/pages/staff/BatterySwap.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "@/api/api"; // axios instance (already has baseURL)

const ROUTE = "/BatterySwap/staff-view-battery-swap";

// --- helpers ---
const isNullishStr = (v) =>
    v == null ||
    String(v).trim().toLowerCase() === "null" ||
    String(v).trim() === "";

const valOrDash = (v) => (isNullishStr(v) ? "—" : v);

function normalizeList(payload) {
    const raw = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
            ? payload
            : [];
    return raw.map((r, i) => ({
        // BE sample had "staffId": "SUB-83793747" which is actually the ID shown in the table
        id: r.staffId ?? r.id ?? `ROW-${i + 1}`,
        userId: r.userId ?? "",
        userName: r.userName ?? "",
        batteryIn: isNullishStr(r.batteryIdIn) ? null : r.batteryIdIn,
        batteryOut: isNullishStr(r.batteryIdOut) ? null : r.batteryIdOut,
        status: r.status ?? "",
        time: r.time ?? "", // "08:00:00"
    }));
}

function formatTime12h(hms) {
    if (!hms || typeof hms !== "string") return "—";
    const [h = "0", m = "0", s = "0"] = hms.split(":");
    let hh = parseInt(h, 10);
    if (Number.isNaN(hh)) return hms;
    const ampm = hh >= 12 ? "PM" : "AM";
    hh = hh % 12 || 12;
    return `${String(hh).padStart(2, "0")}:${String(
        parseInt(m, 10)
    ).padStart(2, "0")}${ampm}`;
}

function StatusBadge({ status }) {
    const s = String(status || "").toLowerCase();
    let bg = "#e2e8f0",
        fg = "#0f172a",
        label = status || "—";
    if (s === "using") {
        bg = "rgba(59,130,246,.12)";
        fg = "#1d4ed8";
    } else if (s === "returned") {
        bg = "rgba(16,185,129,.12)";
        fg = "#065f46";
    } else if (s === "failed" || s === "fail" || s === "error") {
        bg = "rgba(239,68,68,.12)";
        fg = "#b91c1c";
    }
    return (
        <span
            className="swap-badge"
            style={{ background: bg, color: fg, borderColor: fg }}
        >
            {label}
        </span>
    );
}

export default function BatterySwap() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");
    const [search, setSearch] = useState("");
    const [sortDir, setSortDir] = useState("asc"); // asc | desc

    // UserId FE must send
    const userId = (localStorage.getItem("userId") || "").trim();

    const collator = useMemo(
        () =>
            new Intl.Collator(undefined, {
                numeric: true,
                sensitivity: "base",
            }),
        []
    );

    const fetchData = async () => {
        try {
            if (!userId) {
                setErr("Missing userId in localStorage. Please sign in again.");
                setRows([]);
                setLoading(false);
                return;
            }
            setErr("");
            setLoading(true);
            const res = await api.get(ROUTE, { params: { UserId: userId } });
            const list = normalizeList(res.data);
            setRows(list);
        } catch (e) {
            console.error("Load swaps failed:", e);
            setErr(
                e?.response?.data?.message ||
                e?.message ||
                "Failed to load battery swap history."
            );
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(
            (r) =>
                (r.id || "").toLowerCase().includes(q) ||
                (r.userName || "").toLowerCase().includes(q) ||
                (r.batteryIn || "").toLowerCase().includes(q) ||
                (r.batteryOut || "").toLowerCase().includes(q)
        );
    }, [rows, search]);

    const sorted = useMemo(() => {
        const arr = [...filtered].sort((a, b) => collator.compare(a.id, b.id));
        return sortDir === "desc" ? arr.reverse() : arr;
    }, [filtered, sortDir, collator]);

    return (
        <section>
            {/* Header */}
            <div className="row-between">
                <div>
                    <h2 className="h1 m-0">Battery Swap</h2>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        className="swap-input"
                        placeholder="Search ID / name / pin in / pin out…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button
                        className="swap-btn"
                        onClick={fetchData}
                        disabled={loading}
                    >
                        ↻ {loading ? "Loading..." : "Refresh"}
                    </button>
                </div>
            </div>

            {/* Error */}
            {!!err && (
                <div className="card card-padded mt-3 error">⚠️ {err}</div>
            )}

            {/* Table */}
            <div className="card mt-4 overflow-auto">
                <table className="swap-table">
                    <thead className="bg-slate-50">
                        <tr>
                            <th
                                className="px-4 py-3 text-left cursor-pointer select-none"
                                onClick={() =>
                                    setSortDir((d) =>
                                        d === "asc" ? "desc" : "asc"
                                    )
                                }
                                title="Sort by ID"
                            >
                                ID {sortDir === "asc" ? "▲" : "▼"}
                            </th>
                            <th className="px-4 py-3 text-left">Customer</th>
                            <th className="px-4 py-3 text-left">
                                Battery in / out
                            </th>
                            <th className="px-4 py-3 text-left">Time</th>
                            <th className="px-4 py-3 text-left">Status</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td
                                    className="px-4 py-4 text-slate-500"
                                    colSpan={5}
                                >
                                    Loading…
                                </td>
                            </tr>
                        ) : sorted.length === 0 ? (
                            <tr>
                                <td
                                    className="px-4 py-6 text-slate-500"
                                    colSpan={5}
                                >
                                    No records.
                                </td>
                            </tr>
                        ) : (
                            sorted.map((r, idx) => (
                                <tr
                                    key={`${r.id}-${r.userId}-${r.time}-${idx}`}
                                    className="border-t hover:bg-slate-50/60"
                                >
                                    <td className="px-4 py-3 font-semibold">
                                        {r.id}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium">
                                            {r.userName || "—"}
                                        </div>
                                        <div className="muted small">
                                            {r.userId || ""}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div>
                                            In:{" "}
                                            <b>{valOrDash(r.batteryIn)}</b>
                                        </div>
                                        <div>
                                            Out:{" "}
                                            <b>{valOrDash(r.batteryOut)}</b>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {formatTime12h(r.time)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={r.status} />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Local styles (scoped) */}
            <style>{`
        .row-between{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;}
        .m-0{margin:0;}
        .h1{font-size:22px;font-weight:800;}
        .muted{color:var(--muted);}
        .small{font-size:12px;}
        .card{border:1px solid var(--line);border-radius:14px;background:#fff;}
        .card-padded{padding:14px 16px;}
        .error{color:#991b1b;background:#fee2e2;border-color:#fecaca;}

        .swap-input{
          height:36px;border:1px solid var(--line);border-radius:10px;padding:0 10px;background:#fff;
          min-width:260px;
        }
        .swap-btn{
          height:36px;border:1px solid var(--line);border-radius:10px;padding:0 12px;background:#fff;
        }
        .swap-btn.ghost:hover{background:#f8fafc;}

        .swap-table{width:100%;border-collapse:separate;border-spacing:0;}
        .swap-table th{font-weight:700;color:#0f172a;border-bottom:1px solid var(--line);}
        .swap-table td{vertical-align:top;}

        .swap-badge{
          display:inline-block;font-size:12px;font-weight:700;padding:2px 8px;border:1px solid;border-radius:999px;
        }
      `}</style>
        </section>
    );
}