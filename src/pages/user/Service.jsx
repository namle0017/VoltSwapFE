/* eslint-disable no-unused-vars */
// src/pages/user/Service.jsx
import React, { useEffect, useState, useMemo } from "react";
import api from "@/api/api";
import { useNavigate } from "react-router-dom";

export default function Service() {
  const navigate = useNavigate();
  const [subs, setSubs] = useState([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [apiMessage, setApiMessage] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelNote, setCancelNote] = useState("");

  // NEW: chọn station, date, time để gửi đúng BE
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState("");
  const [cancelDate, setCancelDate] = useState(() => formatDateYYYYMMDD(new Date())); // YYYY-MM-DD
  const [cancelTime, setCancelTime] = useState(() => formatTimeHHmm(new Date()));     // HH:mm
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const [showAllBats, setShowAllBats] = useState(false); // UI-only

  function formatNumberVN(n, { min = 0, max = 2 } = {}) {
    const num =
      typeof n === "string" ? Number(n.replace(/[^\d.-]/g, "")) || 0 : Number(n || 0);
    return num.toLocaleString("vi-VN", {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    });
  }

  useEffect(() => {
    const fetchSubs = async () => {
      try {
        const token = localStorage.getItem("token");
        const userId = localStorage.getItem("userId");
        const res = await api.get(
          `/Subscription/subscription-user-list?DriverId=${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = Array.isArray(res.data?.data) ? res.data.data : [];
        setSubs(data);
        setSelected(data[0]?.subId || "");
      } catch (err) {
        const msg = err?.response?.data?.message;
        if (msg) {
          setSubs([]);
          setApiMessage(msg);
        } else {
          console.error("❌ Unexpected error:", err);
          alert("⚠️ Could not load subscriptions.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSubs();
  }, []);

  const loadStations = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/Station/station-list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = Array.isArray(res.data.data) ? res.data.data : [];
      setStations(data);
      setSelectedStation(data[0]?.stationId || "");
    } catch (err) {
      console.error("❌ Failed to load stations:", err);
      alert("Failed to load stations!");
    }
  };

  const current = subs.find((s) => s.subId === selected);

  // ===== Emphasis helpers (UI only) =====
  const remaining = Number(current?.remaining_swap ?? 0);
  const swapTone = remaining <= 3 ? "danger" : remaining <= 10 ? "warn" : "brand";

  const daysLeft = useMemo(() => {
    const end = current?.endDate ? new Date(current.endDate) : null;
    if (!end || isNaN(end)) return null;
    const today = new Date();
    const ms = end.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }, [current?.endDate]);

  const endTone =
    daysLeft == null ? "muted" : daysLeft <= 7 ? "danger" : daysLeft <= 14 ? "warn" : "muted";

  // ===== NEW: Cancel API (đúng payload BE) =====
  const handleCancelSubscription = async () => {
    if (!current?.subId) return alert("No subscription selected.");
    if (!selectedStation) return alert("Please select a station!");

    const driverId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");

    // Chuẩn hoá định dạng theo BE:
    // dateBooking: "YYYY-MM-DD"
    // timeBooking: "HH:mm" hoặc "HH:mm:ss" (thêm :00 cho an toàn)
    const timeWithSec = cancelTime.length === 5 ? `${cancelTime}:00` : cancelTime;

    const payload = {
      stationId: String(selectedStation),
      driverId: String(driverId),
      note: String(cancelNote || "").trim(),
      subscriptionId: String(current.subId),
      dateBooking: String(cancelDate),    // YYYY-MM-DD
      timeBooking: String(timeWithSec),   // HH:mm:ss
    };

    try {
      setCancelSubmitting(true);
      await api.post("/Booking/booking-cancel-plan", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("✅ Subscription cancel request created successfully!");
      setShowCancelModal(false);
      // Điều hướng tới trang transaction để xem yêu cầu huỷ/hoàn
      navigate("/user/transaction");
    } catch (err) {
      console.error("❌ Cancel failed:", err?.response?.data || err);
      alert(err?.response?.data?.message || "Failed to cancel!");
    } finally {
      setCancelSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-white">
        <div className="h-10 w-10 border-4 border-[#2f66ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!current)
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-xl mx-auto mt-20 bg-white p-8 rounded-2xl shadow-sm border">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium bg-[#e5edff] text-[#2f66ff] mb-3">
            <i className="bi bi-box-seam" />
            Subscription
          </div>
          <h3 className="text-2xl font-semibold mb-2 text-gray-900">
            {apiMessage || "No active subscription"}
          </h3>
          <p className="text-gray-600 mb-6">
            Register now to enjoy battery swaps and exclusive benefits.
          </p>
          <button
            onClick={() => navigate("/user/service/register")}
            className="px-6 py-2.5 rounded-xl text-white bg-[#2f66ff] hover:bg-[#254fcc] transition font-medium"
          >
            <span className="inline-flex items-center gap-2">
              <i className="bi bi-plus-circle" />
              Register new Service
            </span>
          </button>
        </div>
      </div>
    );

  // Right-side battery pills data
  const batteryIds =
    Array.isArray(current?.batteryDtos) && current.batteryDtos.length > 0
      ? current.batteryDtos.map((b) => b.batteryId)
      : [];
  const MAX_SHOW = 6;
  const showList = showAllBats ? batteryIds : batteryIds.slice(0, MAX_SHOW);
  const overflow = Math.max(0, batteryIds.length - MAX_SHOW);

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#2f66ff] text-white grid place-items-center shadow-sm">
              <i className="bi bi-box-seam text-lg" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                <span className="text-[#2f66ff]">Subscription</span>
              </h2>
              <p className="text-gray-500 text-sm">Manage your current plan &amp; usage details</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEFT: Current Plan */}
          <div className="bg-white border rounded-2xl shadow-sm p-6">
            <div className="mb-5">
              <p className="text-sm text-gray-500 mb-1">Current subscription</p>
              <h3 className="text-2xl font-bold text-gray-900">{current.planName}</h3>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Subscription</label>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#2f66ff]"
              >
                {subs.map((s) => (
                  <option key={s.subId} value={s.subId}>
                    {s.subId} — {s.planName}
                  </option>
                ))}
              </select>
            </div>

            {/* Emphasis blocks */}
            <div className="space-y-3 mb-6">
              <EmphasisBox tone={statusTone(current?.planStatus)}>
                <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
                <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${String(current?.planStatus || "Active").toLowerCase() === "active"
                      ? "bg-emerald-500"
                      : "bg-rose-500"
                      }`}
                  />
                  {current?.planStatus || "Active"}
                </p>
              </EmphasisBox>

              <EmphasisBox tone={endTone}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">End date</p>
                    <p className="mt-1 font-semibold text-gray-900">{current.endDate || "—"}</p>
                  </div>
                  {typeof daysLeft === "number" && daysLeft <= 14 && (
                    <span
                      className={`mt-1 text-[11px] px-2 py-0.5 rounded-full border ${daysLeft <= 7
                        ? "bg-rose-50 border-rose-200 text-rose-700"
                        : "bg-amber-50 border-amber-200 text-amber-700"
                        }`}
                      title={`${daysLeft} days left`}
                    >
                      {daysLeft <= 7 ? "Expiring soon" : "Coming up"}
                    </span>
                  )}
                </div>
              </EmphasisBox>
            </div>

            <div className="flex flex-col gap-3">
              {/* Cancel */}
              <button
                onClick={() => {
                  setShowCancelModal(true);
                  // reset mặc định mỗi lần mở
                  setCancelDate(formatDateYYYYMMDD(new Date()));
                  setCancelTime(formatTimeHHmm(new Date()));
                  loadStations();
                }}
                className="w-full py-2.5 rounded-xl font-medium border border-[#2f66ff] text-[#2f66ff] hover:bg-[#e5edff] transition"
              >
                <span className="inline-flex items-center gap-2">
                  <i className="bi bi-x-circle" />
                  Cancel Subscription
                </span>
              </button>

              {/* Register new Service */}
              <button
                onClick={() => navigate("/user/service/register")}
                className="w-full py-2.5 rounded-xl font-medium text-white bg-[#2f66ff] hover:bg-[#254fcc] transition"
              >
                <span className="inline-flex items-center gap-2">
                  <i className="bi bi-plus-circle" />
                  Register new Service
                </span>
              </button>
            </div>
          </div>

          {/* RIGHT: Usage Statistics */}
          <div className="bg-white border rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Usage statistics</h3>
              <span className="text-xs text-gray-500">Last update: {new Date().toLocaleTimeString()}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatTile
                tone={swapTone}
                icon="arrow-repeat"
                label="Swaps remaining"
                value={remaining}
                hint="Remaining swaps in your plan"
                chip={swapTone === "danger" ? "Low" : swapTone === "warn" ? "Watch" : "OK"}
              />
              <StatTile
                tone="brand"
                icon="speedometer2"
                label="Distance traveled"
                value={formatAmountVN(current.current_miligate)}
                unit="km"
                hint="Total distance recorded"
                chip="Odometer"
              />
              <StatTile
                tone="brand"
                icon="wallet2"
                label="Total charge"
                value={formatAmountVN(current.subFee)}
                unit="VND"
                hint="Plan fee / billing"
                chip="Billing"
              />
            </div>

            {/* Batteries assigned + Plan status */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <EmphasisBox tone="muted">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Batteries assigned</p>
                {batteryIds.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {showList.map((id) => (
                      <span key={id} className="px-2.5 py-1 rounded-full border bg-white text-gray-700 text-xs">
                        <i className="bi bi-battery-full mr-1" />
                        {id}
                      </span>
                    ))}
                    {overflow > 0 && !showAllBats && (
                      <button
                        onClick={() => setShowAllBats(true)}
                        className="px-2.5 py-1 rounded-full border text-[#2f66ff] bg-white text-xs hover:bg-[#e5edff]"
                      >
                        +{overflow} more
                      </button>
                    )}
                    {showAllBats && batteryIds.length > MAX_SHOW && (
                      <button
                        onClick={() => setShowAllBats(false)}
                        className="px-2.5 py-1 rounded-full border text-[#2f66ff] bg-white text-xs hover:bg-[#e5edff]"
                      >
                        Hide
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No batteries assigned</p>
                )}
              </EmphasisBox>

              <EmphasisBox tone={statusTone(current?.planStatus)}>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Plan status</p>
                <div className="inline-flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${String(current?.planStatus || "Active").toLowerCase() === "active"
                      ? "bg-emerald-500"
                      : "bg-rose-500"
                      }`}
                  />
                  <span className="text-sm font-medium text-gray-900">{current?.planStatus || "Active"}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-sm text-gray-600">End: {current.endDate || "—"}</span>
                </div>
              </EmphasisBox>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Cancel */}
      {showCancelModal && (
        <Modal onClose={() => setShowCancelModal(false)} title="Cancel Subscription" tone="danger">
          <div className="space-y-4">
            <FieldLabel>Select Station</FieldLabel>
            <select
              className="w-full border rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#2f66ff]"
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
            >
              {stations.map((st) => (
                <option key={st.stationId} value={st.stationId}>
                  {st.stationName}
                </option>
              ))}
            </select>

            <FieldLabel>Booking Date</FieldLabel>
            <input
              type="date"
              className="w-full border rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#2f66ff]"
              value={cancelDate}
              onChange={(e) => setCancelDate(e.target.value)}
            />

            <FieldLabel>Booking Time</FieldLabel>
            <input
              type="time"
              className="w-full border rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#2f66ff]"
              value={cancelTime}
              onChange={(e) => setCancelTime(e.target.value)}
            />

            <FieldLabel>Reason (optional)</FieldLabel>
            <textarea
              className="w-full border rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#2f66ff]"
              placeholder="Enter note..."
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
              rows={4}
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl border border-[#2f66ff] text-[#2f66ff] hover:bg-[#e5edff]"
                disabled={cancelSubmitting}
              >
                Close
              </button>
              <button
                onClick={handleCancelSubscription}
                className="px-4 py-2 rounded-xl text-white bg-[#2f66ff] hover:bg-[#254fcc] disabled:opacity-60"
                disabled={!selectedStation || !cancelDate || !cancelTime || cancelSubmitting}
              >
                {cancelSubmitting ? "Submitting…" : "Confirm"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ====================== UI helpers ====================== */
function statusTone(status) {
  const s = String(status || "active").toLowerCase();
  return s === "active" ? "success" : "danger";
}

function EmphasisBox({ children, tone = "muted" }) {
  const cls = toneToClasses(tone, true);
  return <div className={`rounded-xl p-4 border ${cls}`}>{children}</div>;
}

function toneToClasses(tone, outlined = false) {
  switch (tone) {
    case "brand":
      return outlined ? "border-[#2f66ff]/40 bg-[#e5edff]" : "bg-[#e5edff]";
    case "success":
      return outlined ? "border-emerald-300 bg-emerald-50" : "bg-emerald-50";
    case "warn":
      return outlined ? "border-amber-300 bg-amber-50" : "bg-amber-50";
    case "danger":
      return outlined ? "border-rose-300 bg-rose-50" : "bg-rose-50";
    default:
      return outlined ? "border-gray-200 bg-white" : "bg-white";
  }
}

function StatTile({ label, value, unit, hint, icon = "circle", chip, tone = "muted" }) {
  const classes = toneToClasses(tone, true);
  return (
    <div className={`rounded-2xl p-4 border ${classes} overflow-hidden`}>
      <div className="flex items-center justify-between mb-2">
        <div className="h-9 w-9 rounded-xl bg-[#2f66ff] text-white grid place-items-center shrink-0">
          <i className={`bi bi-${icon}`} />
        </div>
        {chip && (
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full border ${tone === "danger"
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : tone === "warn"
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : tone === "brand"
                  ? "bg-[#e5edff] border-[#2f66ff]/30 text-[#2f66ff]"
                  : "bg-white border-gray-200 text-gray-600"
              }`}
          >
            {chip}
          </span>
        )}
      </div>

      <div className="min-w-0 max-w-full">
        <p
          className={`leading-tight break-words ${tone === "danger"
            ? "text-rose-600"
            : tone === "warn"
              ? "text-amber-600"
              : tone === "brand"
                ? "text-[#2f66ff]"
                : "text-gray-900"
            }`}
        >
          <span className="block text-[clamp(1.35rem,2.8vw,2rem)] font-extrabold whitespace-nowrap tracking-tight">
            {value}
          </span>
          {unit && <span className="block text-sm font-semibold text-gray-800 mt-0.5">{unit}</span>}
        </p>
      </div>

      <p className="text-gray-700 text-sm mt-1">{label}</p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function FieldLabel({ children }) {
  return <label className="block text-sm font-medium text-gray-700 mb-1">{children}</label>;
}

function Modal({ children, title, onClose, tone = "default" }) {
  const toneBar =
    tone === "danger" ? "bg-rose-100 text-rose-700" : "bg-[#e5edff] text-[#2f66ff]";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-[90%] max-w-md rounded-2xl shadow-2xl border overflow-hidden">
        <div className={`px-5 py-3 text-sm font-medium ${toneBar}`}>{title}</div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function formatAmountVN(n) {
  const num = typeof n === "string" ? Number(n.replace(/[^\d.-]/g, "")) || 0 : Number(n || 0);
  return num.toLocaleString("vi-VN", { maximumFractionDigits: 0 });
}

// ========= NEW: tiny format helpers =========
function pad2(n) {
  return String(n).padStart(2, "0");
}
function formatDateYYYYMMDD(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}
function formatTimeHHmm(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`; // HH:mm
}
