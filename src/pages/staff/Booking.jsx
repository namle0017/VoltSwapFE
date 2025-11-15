// src/pages/staff/Booking.jsx
import React from "react";
import api from "@/api/api";

const LIST_ENDPOINT = "/Booking/station-booking-list";
const CREATE_TRANS_EP = "/BatterySwap/create-cancel-plan";
const CONFIRM_TX_EP = "/Transaction/staff-confirm-transaction";
const CANCEL_EP = "/Booking/expire-check";
const SUB_GET_EP = "/Subscription/staff-get-battery";
const TAKE_IN_EP = "/BatterySwap/staff-take-battery-in-sub-customer";

/* ========== Helpers ========== */
function parseLocalDateTime(dateStr, timeStr) {
  if (!dateStr) return null;
  const [y, m, d] = (dateStr || "").split("-").map(Number);
  const [hh = 0, mm = 0, ss = 0] = (timeStr || "00:00:00").split(":").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0);
}
function fmtDateDMY(d) {
  if (!(d instanceof Date) || isNaN(d)) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
}
function fmtTimeAMPM(d) {
  if (!(d instanceof Date) || isNaN(d)) return "—";
  let hh = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12;
  if (hh === 0) hh = 12;
  return `${String(hh).padStart(2, "0")}:${mm}${ampm}`;
}
function statusPillClass(text) {
  const v = String(text || "").toLowerCase();
  if (v.includes("cancel")) return "pill cancelled";
  if (v.includes("confirm")) return "pill confirmed";
  if (v.includes("success") || v.includes("done") || v.includes("completed")) return "pill successful";
  return "pill pending";
}
const isCancelNote = (note) => String(note || "").toLowerCase().includes("cancel");
const canCancel = (status = "") => {
  const s = String(status).toLowerCase();
  if (!s) return true;
  if (s.includes("cancel")) return false;
  if (s.includes("done") || s.includes("success") || s.includes("completed")) return false;
  return true;
};

/* Chuẩn hoá response /Subscription/staff-get-battery: lấy batteries + stationId */
function normalizeSubCheck(raw) {
  const root = raw?.data ?? raw ?? {};

  const subId =
    root.subscriptionId ??
    root.subcriptionId ??
    root.SubscriptionId ??
    root.subId ??
    root?.subscription?.subscriptionId ??
    root?.subscription?.subId ??
    "";

  const stationId =
    root.stationId ??
    root.StationId ??
    root.stationID ??
    root?.station?.stationId ??
    "";

  // Tìm mảng pin ở nhiều dạng (ưu tiên data.batteries.result và data.result như log của bạn)
  const arrLike =
    Array.isArray(root) ? root :
      Array.isArray(root.batteries?.result) ? root.batteries.result :
        Array.isArray(root.result) ? root.result :
          Array.isArray(root.batteries) ? root.batteries :
            Array.isArray(root.results) ? root.results :
              Array.isArray(root.batteryList) ? root.batteryList :
                Array.isArray(root.items) ? root.items :
                  null;

  let batteries = [];
  if (arrLike) {
    batteries = arrLike
      .map((x) => {
        if (x == null) return null;
        if (typeof x === "string") return x;
        return (
          x.customerBatteryId ??
          x.CustomerBatteryId ??
          x.batteryId ??
          x.BatteryId ??
          x.batteryID ??
          x.outBatteryId ??
          x.OutBatteryId ??
          x?.battery?.batteryId ??
          x.id ?? x.ID ?? x.code ?? x.Code ?? null
        );
      })
      .filter(Boolean);
  } else {
    const single =
      root.customerBatteryId ??
      root.CustomerBatteryId ??
      root.batteryId ??
      root.BatteryId ??
      root.batteryID ??
      root.outBatteryId ??
      root.OutBatteryId ??
      root?.battery?.batteryId;
    if (single) batteries = [single];
  }

  return { subId, stationId, batteries };
}

/* ========== Modal ========== */
function SubCheckModal({
  open,
  onClose,
  // eslint-disable-next-line no-unused-vars
  booking,
  subData, // { subId, stationId, batteries }
  onTakeIn, // (selectedIds) => Promise
  takingIn,
}) {
  React.useEffect(() => {
    function onEsc(e) { if (e.key === "Escape") onClose?.(); }
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  const subId = subData?.subId || "—";
  const stationId = subData?.stationId || "—";
  const list = Array.isArray(subData?.batteries) ? subData.batteries : [];

  // Chọn battery (mặc định chọn hết)
  const [selected, setSelected] = React.useState(new Set());
  React.useEffect(() => {
    setSelected(new Set(list));
  }, [open, subId, list.length]);

  const allChecked = list.length > 0 && selected.size === list.length;

  const toggleOne = (id) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const selectAll = () => setSelected(new Set(list));
  const clearAll = () => setSelected(new Set());

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <div className="title">Subscription detail</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="modal-body">
          <div className="grid-2">
            <div className="kv-card">
              <div className="kv-label">Subscription ID</div>
              <div className="kv-value mono">{subId}</div>
            </div>
            <div className="kv-card">
              <div className="kv-label">Station ID</div>
              <div className="kv-value mono">{stationId || "—"}</div>
            </div>
          </div>

          <div className="kv-label" style={{ marginBottom: 6 }}>Battery IDs</div>
          {list.length === 0 ? (
            <div className="muted">No batteries.</div>
          ) : (
            <div className="check-toolbar">
              <button className="btn xs" onClick={selectAll} disabled={allChecked}>Select all</button>
              <button className="btn xs" onClick={clearAll} disabled={selected.size === 0}>Clear</button>
              <div className="muted" style={{ marginLeft: "auto" }}>{selected.size}/{list.length} selected</div>
            </div>
          )}

          {list.length > 0 && (
            <div className="check-list">
              {list.map((bid) => (
                <label key={bid} className="check-item" title={String(bid)}>
                  <input
                    type="checkbox"
                    checked={selected.has(bid)}
                    onChange={() => toggleOne(bid)}
                  />
                  <span className="mono">{String(bid)}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Close</button>
          <button
            className="btn btn-primary"
            disabled={takingIn || selected.size === 0}
            onClick={() => onTakeIn?.(Array.from(selected))}
            title={selected.size === 0 ? "Select at least one battery" : "Take selected batteries to inventory"}
          >
            {takingIn ? "Processing…" : "Take batteries to inventory"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========== Normalizer cho list booking ========== */
function normalizeBooking(b, idx) {
  const when = parseLocalDateTime(b?.date, b?.timeBooking);
  return {
    id: idx + 1,
    bookingId: b?.bookingId || "",
    subcriptionId: b?.subcriptionId || b?.subscriptionId || b?.subId || "",
    driverName: b?.driverName || "—",
    phone: b?.driverTele || "—",
    batteries: Number(b?.numberBattery ?? 0) || 0,
    status: b?.status || "Not done",
    note: b?.note || "",
    when,
  };
}

/* ========== Component ========== */
export default function Booking() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const [searchName, setSearchName] = React.useState("");

  const [creatingIds, setCreatingIds] = React.useState(() => new Set());
  const [confirmingIds, setConfirmingIds] = React.useState(() => new Set());
  const [cancellingIds, setCancellingIds] = React.useState(() => new Set());
  const [txByBooking, setTxByBooking] = React.useState({});

  // Check SubId
  const [checkingSubs, setCheckingSubs] = React.useState(() => new Set());
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalBooking, setModalBooking] = React.useState(null);
  const [modalSubData, setModalSubData] = React.useState(null);
  const [takingIn, setTakingIn] = React.useState(false);

  const staffId = React.useMemo(
    () =>
      localStorage.getItem("StaffId") ||
      localStorage.getItem("staffId") ||
      localStorage.getItem("userId") ||
      "",
    []
  );

  const fetchBookings = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (!staffId) {
        setError("Missing StaffId in localStorage. Please sign in again.");
        setRows([]);
        setLoading(false);
        return;
      }
      const res = await api.get(LIST_ENDPOINT, { params: { StaffId: staffId } });
      const list = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
          ? res.data
          : [];
      const mapped = list
        .map(normalizeBooking)
        .sort((a, b) => (a.when?.getTime?.() ?? 0) - (b.when?.getTime?.() ?? 0));
      setRows(mapped);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to load booking list.";
      setError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  React.useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const filteredRows = React.useMemo(() => {
    const q = searchName.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((bk) => String(bk.driverName || "").toLowerCase().includes(q));
  }, [rows, searchName]);

  /* ========== Actions ========== */
  const handleCreateTransaction = async (bk) => {
    if (!bk?.subcriptionId || !bk?.bookingId || !staffId) {
      alert("Missing data (subId / bookingId / staffId).");
      return;
    }
    if (creatingIds.has(bk.bookingId)) return;
    setCreatingIds((prev) => new Set(prev).add(bk.bookingId));
    try {
      const res = await api.post(CREATE_TRANS_EP, {
        subId: bk.subcriptionId,
        bookingId: bk.bookingId,
        staffId,
      });
      const txId =
        res?.data?.data?.createRefund?.transactionId ||
        res?.data?.transactionId ||
        res?.data?.data?.transactionId ||
        "";
      if (txId) setTxByBooking((prev) => ({ ...prev, [bk.bookingId]: txId }));
      alert("Transaction created successfully.");
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to create transaction.";
      alert(msg);
    } finally {
      setCreatingIds((prev) => { const n = new Set(prev); n.delete(bk.bookingId); return n; });
    }
  };

  const handleConfirmTransaction = async (bk) => {
    const txId = txByBooking[bk.bookingId];
    if (!txId) { alert("No transactionId yet. Please click 'Create Transaction' first."); return; }
    if (confirmingIds.has(bk.bookingId)) return;
    setConfirmingIds((prev) => new Set(prev).add(bk.bookingId));
    try {
      await api.post(CONFIRM_TX_EP, { transactionId: txId });
      alert("Transaction confirmed successfully.");
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to confirm transaction.";
      alert(msg);
    } finally {
      setConfirmingIds((prev) => { const n = new Set(prev); n.delete(bk.bookingId); return n; });
    }
  };

  const handleCancelBooking = async (bk) => {
    if (!bk?.bookingId) { alert("Missing bookingId."); return; }
    const allowed = canCancel(bk.status);
    if (!allowed) { alert("This booking cannot be cancelled."); return; }
    if (cancellingIds.has(bk.bookingId)) return;

    const ok = window.confirm(`Cancel booking #${bk.bookingId} for ${bk.driverName}?`);
    if (!ok) return;

    setCancellingIds((prev) => new Set(prev).add(bk.bookingId));
    try {
      await api.post(CANCEL_EP, { bookingId: bk.bookingId });
      alert("Booking cancelled successfully.");
      await fetchBookings();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to cancel booking.";
      alert(msg);
    } finally {
      setCancellingIds((prev) => { const n = new Set(prev); n.delete(bk.bookingId); return n; });
    }
  };

  // Take selected batteries to inventory (from modal)
  const handleTakeIn = async (selectedIds) => {
    const subId = modalSubData?.subId || modalBooking?.subcriptionId;
    const stationId = modalSubData?.stationId;
    if (!subId || !stationId) { alert("Missing subscriptionId/stationId."); return; }
    if (!Array.isArray(selectedIds) || selectedIds.length === 0) { alert("Please select at least one battery."); return; }

    const payload = {
      access: { subscriptionId: subId, stationId },
      batteriesId: selectedIds,
    };

    setTakingIn(true);
    try {
      await api.post(TAKE_IN_EP, payload);
      alert("Batteries moved to inventory successfully.");
      setModalOpen(false);
      // tuỳ bạn có muốn reload danh sách booking hay không:
      // await fetchBookings();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to take batteries to inventory.";
      alert(msg);
    } finally {
      setTakingIn(false);
    }
  };

  // Check SubId -> mở modal
  const handleCheckSub = async (bk) => {
    const subId = bk?.subcriptionId;
    if (!subId) { alert("This booking has no SubscriptionId."); return; }
    if (!staffId) { alert("Missing StaffId in localStorage."); return; }
    if (checkingSubs.has(bk.bookingId)) return;

    setCheckingSubs((prev) => new Set(prev).add(bk.bookingId));
    try {
      const res = await api.get(SUB_GET_EP, {
        params: {
          StaffId: staffId, staffId,
          SubscriptionId: subId, subscriptionId: subId, subId,
        },
      });
      const data = normalizeSubCheck(res?.data?.data ?? res?.data ?? null);
      setModalBooking(bk);
      setModalSubData(data);
      setModalOpen(true);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Check failed.";
      alert(msg);
    } finally {
      setCheckingSubs((prev) => { const n = new Set(prev); n.delete(bk.bookingId); return n; });
    }
  };

  /* ========== Render ========== */
  return (
    <section>
      <div className="row-between">
        <div>
          <h2 className="h1">Booking</h2>
          <p className="muted">Manage customer bookings and schedules.</p>
        </div>
        <div className="row-right">
          <input
            className="search-input"
            placeholder="Search by customer name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
          <button className="btn" onClick={fetchBookings} disabled={loading}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card card-padded mt-3" style={{ border: "1px solid #fecaca", background: "#fee2e2", color: "#991b1b" }}>
          {error}
        </div>
      )}
      {loading && (
        <div className="card card-padded mt-3" style={{ border: "1px solid #c7d2fe", background: "#eef2ff", color: "#3730a3" }}>
          Loading bookings…
        </div>
      )}

      <div className="table-wrap mt-4">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Quantity</th>
              <th>Phone Number</th>
              <th>Time</th>
              <th>Status</th>
              <th>Note</th>
              <th style={{ minWidth: 500 }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredRows.length === 0 && !loading ? (
              <tr>
                <td colSpan={8} className="muted" style={{ textAlign: "center", padding: "16px" }}>
                  {rows.length === 0 ? "No bookings." : "No bookings match this customer name."}
                </td>
              </tr>
            ) : (
              filteredRows.map((bk) => {
                const showCancelFlow = isCancelNote(bk.note);
                const creating = creatingIds.has(bk.bookingId);
                const confirming = confirmingIds.has(bk.bookingId);
                const hasTxId = Boolean(txByBooking[bk.bookingId]);
                const checking = checkingSubs.has(bk.bookingId);
                const cancelling = cancellingIds.has(bk.bookingId);
                const allowCancel = canCancel(bk.status);

                return (
                  <tr key={bk.id}>
                    <td>{fmtDateDMY(bk.when)}</td>
                    <td>{bk.driverName}</td>
                    <td>{bk.batteries}</td>
                    <td>{bk.phone}</td>
                    <td>{fmtTimeAMPM(bk.when)}</td>
                    <td><span className={statusPillClass(bk.status)}>{bk.status}</span></td>
                    <td>{bk.note || "—"}</td>
                    <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {/* Check SubId -> mở modal "Take to inventory" */}
                      <button
                        className="btn btn-check"
                        disabled={checking}
                        onClick={() => handleCheckSub(bk)}
                        title="Check Subscription of this customer"
                      >
                        {checking ? "Checking…" : "Check SubId"}
                      </button>

                      {/* Cancel Booking: ở ngoài modal */}
                      <button
                        className="btn btn-danger"
                        disabled={!allowCancel || cancelling}
                        onClick={() => handleCancelBooking(bk)}
                        title={allowCancel ? "Cancel this booking" : "This booking cannot be cancelled"}
                      >
                        {cancelling ? "Cancelling…" : "Cancel Booking"}
                      </button>

                      {/* (tùy flow) tạo/confirm refund nếu note có từ 'cancel' */}
                      {showCancelFlow && (
                        <>
                          <button
                            className="btn btn-create"
                            disabled={creating}
                            onClick={() => handleCreateTransaction(bk)}
                            title="Create refund transaction"
                          >
                            {creating ? "Creating…" : "Create Transaction"}
                          </button>
                          <button
                            className="btn btn-confirm"
                            disabled={!hasTxId || confirming}
                            onClick={() => handleConfirmTransaction(bk)}
                            title={hasTxId ? "Confirm transaction" : "Please create transaction first"}
                          >
                            {confirming ? "Confirming…" : "Confirm"}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Take batteries to inventory */}
      <SubCheckModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        booking={modalBooking}
        subData={modalSubData}
        onTakeIn={handleTakeIn}
        takingIn={takingIn}
      />

      <style>{`
        .row-between { display:flex; align-items:baseline; justify-content:space-between; gap:12px; }
        .row-right { display:flex; align-items:center; gap:8px; }

        .search-input {
          height:36px; padding:0 10px; border-radius:10px;
          border:1px solid var(--line, #e5e7eb); font-size:13px; min-width:220px;
          background:#f9fafb; outline:none;
        }
        .search-input:focus { border-color:#4f46e5; box-shadow:0 0 0 1px rgba(79,70,229,0.09); background:#ffffff; }

        .btn { height:36px; padding:0 12px; border-radius:10px; border:1px solid var(--line); background:#fff; cursor:pointer; font-size:13px; }
        .btn.xs { height:28px; padding:0 8px; font-size:12px; }
        .btn-confirm { border-color:#f59e0b; background:#fff7ed; }
        .btn-create  { border-color:#10b981; background:#ecfdf5; }
        .btn-check   { border-color:#3b82f6; background:#eff6ff; }
        .btn-danger  { border-color:#ef4444; background:#fef2f2; }
        .btn-primary { border-color:#4f46e5; background:#eef2ff; }
        .btn[disabled] { opacity:.55; cursor:not-allowed; }
        .card-padded { padding:16px 20px; }

        .table-wrap { overflow-x:auto; background:#fff; border:1px solid var(--line); border-radius:12px; }
        .table { width:100%; border-collapse:collapse; }
        .table th, .table td { padding:12px 14px; border-bottom:1px solid var(--line); text-align:left; }
        .table th { font-size:14px; font-weight:600; color:var(--muted,#6b7280); background:#fafafa; }
        .table tr:last-child td { border-bottom:none; }
        .table tbody tr:hover { background:#f8fafc; }

        .pill { display:inline-block; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:600; border:1px solid transparent; }
        .pill.confirmed  { background:#dbeafe; border-color:#93c5fd; color:#1d4ed8; }
        .pill.cancelled  { background:#fee2e2; border-color:#fecaca; color:#b91c1c; }
        .pill.successful { background:#dcfce7; border-color:#86efac; color:#047857; }
        .pill.pending    { background:#fef9c3; border-color:#fde68a; color:#a16207; }

        /* ===== Modal styles ===== */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.35);
          display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 50;
        }
        .modal {
          width: 100%; max-width: 560px; background: #fff; border-radius: 16px;
          border: 1px solid #e5e7eb; box-shadow: 0 10px 30px rgba(0,0,0,0.12);
          display: flex; flex-direction: column; overflow: hidden;
        }
        .modal-head {
          display:flex; align-items:center; justify-content:space-between;
          padding: 14px 16px; border-bottom: 1px solid #f1f5f9;
        }
        .modal-head .title { font-size: 16px; font-weight: 700; }
        .icon-btn {
          width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e5e7eb; background:#fff;
          line-height: 30px; text-align:center; font-size:18px; cursor:pointer;
        }
        .modal-body { padding: 16px; }

        .grid-2 {
          display:grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;
        }
        .kv-card {
          border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px;
          background:#fafafa;
        }
        .kv-label { font-size: 12px; color:#6b7280; margin-bottom: 6px; }
        .kv-value { font-size: 14px; font-weight: 600; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

        .check-toolbar { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
        .check-list {
          display:flex; flex-direction:column; gap:6px;
          max-height:260px; overflow:auto; padding-right:4px; border:1px solid #e5e7eb;
          border-radius:12px; background:#fff; padding:8px;
        }
        .check-item { display:flex; align-items:center; gap:10px; font-size:12px; }
        .check-item input { transform: translateY(1px); }

        .modal-foot {
          display:flex; justify-content:flex-end; gap:8px;
          padding: 12px 16px; border-top: 1px solid #f1f5f9; background:#fafafa;
        }
      `}</style>
    </section>
  );
}