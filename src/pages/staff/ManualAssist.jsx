/* eslint-disable no-unused-vars */
// src/pages/staff/ManualAssist.jsx
import React, { useMemo, useState } from "react";
import api from "@/api/api"; // axios instance

export default function ManualAssist() {
    // 👤 StaffId lấy từ localStorage (không hard-code)
    const [staffId] = useState(
        localStorage.getItem("StaffId") ||
        localStorage.getItem("userId") ||
        ""
    );

    // ====== Step 1: Check subscription ======
    const [subscriptionId, setSubscriptionId] = useState(""); // subId nhập tay
    const [checkingSub, setCheckingSub] = useState(false);
    const [checkErr, setCheckErr] = useState("");
    const [validated, setValidated] = useState(false);

    // phụ (không hiển thị UI nữa)
    const [stationId, setStationId] = useState("");

    // danh sách pin KH đang giữ (Pin In)
    const [subBatteries, setSubBatteries] = useState([]);

    // có pin KH hay không (để disable Pin In nếu không có)
    const hasCustomerBatteries = subBatteries.length > 0;

    // ====== Step 2 & 3 shared state ======
    const [errorType, setErrorType] = useState(""); // '' | 'pinIn' | 'pinOut'
    const [inBatteryId, setInBatteryId] = useState(""); // Customer Battery ID
    const [outBatteryId, setOutBatteryId] = useState(""); // Out Battery ID

    const [submitting, setSubmitting] = useState(false);
    const [resp, setResp] = useState(null); // giữ để debug nếu cần (không render ra UI)
    const [err, setErr] = useState("");

    // 🎉 Thông báo thành công
    const [successMsg, setSuccessMsg] = useState("");

    async function checkSubscription() {
        if (!subscriptionId.trim() || !staffId.trim()) {
            setCheckErr("Missing subscriptionId or staffId.");
            return;
        }

        setCheckingSub(true);
        setCheckErr("");
        setSuccessMsg(""); // reset banner thành công
        setValidated(false);
        setSubBatteries([]);
        setStationId("");
        setInBatteryId("");
        setOutBatteryId("");
        setErrorType("");

        try {
            // ✅ GET — params: StaffId + SubscriptionId
            const res = await api.get("/Subscription/staff-get-battery", {
                params: {
                    StaffId: staffId,
                    SubscriptionId: subscriptionId,
                },
            });

            // Chuẩn hoá theo JSON BE
            const rawBlock =
                res?.data?.data?.batteries?.result ??
                res?.data?.data?.batteries ??
                res?.data?.data ??
                res?.data ??
                [];

            const arr = Array.isArray(rawBlock) ? rawBlock : [];
            const ids = arr
                .map((x) =>
                    typeof x === "string"
                        ? x
                        : x?.batteryId || x?.id || x?.batteryID || ""
                )
                .filter(Boolean);

            const uniqueIds = Array.from(new Set(ids));
            setSubBatteries(uniqueIds);

            // Lưu stationId để dùng nội bộ (không hiển thị)
            setStationId(res?.data?.data?.stationId || "");

            // Auto chọn action
            if (uniqueIds.length > 0) {
                setErrorType("pinIn");
                setInBatteryId(uniqueIds[0]);
            } else {
                setErrorType("pinOut");
            }

            setValidated(true);
        } catch (e) {
            console.error(e);
            const resData = e?.response?.data;
            if (
                resData?.title === "One or more validation errors occurred." &&
                resData?.errors?.SubscriptionId
            ) {
                // Sai format SUB ID
                setCheckErr(
                    "Invalid Subscription ID format. Please follow pattern SUB-12345678."
                );
            } else {
                setCheckErr(
                    resData?.message ||
                    e.message ||
                    "Subscription check failed."
                );
            }
            setValidated(false);
        } finally {
            setCheckingSub(false);
        }
    }

    // ====== Điều kiện enable nút Confirm ======
    const canConfirm = useMemo(() => {
        if (!validated) return false;
        if (!(errorType === "pinIn" || errorType === "pinOut")) return false;
        if (!subscriptionId.trim()) return false;

        if (errorType === "pinIn") {
            if (!hasCustomerBatteries) return false;
            if (!inBatteryId.trim()) return false;
            if (!outBatteryId.trim()) return false;
        } else if (errorType === "pinOut") {
            if (!outBatteryId.trim()) return false;
        }

        return true;
    }, [
        validated,
        errorType,
        subscriptionId,
        hasCustomerBatteries,
        inBatteryId,
        outBatteryId,
    ]);

    async function onConfirm() {
        if (!canConfirm) return;

        setSubmitting(true);
        setErr("");
        setResp(null);
        setSuccessMsg(""); // reset

        try {
            const payload = {
                staffId,
                subId: subscriptionId,
                batteryOutId: outBatteryId || null,
                batteryInId: errorType === "pinIn" ? inBatteryId || null : null,
            };

            const res = await api.post(
                "/BatterySwap/staff-help-customer",
                payload
            );
            setResp(res?.data ?? null);

            // 👉 Chỉ hiển thị thông báo thành công
            const msg =
                errorType === "pinIn"
                    ? `Battery swap successful: received (${inBatteryId}), gave (${outBatteryId}).`
                    : `Battery swap successful: gave (${outBatteryId}) to the customer.`;
            setSuccessMsg(msg);
        } catch (e) {
            console.error(e);
            const resData = e?.response?.data;

            if (resData?.title === "One or more validation errors occurred." && resData?.errors) {
                if (resData.errors.SubscriptionId) {
                    setErr(
                        "Invalid Subscription ID format. Please follow pattern SUB-12345678."
                    );
                } else if (resData.errors.BatteryOutId) {
                    setErr(
                        "Invalid BatteryOut ID format. Please follow pattern BT-1234-1A2B."
                    );
                } else if (resData.errors.BatteryInId) {
                    setErr(
                        "Invalid BatteryIn ID format. Please follow pattern BT-1234-1A2B."
                    );
                } else {
                    const firstKey = Object.keys(resData.errors)[0];
                    const firstMsg = resData.errors[firstKey]?.[0];
                    setErr(firstMsg || "Validation error. Please check your inputs.");
                }
            } else {
                setErr(
                    resData?.message ||
                    e.message ||
                    "Manual Assist failed."
                );
            }
        } finally {
            setSubmitting(false);
        }
    }

    /* ================== Warehouse picker ================== */
    const [openPicker, setOpenPicker] = useState(false);
    const [pickLoading, setPickLoading] = useState(false);
    const [pickErr, setPickErr] = useState("");
    const [batteries, setBatteries] = useState([]);
    const [minSoc, setMinSoc] = useState(0); // lọc SOC tối thiểu

    const loadWarehouse = async () => {
        setPickLoading(true);
        setPickErr("");
        try {
            if (!staffId.trim()) {
                setPickErr("Please provide staffId.");
                setBatteries([]);
                return;
            }
            const res = await api.get("/Station/station-inventory", {
                params: { staffId },
            });

            const list = Array.isArray(res.data) ? res.data : res.data?.data || [];

            const mapped = list.map((it) => ({
                id: it.batteryId || it.id || "",
                soh: clamp01(it.soh),
                soc: clamp01(it.soc),
                capacityKWh: Number(it.capacity ?? it.capacityKWh ?? 0),
                status: it.status || "Warehouse",
            }));
            setBatteries(mapped);
        } catch (e) {
            console.error(e);
            setPickErr(
                e?.response?.data?.message ||
                e.message ||
                "Failed to load battery warehouse."
            );
            setBatteries([]);
        } finally {
            setPickLoading(false);
        }
    };

    // lọc pin status 'warehouse' + SOC >= minSoc
    const filteredBatteries = useMemo(
        () =>
            batteries
                .filter((b) => isWarehouse(b.status))
                .filter((b) => Number.isFinite(b.soc) && b.soc >= minSoc)
                .sort((a, b) => (b.soc ?? 0) - (a.soc ?? 0)),
        [batteries, minSoc]
    );

    return (
        <section>
            <h2 className="h1" style={{ marginTop: 0 }}>
                Manual Assist
            </h2>

            {/* ===== STEP 1: CHECK SUBSCRIPTION ===== */}
            <div className="card" style={{ marginTop: 12 }}>
                <h3 style={{ marginTop: 0 }}>Step 1. Check Subscription</h3>

                <div style={grid2}>
                    <label>
                        Subscription ID
                        <input
                            className="input"
                            value={subscriptionId}
                            onChange={(e) => {
                                setSubscriptionId(e.target.value);
                                setSuccessMsg("");
                            }}
                            placeholder="e.g. SUB-12345678"
                        />
                    </label>

                    <div>
                        <button
                            className="btn btn-primary"
                            type="button"
                            disabled={
                                checkingSub ||
                                !subscriptionId.trim() ||
                                !staffId.trim()
                            }
                            onClick={checkSubscription}
                        >
                            {checkingSub ? "Checking…" : "Check subscription"}
                        </button>

                        {checkErr && (
                            <div
                                style={{
                                    color: "#dc2626",
                                    fontWeight: 600,
                                    marginTop: 8,
                                    whiteSpace: "pre-wrap",
                                    fontSize: 12,
                                }}
                            >
                                ❌ {checkErr}
                            </div>
                        )}
                        {/* ĐÃ BỎ: Hidden param + Subscription OK */}
                    </div>
                </div>

                {validated && subBatteries.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                        <div
                            className="small muted"
                            style={{ marginBottom: 4 }}
                        >
                            Suggested Battery IDs (click to fill "Customer
                            Battery ID"):
                        </div>

                        <div
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 8,
                            }}
                        >
                            {subBatteries.map((id) => (
                                <button
                                    key={id}
                                    type="button"
                                    className="btn"
                                    onClick={() => {
                                        setInBatteryId(id);
                                        setSuccessMsg("");
                                    }}
                                    style={{
                                        fontSize: 12,
                                        borderColor:
                                            inBatteryId === id
                                                ? "#10b981"
                                                : undefined,
                                        background:
                                            inBatteryId === id
                                                ? "rgba(16,185,129,.1)"
                                                : undefined,
                                    }}
                                >
                                    {id}
                                </button>
                            ))}
                        </div>

                        <div
                            className="small muted"
                            style={{ marginTop: 4 }}
                        >
                            You can still edit manually.
                        </div>
                    </div>
                )}
            </div>

            {/* ===== STEP 2: CHỌN TÌNH HUỐNG ===== */}
            {validated && (
                <div className="card" style={{ marginTop: 16 }}>
                    <h3 style={{ marginTop: 0 }}>Step 2. Select Action Type</h3>

                    <div style={grid2}>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                            }}
                        >
                            <label
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                }}
                            >
                                <input
                                    type="radio"
                                    name="errType"
                                    value="pinIn"
                                    checked={errorType === "pinIn"}
                                    onChange={() => {
                                        setErrorType("pinIn");
                                        setSuccessMsg("");
                                    }}
                                    disabled={!hasCustomerBatteries}
                                />
                                Pin In
                            </label>

                            <label
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                }}
                            >
                                <input
                                    type="radio"
                                    name="errType"
                                    value="pinOut"
                                    checked={errorType === "pinOut"}
                                    onChange={() => {
                                        setErrorType("pinOut");
                                        setSuccessMsg("");
                                    }}
                                />
                                Pin Out
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== STEP 3A: PIN IN ===== */}
            {validated && errorType === "pinIn" && (
                <div style={grid2}>
                    <div className="card">
                        <h3 style={{ marginTop: 0 }}>
                            Step 3A. Receive Customer Battery (Pin In)
                        </h3>
                        <label>
                            Customer Battery ID
                            <input
                                className="input"
                                value={inBatteryId}
                                onChange={(e) => {
                                    setInBatteryId(e.target.value);
                                    setSuccessMsg("");
                                }}
                                placeholder="e.g. BT-9999-ABCD"
                            />
                        </label>
                    </div>

                    <div className="card">
                        <h3 style={{ marginTop: 0 }}>
                            Give Battery to Customer
                        </h3>
                        <label>
                            Out Battery ID
                            <div
                                style={{
                                    display: "flex",
                                    gap: 8,
                                    alignItems: "center",
                                }}
                            >
                                <input
                                    className="input input-readonly"
                                    value={outBatteryId}
                                    readOnly
                                    placeholder="Select from warehouse…"
                                    aria-label="Out Battery ID"
                                />
                                <button
                                    className="btn btn-warehouse"
                                    type="button"
                                    onClick={() => {
                                        setOpenPicker(true);
                                        loadWarehouse();
                                    }}
                                    disabled={!staffId.trim()}
                                    title={
                                        !staffId.trim()
                                            ? "Missing staffId"
                                            : "Pick from warehouse"
                                    }
                                >
                                    <i
                                        className="bi bi-box-seam"
                                        aria-hidden="true"
                                    />
                                    <span>Pick from warehouse</span>
                                </button>
                            </div>
                        </label>
                    </div>
                </div>
            )}

            {/* ===== STEP 3B: PIN OUT ===== */}
            {validated && errorType === "pinOut" && (
                <div className="card" style={{ marginTop: 16 }}>
                    <h3 style={{ marginTop: 0 }}>
                        Step 3B. Give Battery to Customer
                    </h3>
                    <label>
                        Out Battery ID
                        <div
                            style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "center",
                            }}
                        >
                            <input
                                className="input input-readonly"
                                value={outBatteryId}
                                readOnly
                                placeholder="Select from warehouse…"
                                aria-label="Out Battery ID"
                            />
                            <button
                                className="btn btn-warehouse"
                                type="button"
                                onClick={() => {
                                    setOpenPicker(true);
                                    loadWarehouse();
                                }}
                                disabled={!staffId.trim()}
                                title={
                                    !staffId.trim()
                                        ? "Missing staffId"
                                        : "Pick from warehouse"
                                }
                            >
                                <i
                                    className="bi bi-box-seam"
                                    aria-hidden="true"
                                />
                                <span>Pick from warehouse</span>
                            </button>
                        </div>
                    </label>
                </div>
            )}

            {/* ===== CONFIRM BUTTON + RESULT ===== */}
            {validated && (
                <>
                    <div style={{ marginTop: 12 }}>
                        <button
                            className="btn btn-primary"
                            onClick={onConfirm}
                            disabled={!canConfirm || submitting}
                        >
                            {submitting
                                ? "Processing…"
                                : "Confirm & Send Manual Assist"}
                        </button>
                    </div>

                    {/* ❌ Lỗi */}
                    {err && (
                        <div
                            className="card mt-3"
                            style={{
                                borderColor: "#ef4444",
                                background: "#fef2f2",
                            }}
                        >
                            <div
                                style={{
                                    color: "#dc2626",
                                    fontWeight: 700,
                                    whiteSpace: "pre-wrap",
                                }}
                            >
                                ❌ {err}
                            </div>
                        </div>
                    )}

                    {/* ✅ Thành công */}
                    {successMsg && (
                        <div
                            className="card mt-3"
                            style={{
                                borderColor: "#10b981",
                                background: "#ecfdf5",
                                color: "#065f46",
                                fontWeight: 600,
                                whiteSpace: "pre-wrap",
                            }}
                        >
                            ✅ {successMsg}
                        </div>
                    )}
                </>
            )}

            {/* ===== MODAL KHO PIN ===== */}
            {openPicker && (
                <div
                    className="overlay"
                    onClick={() => setOpenPicker(false)}
                >
                    <aside
                        className="drawer"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="drawer-head">
                            <h4 className="m-0">
                                Select Battery from Warehouse
                            </h4>
                            <button
                                className="btn-close"
                                onClick={() => setOpenPicker(false)}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </header>

                        <div
                            className="drawer-body"
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 12,
                            }}
                        >
                            <div className="row-between">
                                <div className="small muted">
                                    Staff: <b>{staffId || "—"}</b>
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                    }}
                                >
                                    <label className="small muted">
                                        Min SOC filter
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={minSoc}
                                        onChange={(e) =>
                                            setMinSoc(clamp01(e.target.value))
                                        }
                                        style={{ width: 72 }}
                                        aria-label="Min SOC filter"
                                    />
                                </div>
                            </div>

                            {pickErr && (
                                <div
                                    className="card"
                                    style={{
                                        color: "#991b1b",
                                        background: "#fee2e2",
                                        border: "1px solid #fecaca",
                                    }}
                                >
                                    {pickErr}
                                </div>
                            )}

                            <div
                                className="slots-grid"
                                role="list"
                                aria-label="Warehouse battery list"
                            >
                                {pickLoading ? (
                                    Array.from({ length: 8 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="slot-card skeleton"
                                        />
                                    ))
                                ) : filteredBatteries.length === 0 ? (
                                    <div className="muted small">
                                        No matching batteries (only status{" "}
                                        <b>warehouse</b> is shown).
                                    </div>
                                ) : (
                                    filteredBatteries.map((b) => {
                                        const tone = statusTone(b.status);
                                        return (
                                            <div
                                                key={b.id}
                                                className="slot-card"
                                                role="listitem"
                                                style={{
                                                    borderColor: tone.br,
                                                    background: "#fff",
                                                }}
                                            >
                                                <div className="slot-head">
                                                    <span
                                                        className="status-badge"
                                                        style={{
                                                            background: tone.bg,
                                                            color: tone.fg,
                                                            borderColor: tone.br,
                                                        }}
                                                    >
                                                        {tone.label}
                                                    </span>
                                                </div>

                                                <div className="slot-body">
                                                    <div className="slot-id">
                                                        {b.id}
                                                    </div>
                                                    <div className="kv">
                                                        <span>SOH</span>
                                                        <b>{clamp01(b.soh)}%</b>
                                                    </div>
                                                    <div className="kv">
                                                        <span>SOC</span>
                                                        <b>{clamp01(b.soc)}%</b>
                                                    </div>
                                                    <div className="socbar">
                                                        <span
                                                            className="socbar-fill"
                                                            style={{
                                                                width: `${clamp01(
                                                                    b.soc
                                                                )}%`,
                                                                background: tone.br,
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                <div
                                                    className="slot-foot"
                                                    style={{
                                                        marginTop: 8,
                                                        display: "flex",
                                                        justifyContent: "flex-end",
                                                    }}
                                                >
                                                    <button
                                                        className="btn"
                                                        onClick={() => {
                                                            setOutBatteryId(b.id);
                                                            setOpenPicker(false);
                                                            setSuccessMsg("");
                                                        }}
                                                    >
                                                        Select
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <footer className="drawer-foot">
                            <button
                                className="btn ghost"
                                onClick={() => setOpenPicker(false)}
                            >
                                Close
                            </button>
                        </footer>
                    </aside>
                </div>
            )}

            {/* ===== STYLES ===== */}
            <style>{`
        .row-between { display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .small { font-size:12px; }
        .muted { color: var(--muted); }
        .m-0 { margin: 0; }

        .btn { height:36px; padding:0 12px; border-radius:10px; border:1px solid var(--line); background:#fff; cursor:pointer; }
        .btn.btn-primary { background:#2563eb; color:#fff; border-color:#1d4ed8; }
        .btn.btn-primary:disabled { opacity:.6; cursor:not-allowed; }
        .btn.btn-warehouse {
          display:inline-flex;
          align-items:center;
          gap:6px;
          font-size:12px;
          border-color:var(--line,#e5e7eb);
          background:#f9fafb;
        }
        .btn.btn-warehouse i { font-size:14px; }
        .btn.btn-warehouse:hover {
          background:#eef2ff;
          border-color:#c7d2fe;
        }
        .btn.ghost:hover { background:#f8fafc; }
        .btn-close { background:transparent; border:none; font-size:22px; line-height:1; cursor:pointer; color:#0f172a; }

        .input-readonly {
          background:#f9fafb;
          cursor:default;
        }
        .input-readonly:focus {
          background:#f9fafb;
          box-shadow:none;
        }

        .overlay { position:fixed; inset:0; background:rgba(2,6,23,.5); display:flex; align-items:flex-end; }
        .drawer { width:100%; max-height:88vh; background:#fff; border-radius:16px 16px 0 0; overflow:hidden; box-shadow:0 -8px 24px rgba(2,6,23,.2); }
        .drawer-head, .drawer-foot { padding:12px 16px; border-bottom:1px solid var(--line); }
        .drawer-foot { border-top:1px solid var(--line); border-bottom:none; }
        .drawer-body { padding:12px 16px; }

        .slots-grid { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:12px; }
        @media (min-width: 920px) { .slots-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }

        .slot-card { border:1px solid var(--line); border-radius:14px; padding:12px; display:flex; flex-direction:column; gap:8px; }
        .slot-card.skeleton { position:relative; overflow:hidden; min-height:120px; }
        .slot-card.skeleton::after {
          content:""; position:absolute; inset:0;
          background: linear-gradient(90deg, transparent, rgba(148,163,184,.1), transparent);
          animation: shimmer 1.2s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .slot-head { display:flex; align-items:center; justify-content:flex-end; gap:8px; }
        .status-badge { font-size:12px; padding:2px 8px; border-radius:999px; border:1px solid; white-space:nowrap; }

        .slot-body { display:flex; flex-direction:column; gap:6px; }
        .slot-id { font-weight:600; font-size:14px; }
        .kv { display:flex; align-items:center; justify-content:space-between; font-size:12px; }
        .socbar { height:6px; border-radius:999px; background:#e2e8f0; overflow:hidden; }
        .socbar-fill { display:block; height:100%; border-radius:999px; }
      `}</style>
        </section>
    );
}

/* ===== Helpers ===== */
const grid2 = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
};

function clamp01(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    const r = Math.round(x);
    return Math.max(0, Math.min(100, r));
}

function isWarehouse(status) {
    return (status || "").trim().toLowerCase() === "warehouse";
}

function statusTone(status) {
    const s = (status || "").toLowerCase();
    if (s === "warehouse") {
        return {
            bg: "rgba(16,185,129,.10)",
            fg: "#065f46",
            br: "#10b981",
            label: "Warehouse",
        };
    }
    return {
        bg: "rgba(148,163,184,.12)",
        fg: "#334155",
        br: "#94a3b8",
        label: "Other",
    };
}
