// src/pages/staff/CustomerSupport.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "@/api/api";

const LIST_ENDPOINT = "/Report/customer-reports";
const MARK_STATUS_EP = "/Report/mark-resolve"; // PATCH { reportId, reportStatus }

/* ===== Helpers ===== */
const REPORT_TYPE_LABELS = {
    1: "App issue",
    2: "Battery issue",
    3: "Payment / Fee",
    4: "Station issue",
    5: "Other",
};

function getStatusClass(status) {
    const s = String(status || "").toLowerCase();
    if (s === "processing") return "pill processing";
    if (s === "rejected") return "pill rejected";
    if (s === "done" || s === "resolved" || s === "completed") return "pill success";
    return "pill pending";
}

function formatDateTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function normalizeReport(r, idx) {
    const id = r.reportId ?? r.id ?? idx;
    return {
        id,
        reportId: r.reportId ?? r.id ?? id,
        driverId: r.driverId || "-",
        driverName: r.driverName || "-",
        reportNote: r.reportNote || "",
        reportStatus: r.reportStatus || "Processing",
        reportType: r.reportType,
        createdAt: r.createAt || r.createdAt || null,
    };
}

/* ===== Page ===== */
export default function CustomerSupport() {
    const [userId] = useState(
        localStorage.getItem("StaffId") || localStorage.getItem("userId") || ""
    );
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [updatingIds, setUpdatingIds] = useState(() => new Set());

    async function loadReports() {
        if (!userId) {
            setErr("Missing UserId. Please login again.");
            setReports([]);
            return;
        }
        try {
            setLoading(true);
            setErr("");
            const res = await api.get(LIST_ENDPOINT, { params: { userId } });
            const list = Array.isArray(res?.data?.data)
                ? res.data.data
                : Array.isArray(res?.data)
                    ? res.data
                    : [];
            setReports(list.map(normalizeReport));
        } catch (error) {
            console.error("Load customer reports error", error);
            setErr(error?.response?.data?.message || "Cannot load customer reports. Please try again.");
            setReports([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadReports();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    // Ẩn toàn bộ Rejected
    const visibleReports = useMemo(
        () => reports.filter((r) => String(r.reportStatus || "").toLowerCase() !== "rejected"),
        [reports]
    );

    const openCount = useMemo(
        () => visibleReports.filter((r) => String(r.reportStatus || "").toLowerCase() === "processing").length,
        [visibleReports]
    );

    // Mark Resolved (theo yêu cầu: gửi reportStatus="Rejected" và ẩn khỏi list)
    const handleMarkResolved = async (row) => {
        const reportId = row.reportId ?? row.id;
        if (reportId === undefined || reportId === null) {
            alert("Missing reportId. Please check BE response.");
            return;
        }
        if (updatingIds.has(row.id)) return;

        const ok = window.confirm(`Mark report #${reportId} of ${row.driverName} as Resolved (hide)?`);
        if (!ok) return;

        setUpdatingIds((prev) => {
            const n = new Set(prev);
            n.add(row.id);
            return n;
        });

        try {
            // BE yêu cầu:
            // PATCH /api/Report/mark-resolve
            // { "reportId": 1, "reportStatus": "" }
            // Ở đây set "Rejected" để ẩn
            await api.patch(MARK_STATUS_EP, {
                reportId,
                reportStatus: "Done",
            });

            // Cập nhật local: đổi status sang Rejected rồi filter ẩn
            setReports((prev) =>
                prev
                    .map((r) => (r.id === row.id ? { ...r, reportStatus: "Rejected" } : r))
            );
        } catch (error) {
            console.error("Mark resolve error", error);
            alert(error?.response?.data?.message || "Failed to update report status.");
        } finally {
            setUpdatingIds((prev) => {
                const n = new Set(prev);
                n.delete(row.id);
                return n;
            });
        }
    };

    return (
        <section>
            {/* Header */}
            <div className="cs-header">
                <div>
                    <h2 className="h1">Customer Reports</h2>
                    <p className="muted">Reports created for driver & station issues.</p>
                </div>
                <div className="cs-header-right">
                    <div>
                        User ID: <span className="strong">{userId || "-"}</span>
                    </div>
                    <div>
                        Processing: <span className="strong">{openCount}</span>
                    </div>
                    <div>
                        Total (visible): <span className="strong">{visibleReports.length}</span>
                    </div>
                    <button className="btn btn-light" onClick={loadReports} disabled={loading}>
                        {loading ? "Loading..." : "Reload"}
                    </button>
                </div>
            </div>

            {/* Error */}
            {err && <div className="alert error mt-3">{err}</div>}

            {/* Table */}
            <div className="cs-table-wrap mt-4">
                <table className="cs-table">
                    <thead>
                        <tr>
                            <th>Report ID</th>
                            <th>Driver ID</th>
                            <th>Customer</th>
                            <th>Description</th>
                            <th>Type</th>
                            <th>Created At</th>
                            <th>Status</th>
                            <th style={{ minWidth: 140 }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan={8} className="muted t-center">
                                    Loading reports...
                                </td>
                            </tr>
                        )}

                        {!loading && !err && visibleReports.length === 0 && (
                            <tr>
                                <td colSpan={8} className="muted t-center">
                                    No reports to display.
                                </td>
                            </tr>
                        )}

                        {!loading &&
                            !err &&
                            visibleReports.map((r) => {
                                const status = r.reportStatus || "Processing";
                                const statusClass = getStatusClass(status);
                                const typeLabel =
                                    REPORT_TYPE_LABELS[r.reportType] || `Type #${r.reportType ?? "-"}`;
                                const updating = updatingIds.has(r.id);
                                const canMark = String(status).toLowerCase() === "processing";

                                return (
                                    <tr key={r.id}>
                                        <td>{r.reportId}</td>
                                        <td>{r.driverId}</td>
                                        <td>{r.driverName}</td>
                                        <td className="cs-note" title={r.reportNote}>
                                            {r.reportNote || "—"}
                                        </td>
                                        <td>{typeLabel}</td>
                                        <td>{formatDateTime(r.createdAt)}</td>
                                        <td>
                                            <span className={statusClass}>{status}</span>
                                        </td>
                                        <td>
                                            {canMark ? (
                                                <button
                                                    className="btn btn-reject"
                                                    onClick={() => handleMarkResolved(r)}
                                                    disabled={updating}
                                                >
                                                    {updating ? "Updating..." : "Mark Resolved"}
                                                </button>
                                            ) : (
                                                <span className="muted">—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                    </tbody>
                </table>
            </div>

            {/* Styles */}
            <style>{`
        .cs-header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; }
        .cs-header-right { display:flex; gap:10px; align-items:center; font-size:12px; color:#6b7280; }
        .strong { font-weight:600; color:#111827; }
        .mt-3 { margin-top:12px; }
        .mt-4 { margin-top:16px; }
        .t-center { text-align:center; }

        .cs-table-wrap { background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; padding:4px; box-shadow:0 4px 14px rgba(15,23,42,0.03); overflow-x:auto; }
        .cs-table { width:100%; border-collapse:collapse; font-size:13px; }
        .cs-table th, .cs-table td { padding:10px 14px; border-bottom:1px solid #f3f4f6; text-align:left; vertical-align:middle; }
        .cs-table th { font-size:13px; font-weight:700; color:#111827; background:#f9fafb; white-space:nowrap; }
        .cs-table tbody tr:hover { background:#f8fafc; }
        .cs-table tr:last-child td { border-bottom:none; }
        .cs-note { max-width:320px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

        .btn { padding:6px 12px; border-radius:999px; border:1px solid #e5e7eb; font-size:11px; cursor:pointer; background:#ffffff; }
        .btn-light { background:#f9fafb; }
        .btn-reject { border-color:#111827; background:#f3f4f6; color:#111827; font-weight:600; }
        .btn[disabled] { opacity:.6; cursor:not-allowed; }

        .pill { display:inline-flex; align-items:center; padding:3px 9px; border-radius:999px; font-size:10px; font-weight:600; border:1px solid transparent; }
        .pill.processing { background:#eff6ff; border-color:#bfdbfe; color:#1d4ed8; }
        .pill.success { background:#ecfdf5; border-color:#bbf7d0; color:#15803d; }
        .pill.pending { background:#fef9c3; border-color:#fde68a; color:#92400e; }
        .pill.rejected { background:#fef2f2; border-color:#fecaca; color:#b91c1c; }

        .alert.error { padding:10px 14px; border-radius:10px; border:1px solid #fecaca; background:#fef2f2; color:#991b1b; font-size:12px; }
      `}</style>
        </section>
    );
}
