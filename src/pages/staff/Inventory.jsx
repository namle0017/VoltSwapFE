// src/pages/staff/Inventory.jsx
// ===================
// UI: English
// Comment: Tiếng Việt
// Yêu cầu:
// - Chỉ hiển thị 20 pin đầu; có nút "View more" để xem toàn bộ (và "View less" để thu về).
// - Sắp xếp: Pin thường lên trước, Maintenance xuống dưới; trong nhóm sort theo SOC ↓, SOH ↓, ID ↑.
// - API: GET /Station/station-inventory?staffId=...
// - Search theo Battery ID (lọc theo id, không phân biệt hoa/thường).
// ===================

import React from "react";
import api from "@/api/api";

/* ===== Helpers ===== */
// Ép SOC/SOH về 0..100 (làm tròn)
function clamp01(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    const r = Math.round(x);
    return Math.max(0, Math.min(100, r));
}

// BE đôi khi viết sai chính tả "mantaince" → vẫn coi là maintenance
function isMaintenance(item) {
    const a = (item?.status || "").toLowerCase();
    const b = (item?.batteryStatus || "").toLowerCase();
    return (
        a === "maintenance" ||
        b === "maintenance" ||
        a === "mantaince" ||
        b === "mantaince"
    );
}

// Tone màu cho thẻ theo trạng thái
function statusTone(item) {
    if (isMaintenance(item)) {
        return {
            bg: "rgba(239,68,68,.10)",
            fg: "#991b1b",
            br: "#ef4444",
            label: "Maintenance",
        };
    }
    return {
        bg: "rgba(16,185,129,.10)",
        fg: "#047857",
        br: "#10b981",
        label: item?.status || "Normal",
    };
}

// Chuẩn hoá 1 bản ghi pin về shape dùng cho UI
function mapBattery(it) {
    return {
        id: it.batteryId || it.id || "",
        soh: clamp01(it.soh),
        soc: clamp01(it.soc),
        capacityKWh: Number(it.capacity ?? it.capacityKWh ?? 0),
        status: it.status || it.batteryStatus || "Normal",
        batteryStatus: it.batteryStatus,
        stationId: it.stationId,
    };
}

// Sort: pin thường trước, Maintenance sau; SOC desc → SOH desc → ID asc
function compareBattery(a, b) {
    const aMaint = isMaintenance(a) ? 1 : 0;
    const bMaint = isMaintenance(b) ? 1 : 0;
    if (aMaint !== bMaint) return aMaint - bMaint;
    if ((b.soc ?? 0) !== (a.soc ?? 0)) return (b.soc ?? 0) - (a.soc ?? 0);
    if ((b.soh ?? 0) !== (a.soh ?? 0)) return (b.soh ?? 0) - (a.soh ?? 0);
    return String(a.id).localeCompare(String(b.id));
}

const PAGE_SIZE = 20;

export default function Inventory() {
    // StaffId gửi cho BE
    const staffId =
        localStorage.getItem("StaffId") ||
        localStorage.getItem("staffId") ||
        localStorage.getItem("userId") ||
        "";

    const [list, setList] = React.useState([]); // toàn bộ pin đã sort
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");

    // Tên trạm nếu BE có trả
    const [stationName, setStationName] = React.useState(
        localStorage.getItem("stationName") || "Station"
    );

    // Modal Battery detail
    const [openSlot, setOpenSlot] = React.useState(null);

    // View more / less
    const [limit, setLimit] = React.useState(PAGE_SIZE);

    // Search theo Battery ID
    const [query, setQuery] = React.useState("");

    // Fetch inventory
    const fetchInventory = React.useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            setLimit(PAGE_SIZE); // reset về 20 mỗi lần refresh

            if (!staffId) {
                setError(
                    "Missing staffId in localStorage. Please sign in again."
                );
                setList([]);
                return;
            }

            const res = await api.get("/Station/station-inventory", {
                params: { staffId },
            });

            const payload = Array.isArray(res.data)
                ? res.data
                : res.data?.data || [];

            const mapped = payload.map(mapBattery).sort(compareBattery);
            setList(mapped);

            const stName =
                res.data?.stationName ||
                res.data?.data?.stationName ||
                payload?.[0]?.stationName;
            if (stName) setStationName(stName);
        } catch (e) {
            console.error(e);
            setError(
                e?.response?.data?.message ||
                e?.message ||
                "Failed to load station inventory."
            );
            setList([]);
        } finally {
            setLoading(false);
        }
    }, [staffId]);

    React.useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    // Đổi search → thu về 20
    React.useEffect(() => {
        setLimit(PAGE_SIZE);
    }, [query]);

    // Lọc theo Battery ID (case-insensitive)
    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return list;
        return list.filter((b) =>
            String(b.id || "").toLowerCase().includes(q)
        );
    }, [list, query]);

    // Danh sách hiển thị
    const visible = loading
        ? []
        : filtered.slice(0, Math.min(limit, filtered.length));
    const canViewMore = !loading && limit < filtered.length;
    const canViewLess = !loading && limit > PAGE_SIZE;

    return (
        <section className="inventory-page">
            {/* Header */}
            <header className="row-between header">
                <div className="header-left">
                    <div className="chip">Station inventory</div>
                    <h2 className="title">{stationName}</h2>
                    {!loading && (
                        <div className="subtitle">
                            Showing{" "}
                            <strong>{visible.length}</strong> of{" "}
                            <strong>{filtered.length}</strong>{" "}
                            {query ? "matches" : "batteries"}
                            {query && (
                                <>
                                    {" "}
                                    (total <strong>{list.length}</strong>)
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="header-actions">
                    {/* Search by Battery ID */}
                    <div className="search">
                        <i className="bi bi-search" aria-hidden="true" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by Battery ID"
                            aria-label="Search by Battery ID"
                        />
                        {query && (
                            <button
                                type="button"
                                className="clear-btn"
                                onClick={() => setQuery("")}
                                aria-label="Clear search"
                            >
                                <i className="bi bi-x-lg" />
                            </button>
                        )}
                    </div>

                    <button
                        className="btn refresh-btn"
                        onClick={fetchInventory}
                        disabled={loading}
                    >
                        <i className="bi bi-arrow-clockwise" />
                        <span>{loading ? "Loading..." : "Refresh"}</span>
                    </button>
                </div>
            </header>

            {/* Error */}
            {error && (
                <div className="alert error">
                    <i className="bi bi-exclamation-triangle-fill" />
                    <span>{error}</span>
                </div>
            )}

            {/* Grid Batteries */}
            <section className="card">
                <div className="row-between card-head">
                    <h3 className="card-title">Batteries</h3>
                    <div className="legend">
                        <span className="legend-item">
                            <span className="dot normal" />
                            Normal
                        </span>
                        <span className="legend-item">
                            <span className="dot maint" />
                            Maintenance
                        </span>
                    </div>
                </div>

                {!loading && filtered.length === 0 ? (
                    <div className="empty">
                        No batteries found
                        {query ? " for this search." : "."}
                    </div>
                ) : (
                    <div
                        className="slots-grid"
                        role="grid"
                        aria-label="Station batteries"
                    >
                        {(loading
                            ? Array.from({ length: PAGE_SIZE })
                            : visible
                        ).map((b, i) => {
                            if (loading)
                                return (
                                    <div
                                        key={i}
                                        className="slot-card skeleton"
                                    />
                                );

                            const tone = statusTone(b);
                            const pct = clamp01(b.soc);

                            return (
                                <button
                                    key={b.id || i}
                                    role="gridcell"
                                    className="slot-card"
                                    onClick={() => setOpenSlot({ battery: b })}
                                    aria-label={
                                        b.id
                                            ? `Battery ${b.id}, SOC ${pct}%`
                                            : "Battery"
                                    }
                                >
                                    <div className="slot-top">
                                        <span
                                            className="status-badge"
                                            style={{
                                                backgroundColor: tone.bg,
                                                color: tone.fg,
                                                borderColor: tone.br,
                                            }}
                                        >
                                            {tone.label}
                                        </span>
                                    </div>

                                    <div className="slot-body">
                                        <div className="slot-id">
                                            {b.id || "—"}
                                        </div>

                                        <div className="kv">
                                            <span>SOH</span>
                                            <strong>
                                                {clamp01(b.soh)}
                                                %
                                            </strong>
                                        </div>
                                        <div className="kv">
                                            <span>SOC</span>
                                            <strong>{pct}%</strong>
                                        </div>

                                        <div
                                            className="socbar"
                                            title={`SOC ${pct}%`}
                                        >
                                            <span
                                                className="socbar-fill"
                                                style={{
                                                    width: `${pct}%`,
                                                    backgroundColor: tone.br,
                                                }}
                                            />
                                        </div>

                                        <div className="kv">
                                            <span>Capacity</span>
                                            <strong>
                                                {b.capacityKWh
                                                    ? `${b.capacityKWh} kWh`
                                                    : "—"}
                                            </strong>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* View more / View less */}
                {!loading && filtered.length > 0 && (
                    <div className="view-controls">
                        {canViewMore && (
                            <button
                                className="btn ghost"
                                onClick={() =>
                                    setLimit(filtered.length)
                                }
                            >
                                View more
                            </button>
                        )}
                        {canViewLess && (
                            <button
                                className="btn ghost"
                                onClick={() => setLimit(PAGE_SIZE)}
                            >
                                View less
                            </button>
                        )}
                    </div>
                )}
            </section>

            {/* Battery detail modal */}
            {openSlot && (
                <div
                    className="overlay"
                    onClick={() => setOpenSlot(null)}
                >
                    <div
                        className="modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-head">
                            <h4>Battery detail</h4>
                            <button
                                className="icon-btn"
                                onClick={() => setOpenSlot(null)}
                                aria-label="Close"
                            >
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="info-grid">
                                <div className="info-card">
                                    <div className="label">
                                        Battery ID
                                    </div>
                                    <div className="value strong">
                                        {openSlot.battery?.id ||
                                            "—"}
                                    </div>
                                </div>
                                <div className="info-card">
                                    <div className="label">SOH</div>
                                    <div className="value strong">
                                        {clamp01(
                                            openSlot.battery?.soh
                                        )}
                                        %
                                    </div>
                                </div>
                                <div className="info-card">
                                    <div className="label">SOC</div>
                                    <div className="value strong">
                                        {clamp01(
                                            openSlot.battery?.soc
                                        )}
                                        %
                                    </div>
                                </div>
                                <div className="info-card">
                                    <div className="label">
                                        Capacity
                                    </div>
                                    <div className="value strong">
                                        {openSlot.battery?.capacityKWh
                                            ? `${openSlot.battery.capacityKWh} kWh`
                                            : "—"}
                                    </div>
                                </div>
                                <div className="info-card wide">
                                    <div className="label">
                                        Status
                                    </div>
                                    <div className="value strong">
                                        {isMaintenance(
                                            openSlot.battery
                                        )
                                            ? "Maintenance"
                                            : openSlot.battery
                                                ?.status ||
                                            "Normal"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-foot">
                            <button
                                className="btn ghost"
                                onClick={() => setOpenSlot(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Styles cục bộ */}
            <style>{`
                .inventory-page {
                    --line: #e2e8f0;
                    --muted: #6b7280;
                    --bg-soft: #f9fafb;
                    --purple: #4b1fa6;
                    color: #0f172a;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .row-between {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 16px;
                }

                .header {
                    margin-bottom: 4px;
                }

                .chip {
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 12px;
                    border-radius: 999px;
                    font-size: 11px;
                    font-weight: 600;
                    color: #3730a3;
                    background: #eef2ff;
                    border: 1px solid #c7d2fe;
                    margin-bottom: 4px;
                }

                .title {
                    margin: 0;
                    font-size: 22px;
                    font-weight: 700;
                }

                .subtitle {
                    margin-top: 2px;
                    font-size: 13px;
                    color: var(--muted);
                }

                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                /* Search box */
                .search {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 0 10px;
                    height: 36px;
                    border-radius: 10px;
                    border: 1px solid var(--line);
                    background: #ffffff;
                    box-shadow: 0 1px 2px rgba(15,23,42,0.04);
                }

                .search i {
                    font-size: 14px;
                    color: var(--muted);
                }

                .search input {
                    border: none;
                    outline: none;
                    font-size: 13px;
                    color: #111827;
                    background: transparent;
                    min-width: 200px;
                }

                .clear-btn {
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 22px;
                    height: 22px;
                    border-radius: 999px;
                    color: var(--muted);
                }

                .clear-btn:hover {
                    background: #f3f4f6;
                }

                .btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 0 12px;
                    height: 36px;
                    border-radius: 10px;
                    border: 1px solid var(--line);
                    background: #ffffff;
                    font-size: 13px;
                    color: #111827;
                    cursor: pointer;
                    transition: all .16s ease;
                }

                .btn i {
                    font-size: 14px;
                }

                .btn:hover:not(:disabled) {
                    box-shadow: 0 2px 6px rgba(15,23,42,0.10);
                    transform: translateY(-1px);
                }

                .btn:disabled {
                    opacity: 0.6;
                    cursor: default;
                    box-shadow: none;
                    transform: none;
                }

                .btn.ghost {
                    background: #f9fafb;
                }

                .refresh-btn span {
                    white-space: nowrap;
                }

                .alert.error {
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                    padding: 10px 12px;
                    border-radius: 10px;
                    border: 1px solid #fecaca;
                    background: #fef2f2;
                    color: #991b1b;
                    font-size: 13px;
                }

                .alert.error i {
                    margin-top: 2px;
                }

                .card {
                    margin-top: 4px;
                    padding: 14px 16px 12px;
                    border-radius: 16px;
                    background: #ffffff;
                    border: 1px solid #e5e7eb;
                    box-shadow: 0 4px 14px rgba(15,23,42,0.04);
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .card-head {
                    align-items: flex-end;
                }

                .card-title {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                }

                .legend {
                    display: flex;
                    gap: 12px;
                    font-size: 11px;
                    color: var(--muted);
                    align-items: center;
                }

                .legend-item {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                }

                .dot {
                    width: 9px;
                    height: 9px;
                    border-radius: 999px;
                    border: 1px solid var(--line);
                }

                .dot.normal {
                    background: #bbf7d0;
                    border-color: #22c55e;
                }

                .dot.maint {
                    background: #fee2e2;
                    border-color: #ef4444;
                }

                .empty {
                    padding: 14px 4px 6px;
                    font-size: 13px;
                    color: var(--muted);
                }

                .slots-grid {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 10px;
                    margin-top: 6px;
                }

                @media (max-width: 1200px) {
                    .slots-grid {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                    }
                }
                @media (max-width: 900px) {
                    .slots-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }

                .slot-card {
                    border-radius: 14px;
                    border: 1px solid var(--line);
                    background: #ffffff;
                    padding: 10px 10px 9px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    align-items: stretch;
                    cursor: pointer;
                    transition: all .16s ease;
                    text-align: left;
                }

                .slot-card:hover {
                    box-shadow: 0 4px 12px rgba(15,23,42,0.08);
                    transform: translateY(-2px);
                }

                .slot-card:active {
                    transform: translateY(0);
                    box-shadow: 0 2px 6px rgba(15,23,42,0.06);
                }

                .slot-card.skeleton {
                    position: relative;
                    overflow: hidden;
                    min-height: 110px;
                }

                .slot-card.skeleton::after {
                    content: "";
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(148,163,253,0.12),
                        transparent
                    );
                    animation: shimmer 1.1s infinite;
                }

                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }

                .slot-top {
                    display: flex;
                    justify-content: flex-end;
                }

                .status-badge {
                    padding: 2px 8px;
                    font-size: 10px;
                    border-radius: 999px;
                    border-width: 1px;
                    border-style: solid;
                    font-weight: 500;
                }

                .slot-body {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .slot-id {
                    font-size: 13px;
                    font-weight: 600;
                    color: #111827;
                }

                .kv {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 11px;
                    color: var(--muted);
                }

                .kv strong {
                    font-size: 12px;
                    color: #111827;
                }

                .socbar {
                    margin-top: 3px;
                    width: 100%;
                    height: 6px;
                    background: #f3f4f6;
                    border-radius: 999px;
                    overflow: hidden;
                }

                .socbar-fill {
                    display: block;
                    height: 100%;
                    border-radius: 999px;
                    transition: width .18s ease;
                }

                .view-controls {
                    display: flex;
                    justify-content: center;
                    gap: 8px;
                    margin-top: 10px;
                }

                /* Modal */
                .overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15,23,42,0.35);
                    backdrop-filter: blur(2px);
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    padding-top: 48px;
                    z-index: 60;
                }

                .modal {
                    width: 420px;
                    max-width: 92vw;
                    background: #ffffff;
                    border-radius: 18px;
                    box-shadow: 0 18px 60px rgba(15,23,42,0.35);
                    border: 1px solid #e5e7eb;
                    display: flex;
                    flex-direction: column;
                    max-height: calc(100vh - 80px);
                }

                .modal-head {
                    padding: 14px 18px 10px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid var(--line);
                }

                .modal-head h4 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                }

                .icon-btn {
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 26px;
                    height: 26px;
                    border-radius: 999px;
                    color: #6b7280;
                    transition: background .14s ease, color .14s ease;
                }

                .icon-btn:hover {
                    background: #f3f4f6;
                    color: #111827;
                }

                .modal-body {
                    padding: 14px 18px 4px;
                    overflow-y: auto;
                }

                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 10px;
                }

                .info-card {
                    padding: 10px 12px;
                    border-radius: 12px;
                    border: 1px solid var(--line);
                    background: var(--bg-soft);
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                }

                .info-card.wide {
                    grid-column: 1 / -1;
                }

                .label {
                    font-size: 11px;
                    color: var(--muted);
                }

                .value {
                    font-size: 13px;
                    color: #111827;
                }

                .value.strong {
                    font-weight: 600;
                }

                .modal-foot {
                    padding: 10px 18px 12px;
                    border-top: 1px solid var(--line);
                    display: flex;
                    justify-content: flex-end;
                }
            `}</style>
        </section>
    );
}