// src/pages/staff/Overview.jsx
import React from "react";
import api from "@/api/api";

/* ===== Endpoint =====
 * GET /Overview/staff-overview?UserId=...
 * Trả về:
 * {
 *   message: "Get successfull",
 *   data: {
 *     stationName: "Trạm Hồ Gươm",
 *     numberOfBat: {
 *       numberOfBatteryFully: 36,
 *       numberOfBatteryCharging: 0,
 *       numberOfBatteryMaintenance: 14,
 *       numberOfBatteryInWarehouse: 16
 *     },
 *     swapInDat: 0,
 *     repostList: [ ... ]
 *   }
 * }
 */

/* ===== Helpers ===== */
// Ép kiểu an toàn cho số
const toInt = (v, d = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
};

// Lấy mảng báo cáo từ cả "repostList" hoặc "reportList" (nếu BE sai chính tả)
const getReportArray = (data) => {
    if (!data) return [];
    if (Array.isArray(data.repostList)) return data.repostList;
    if (Array.isArray(data.reportList)) return data.reportList;
    return [];
};

export default function Overview() {
    // Lấy userId để call API (BE yêu cầu UserId)
    const [userId] = React.useState(() => (localStorage.getItem("userId") || "").trim());

    // State dữ liệu Overview
    const [stationName, setStationName] = React.useState(() => localStorage.getItem("stationName") || "Station");
    const [stats, setStats] = React.useState({
        fully: 0,
        charging: 0,
        maintenance: 0,
        inWarehouse: 0,
        swapsToday: 0,
    });
    const [reports, setReports] = React.useState([]);

    // UI state
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");

    // Gọi API lấy Overview
    const fetchOverview = React.useCallback(async () => {
        if (!userId) {
            setError("Missing userId in localStorage. Please sign in again.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError("");

            const res = await api.get("/Overview/staff-overview", { params: { UserId: userId } });
            const data = res?.data?.data || {};

            // Lưu stationName
            const sn = data.stationName || "Station";
            setStationName(sn);
            // eslint-disable-next-line no-empty
            try { localStorage.setItem("stationName", sn); } catch { }

            // Map số liệu numberOfBat
            const nb = data.numberOfBat || {};
            const nextStats = {
                fully: toInt(nb.numberOfBatteryFully),
                charging: toInt(nb.numberOfBatteryCharging),
                maintenance: toInt(nb.numberOfBatteryMaintenance),
                inWarehouse: toInt(nb.numberOfBatteryInWarehouse),
                swapsToday: toInt(data.swapInDat),
            };
            setStats(nextStats);

            // Lấy danh sách báo cáo (nếu có)
            setReports(getReportArray(data));
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || "Failed to load overview.");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    React.useEffect(() => {
        fetchOverview();
    }, [fetchOverview]);

    return (
        <section className="space-y-6">
            {/* Header: hiển thị Station name trên đầu (nổi bật) */}
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    {/* Chip station */}
                    <span className="inline-block px-3 py-1 rounded-full border bg-white text-xs">
                        {stationName}
                    </span>
                    <h1 className="text-xl font-bold mt-2">Overview</h1>

                    <p className="text-sm text-slate-500">
                        {loading ? "Loading overview…" : "Station health, inventory and reports at a glance."}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={fetchOverview}
                        className="px-3 py-2 rounded-lg border text-sm disabled:opacity-60"
                        disabled={loading}
                        title="Refresh overview"
                    >
                        ↻ Refresh
                    </button>
                </div>
            </header>

            {/* Error */}
            {!!error && (
                <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
                    {error}
                </div>
            )}

            {/* Stats cards */}
            <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* fully */}
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="text-xs text-slate-500">Fully Charged</div>
                    <div className="mt-1 text-2xl font-bold">{stats.fully}</div>
                </div>

                {/* charging */}
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="text-xs text-slate-500">Charging</div>
                    <div className="mt-1 text-2xl font-bold">{stats.charging}</div>
                </div>

                {/* maintenance */}
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="text-xs text-slate-500">Maintenance</div>
                    <div className="mt-1 text-2xl font-bold">{stats.maintenance}</div>
                </div>

                {/* in warehouse */}
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="text-xs text-slate-500">In Warehouse</div>
                    <div className="mt-1 text-2xl font-bold">{stats.inWarehouse}</div>
                </div>

                {/* swaps today (swapInDat) */}
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="text-xs text-slate-500">Swaps Today</div>
                    <div className="mt-1 text-2xl font-bold">{stats.swapsToday}</div>
                </div>
            </section>

            {/* Reports */}
            <section className="rounded-2xl border bg-white shadow-sm">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                    <div className="font-semibold">Recent Reports</div>
                    <div className="text-xs text-slate-500">{reports.length} items</div>
                </div>

                {loading ? (
                    <div className="p-4 text-sm text-slate-500">Loading reports…</div>
                ) : reports.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500">No reports.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-3 py-2 text-left w-16">No</th>
                                    <th className="px-3 py-2 text-left">Driver</th>
                                    {/* <th className="px-3 py-2 text-left">Type</th>  // removed */}
                                    <th className="px-3 py-2 text-left">Note</th>
                                    <th className="px-3 py-2 text-left">Created At</th>
                                    <th className="px-3 py-2 text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map((r, i) => (
                                    <tr key={`${r.staffId || i}-${i}`} className="hover:bg-slate-50">
                                        <td className="px-3 py-2">{i + 1}</td>
                                        <td className="px-3 py-2">{r.driverName || r.driverId || "—"}</td>
                                        {/* <td className="px-3 py-2">{r.reportType || "—"}</td> // removed */}
                                        <td className="px-3 py-2">{r.reportNote || "—"}</td>
                                        <td className="px-3 py-2">
                                            {r.createAt ? new Date(r.createAt).toLocaleString() : "—"}
                                        </td>
                                        <td className="px-3 py-2">{r.reportStatus || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </section>
    );
}