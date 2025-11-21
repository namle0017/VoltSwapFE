// src/pages/user/Station.jsx
import React, { useEffect, useRef, useState } from "react";
import api from "@/api/api";
import { useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

/* ================== VOLTSWAP THEME ================== */
const BRAND = {
  "--brand-start": "#1ee3b3",
  "--brand-end": "#2f66ff",
  "--brand-50": "#f5faff",
  "--brand-500": "#2f66ff",
  "--brand-600": "#2856d4",
};

/* ================== CONFIG ================== */
const WARNING_THRESHOLD = 30;
const MUTE_KEY = "bookingMuted";
const CHECK_STATUS_EP = "/Booking/check-status-booking"; // <— dùng endpoint mới

// Leaflet default icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// User location icon
const userIcon = L.divIcon({
  className: "user-pin",
  html: `<div style="
    display:grid;place-items:center;width:28px;height:28px;border-radius:50%;
    background:#2f66ff;color:#fff;font-size:14px;font-weight:700;
    box-shadow:0 0 0 3px rgba(47,102,255,.2)
  ">🧍</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// distance (km)
const haversineKm = (a, b) => {
  if (!a || !b) return 0;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

// format seconds -> mm:ss
const formatMMSS = (sec) => {
  const s = Math.max(0, Number(sec) || 0);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}m ${String(ss).padStart(2, "0")}s`;
};

/* ================== GENERIC MESSAGE MODAL ================== */
const TONE_STYLES = {
  info: {
    bar: "bg-[#e5edff] text-[#2f66ff]",
    btn: "bg-[#2f66ff] hover:bg-[#254fcc]",
  },
  success: {
    bar: "bg-emerald-50 text-emerald-700",
    btn: "bg-emerald-600 hover:bg-emerald-700",
  },
  danger: {
    bar: "bg-rose-50 text-rose-700",
    btn: "bg-rose-600 hover:bg-rose-700",
  },
};

function MessageModal({ title, message, tone = "info", onClose }) {
  const toneCfg = TONE_STYLES[tone] || TONE_STYLES.info;
  const lines = String(message || "").split(/\n+/);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-[90%] max-w-md rounded-2xl shadow-2xl border overflow-hidden">
        <div className={`px-5 py-3 text-sm font-semibold ${toneCfg.bar}`}>
          {title || "Notification"}
        </div>
        <div className="p-5 space-y-2 text-sm text-gray-700">
          {lines.map((l, idx) => (
            <p key={idx}>{l}</p>
          ))}
        </div>
        <div className="px-5 pb-4 flex justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-white text-sm font-medium ${toneCfg.btn} transition`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================== COUNTDOWN BANNER ================== */
function BookingCountdownBanner({
  remain,
  stationName,
  transactionId,
  appointmentId,
  onNavigate,
  onDismiss,
}) {
  if (remain <= 0) return null;
  const danger = remain <= WARNING_THRESHOLD;

  return (
    <div className="sticky top-0 z-[60] mb-4">
      <div
        className={[
          "mx-auto max-w-5xl rounded-xl border shadow px-4 py-3",
          danger
            ? "border-red-300 bg-red-50"
            : "border-[color:rgba(47,102,255,0.25)] bg-[color:rgba(47,102,255,0.06)]",
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          <div
            className={`text-xl ${
              danger ? "text-red-600" : "text-[var(--brand-600)]"
            }`}
          >
            ⏳
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">
              You have an active booking{" "}
              {stationName ? `at ${stationName}` : ""}.
            </div>
            <div className="text-sm text-gray-700 mt-0.5">
              Auto-cancel in{" "}
              <b
                className={danger ? "text-red-600" : "text-[var(--brand-600)]"}
              >
                {formatMMSS(remain)}
              </b>
              .
              {transactionId ? (
                <>
                  {" "}
                  • TX: <span className="font-mono">{transactionId}</span>
                </>
              ) : null}
              {appointmentId ? (
                <>
                  {" "}
                  • AP: <span className="font-mono">{appointmentId}</span>
                </>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigate}
              className={[
                "px-3 py-1.5 rounded-lg text-white text-sm shadow",
                danger
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-[#2f66ff] hover:bg-[#254fcc]",
              ].join(" ")}
            >
              Navigate now
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 rounded-lg border text-sm hover:bg-white/60"
              title="Hide this reminder"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================== PAGE ================== */
export default function Station() {
  const navigate = useNavigate();

  // BE state
  const [stations, setStations] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  // booking/modal
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedSub, setSelectedSub] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [showModal, setShowModal] = useState(false);

  // navigate-modal
  const [navStation, setNavStation] = useState(null);
  const [navSub, setNavSub] = useState("");

  // navigate visualization
  const [userPos, setUserPos] = useState(null);
  const [targetId, setTargetId] = useState(null);
  const [route, setRoute] = useState(null);
  const mapRef = useRef(null);

  // countdown banner state
  const [bannerRemain, setBannerRemain] = useState(0);
  const [bannerInfo, setBannerInfo] = useState({
    stationName: "",
    transactionId: "",
    appointmentId: "",
  });
  const [bannerHidden, setBannerHidden] = useState(false);
  const [bannerMuted, setBannerMuted] = useState(false);

  // message modal
  const [msgModal, setMsgModal] = useState(null);

  const pollRef = useRef(null);
  const countdownRef = useRef(null);

  // === POLLING FUNCTION: start checking booking status ===
  const startPolling = (bookingId) => {
    if (!bookingId) return;

    if (pollRef.current) clearInterval(pollRef.current);
    console.log("Start polling booking status for ID:", bookingId);

    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`${CHECK_STATUS_EP}?BookingId=${bookingId}`);
        const msg = res?.data?.message || "";
        const status = String(res?.data?.data ?? "").toLowerCase();

        console.log("Polling response:", msg, "| Status:", status);

        if (status.includes("done") || status.includes("completed")) {
          clearInterval(pollRef.current);
          pollRef.current = null;

          localStorage.removeItem("lockExpireAt");
          localStorage.removeItem("lastBookingId");
          localStorage.removeItem("lastAppointmentId");
          localStorage.removeItem("lastTransactionId");
          localStorage.removeItem("swap_stationId");
          localStorage.removeItem("swap_stationName");

          setBannerRemain(0);
          setBannerHidden(true);
          setBannerInfo({
            stationName: "",
            transactionId: "",
            appointmentId: "",
          });

          notify("Booking Completed", "Your booking is now done!");
          setMsgModal({
            title: "Booking Completed",
            message: `Booking ${bookingId} completed successfully!`,
            tone: "success",
          });
        } else if (status.includes("cancel")) {
          clearInterval(pollRef.current);
          pollRef.current = null;

          localStorage.removeItem("lockExpireAt");
          localStorage.removeItem("lastBookingId");
          localStorage.removeItem("lastAppointmentId");
          localStorage.removeItem("lastTransactionId");
          localStorage.removeItem("swap_stationId");
          localStorage.removeItem("swap_stationName");

          setBannerRemain(0);
          setBannerHidden(true);
          setBannerInfo({
            stationName: "",
            transactionId: "",
            appointmentId: "",
          });

          notify("Booking Cancelled", "Your booking was cancelled.");
          setMsgModal({
            title: "Booking Cancelled",
            message: `Booking ${bookingId} was cancelled.`,
            tone: "danger",
          });
        }
      } catch (err) {
        console.error(
          "Polling failed (unexpected network/500):",
          err?.response?.data || err
        );
        const statusText = String(
          err?.response?.data?.data ?? ""
        ).toLowerCase();
        if (statusText.includes("cancel")) {
          clearInterval(pollRef.current);
          pollRef.current = null;

          localStorage.removeItem("lockExpireAt");
          localStorage.removeItem("lastBookingId");
          localStorage.removeItem("lastAppointmentId");
          localStorage.removeItem("lastTransactionId");
          localStorage.removeItem("swap_stationId");
          localStorage.removeItem("swap_stationName");

          setBannerRemain(0);
          setBannerHidden(true);
          setBannerInfo({
            stationName: "",
            transactionId: "",
            appointmentId: "",
          });

          notify("Booking Cancelled", "Your booking was cancelled.");
          setMsgModal({
            title: "Booking Cancelled",
            message: `Booking ${bookingId} was cancelled.`,
            tone: "danger",
          });
        }
      }
    }, 10000);
  };

  const notify = (title, body) => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((p) => {
        if (p === "granted") new Notification(title, { body });
      });
    }
  };

  // load initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const userId = localStorage.getItem("userId");
        if (!token || !userId) {
          setMsgModal({
            title: "Session expired",
            message: "Please log in again to continue.",
            tone: "danger",
            onClose: () => navigate("/login"),
          });
          return;
        }

        const [stationRes, subRes] = await Promise.all([
          api.get("Station/station-list"),
          api.get(`/Subscription/subscription-user-list?DriverId=${userId}`),
        ]);

        setStations(stationRes.data?.data || []);
        setSubs(subRes.data?.data || []);
      } catch (err) {
        console.error("Failed to load data:", err.response?.data || err);
        setMsgModal({
          title: "Failed to load data",
          message: "There was an error loading stations or subscriptions.",
          tone: "danger",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // restore active booking countdown + mute flag
  useEffect(() => {
    const expireAt = Number(localStorage.getItem("lockExpireAt") || 0);
    const transactionId = localStorage.getItem("lastTransactionId") || "";
    const appointmentId = localStorage.getItem("lastAppointmentId") || "";
    const stationName = localStorage.getItem("swap_stationName") || "";
    const muted = localStorage.getItem(MUTE_KEY) === "1";
    setBannerMuted(muted);
    if (expireAt > Date.now()) {
      setBannerInfo({ stationName, transactionId, appointmentId });
      setBannerHidden(false);
      setBannerRemain(Math.ceil((expireAt - Date.now()) / 1000));
    }
  }, []);

  // ticking countdown
  useEffect(() => {
    if (bannerHidden || bannerMuted || bannerRemain <= 0) return;

    if (countdownRef.current) clearInterval(countdownRef.current);

    countdownRef.current = setInterval(() => {
      setBannerRemain((s) => {
        const next = s - 1;
        if (next <= 0) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
          localStorage.removeItem("lockExpireAt");
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [bannerRemain, bannerHidden, bannerMuted]);

  /* ===== Poll every 10s to check Booking status ===== */
  useEffect(() => {
    const bookingId =
      localStorage.getItem("lastBookingId") ||
      localStorage.getItem("bookingId");

    if (!bookingId) return;

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // draw route & highlight
  const handleNavigateVisual = (st) => {
    setTargetId(st.stationId);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const up = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserPos(up);
          const tp = { lat: st.locationLat, lng: st.locationLon };
          setRoute([
            [up.lat, up.lng],
            [tp.lat, tp.lng],
          ]);

          if (mapRef.current) {
            const bounds = L.latLngBounds(
              L.latLng(up.lat, up.lng),
              L.latLng(tp.lat, tp.lng)
            );
            mapRef.current.fitBounds(bounds.pad(0.25));
          }
        },
        () => {
          const tp = { lat: st.locationLat, lng: st.locationLon };
          setUserPos(null);
          setRoute(null);
          if (mapRef.current) mapRef.current.setView([tp.lat, tp.lng], 15);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 }
      );
    } else {
      const tp = { lat: st.locationLat, lng: st.locationLon };
      if (mapRef.current) mapRef.current.setView([tp.lat, tp.lng], 15);
    }
  };

  const handleBookSwap = (station) => {
    setSelectedStation(station);
    setShowModal(true);
  };

  // NAVIGATE MODAL
  const openNavigateModal = (station) => {
    setNavStation(station);
    setNavSub(selectedSub || "");
  };

  const confirmNavigate = () => {
    if (!navSub) {
      setMsgModal({
        title: "Select subscription",
        message: "Please choose a subscription plan before continuing.",
        tone: "danger",
      });
      return;
    }
    const chosen = subs.find((s) => s.subId === navSub);
    if (!chosen) {
      setMsgModal({
        title: "Invalid subscription",
        message:
          "The selected subscription is not available. Please choose another one.",
        tone: "danger",
      });
      return;
    }

    localStorage.setItem("swap_stationId", navStation.stationId);
    localStorage.setItem("swap_stationName", navStation.stationName || "");
    localStorage.setItem("swap_subscriptionId", chosen.subId);
    localStorage.setItem("swap_subscriptionName", chosen.planName);

    navigate("/stations", {
      state: {
        stationId: navStation.stationId,
        stationName: navStation.stationName,
        subscriptionId: chosen.subId,
        subscriptionName: chosen.planName,
      },
    });

    setNavStation(null);
    setNavSub("");
  };

  // BOOKING FLOW
  const confirmBooking = async () => {
    if (!selectedSub || !bookingDate || !bookingTime) {
      setMsgModal({
        title: "Incomplete information",
        message: "Please select subscription, date and time before booking.",
        tone: "danger",
      });
      return;
    }

    // 👉 TẠO DATETIME ĐÃ CHỌN
    const chosenDateTime = new Date(`${bookingDate}T${bookingTime}:00`);
    const now = new Date();

    // ❌ Không cho chọn thời điểm trong quá khứ
    if (chosenDateTime <= now) {
      setMsgModal({
        title: "Invalid booking time",
        message: "Booking time must be later than the current time.",
        tone: "danger",
      });
      return;
    }

    const token = localStorage.getItem("token");
    const userDriverId = localStorage.getItem("userId");
    if (!token || !userDriverId) {
      setMsgModal({
        title: "Session expired",
        message: "Please log in again to continue.",
        tone: "danger",
        onClose: () => navigate("/login"),
      });
      return;
    }

    const dateBooking = new Date(bookingDate).toISOString().split("T")[0];
    const timeBooking =
      bookingTime && bookingTime.length === 5
        ? `${bookingTime}:00`
        : bookingTime;

    const payload = {
      stationId: selectedStation.stationId,
      driverId: userDriverId,
      note: "Swap battery",
      subscriptionId: selectedSub,
      dateBooking,
      timeBooking,
    };

    try {
      const res = await api.post("/Booking/create-booking", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Booking response:", res.data);

      const booking = res?.data?.data?.booking || {};
      const lockSeconds =
        Number(res?.data?.data?.time ?? res?.data?.time ?? 0) || 0;

      const appointmentId = booking.appointmentId || "";

      if (appointmentId) {
        localStorage.setItem("lastBookingId", appointmentId);
        localStorage.setItem("lastAppointmentId", appointmentId);
        console.log("Saved lastBookingId (appointmentId):", appointmentId);
        startPolling(appointmentId);
      } else {
        console.warn("⚠️ No appointmentId in booking response!");
      }

      localStorage.setItem("swap_stationId", selectedStation.stationId);
      localStorage.setItem(
        "swap_stationName",
        selectedStation.stationName || ""
      );
      localStorage.setItem("swap_subscriptionId", selectedSub);
      if (booking.transactionId)
        localStorage.setItem("lastTransactionId", booking.transactionId);
      localStorage.setItem("lastPlanId", booking.subscriptionId || selectedSub);
      localStorage.removeItem(MUTE_KEY);
      setBannerMuted(false);

      if (lockSeconds > 0) {
        const expireAt = Date.now() + lockSeconds * 1000;
        localStorage.setItem("lockExpireAt", String(expireAt));
        setBannerInfo({
          stationName: selectedStation.stationName || "",
          transactionId: booking.transactionId || "",
          appointmentId,
        });
        setBannerHidden(false);
        setBannerRemain(lockSeconds);

        notify(
          "Booking created",
          `Batteries locked at ${
            selectedStation.stationName
          }. Expires in ${formatMMSS(lockSeconds)}`
        );
      }

      setMsgModal({
        title: "Booking created",
        message: [
          `Station: ${selectedStation.stationName}`,
          `Transaction: ${booking.transactionId || "—"}`,
          `Appointment: ${appointmentId || "—"}`,
          `Time: ${dateBooking} ${timeBooking}`,
          lockSeconds
            ? `Lock time: ${formatMMSS(lockSeconds)}`
            : "Lock time not available.",
          "",
          "You can press Navigate to go to the station.",
        ]
          .filter(Boolean)
          .join("\n"),
        tone: "success",
      });

      setShowModal(false);
    } catch (err) {
      const v = err?.response?.data;
      const msg =
        (typeof v === "object" && (v.message || v.title)) ||
        (typeof v === "string" && v) ||
        err.message;
      console.error("❌ Booking error:", err?.response || err);
      setMsgModal({
        title: "Booking failed",
        message: msg || "Unknown error",
        tone: "danger",
      });
    }
  };

  if (loading)
    return (
      <div className="flex justify-center mt-20" style={BRAND}>
        <div className="h-10 w-10 border-4 border-[var(--brand-500)] border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const defaultCenter = [10.7769, 106.7009];
  const subOptionLabel = (s) =>
    `${s.planName} — ID: ${s.subId} — ${s.planStatus}`;

  const SelectedSubInfo = ({ subId }) => {
    const s = subs.find((x) => x.subId === subId);
    if (!s) return null;
    return (
      <div
        className="text-xs text-gray-600 bg-[var(--brand-50)] border border-[var(--brand-500)]/20 rounded-md px-2 py-1"
        style={BRAND}
      >
        Selected: <span className="font-medium">{s.planName}</span> —{" "}
        <span className="font-mono">ID: {s.subId}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white p-6" style={BRAND}>
      {/* Booking countdown banner */}
      {!bannerHidden && !bannerMuted && bannerRemain > 0 && (
        <BookingCountdownBanner
          remain={bannerRemain}
          stationName={bannerInfo.stationName}
          transactionId={bannerInfo.transactionId}
          appointmentId={bannerInfo.appointmentId}
          onNavigate={() => {
            if (bannerRemain > WARNING_THRESHOLD) {
              localStorage.setItem(MUTE_KEY, "1");
              setBannerMuted(true);
              setBannerHidden(true);
            }
            const st =
              stations.find((s) => s.stationName === bannerInfo.stationName) ||
              stations.find(
                (s) => s.stationId === localStorage.getItem("swap_stationId")
              );
            if (st) {
              handleNavigateVisual(st);
              openNavigateModal(st);
            } else {
              navigate("/stations", {
                state: {
                  stationId: localStorage.getItem("swap_stationId") || "",
                  stationName: bannerInfo.stationName || "",
                  subscriptionId:
                    localStorage.getItem("swap_subscriptionId") || "",
                  subscriptionName:
                    localStorage.getItem("swap_subscriptionName") || "",
                },
              });
            }
          }}
          onDismiss={() => setBannerHidden(true)}
        />
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--brand-50)] border border-[var(--brand-500)]/20 text-[var(--brand-600)] text-xs font-medium">
          <span className="h-2 w-2 rounded-full bg-[var(--brand-500)]" />
          Station Explorer
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 mt-2">
          Battery Swap Stations
        </h2>
        <p className="text-gray-600 text-sm mt-1">
          Find a nearby station, book a time slot, and navigate with a live
          route preview.
        </p>
      </div>

      {/* Map */}
      <div className="max-w-7xl mx-auto rounded-3xl border border-gray-100 shadow overflow-hidden mb-6">
        <MapContainer
          center={defaultCenter}
          zoom={6}
          scrollWheelZoom
          className="h-96 w-full z-0"
          whenCreated={(m) => (mapRef.current = m)}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {stations.map((st) => (
            <Marker
              key={st.stationId}
              position={[st.locationLat, st.locationLon]}
            >
              <Popup>
                <div className="text-sm">
                  <strong className="text-gray-900">{st.stationName}</strong>
                  <p className="text-gray-600">{st.stationAddress}</p>
                  <p className="text-gray-700">
                    <i className="bi bi-battery-full text-green-600"></i>{" "}
                    {st.batteryAvailable}/{st.totalBattery} batteries
                  </p>

                  {userPos && (
                    <p className="mt-1 text-xs text-gray-500">
                      <i className="bi bi-rulers"></i> ~
                      {haversineKm(userPos, {
                        lat: st.locationLat,
                        lng: st.locationLon,
                      }).toFixed(1)}
                      km • ETA ~
                      {Math.round(
                        (haversineKm(userPos, {
                          lat: st.locationLat,
                          lng: st.locationLon,
                        }) /
                          40) *
                          60
                      )}{" "}
                      mins
                    </p>
                  )}

                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleBookSwap(st)}
                      className="px-2.5 py-1.5 text-xs rounded-lg text-white shadow"
                      style={{
                        backgroundColor: "#2f66ff",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.backgroundColor = "#2758d8")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.backgroundColor = "#2f66ff")
                      }
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <i className="bi bi-lightning-charge-fill" />
                        <span>Book Swap</span>
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        handleNavigateVisual(st);
                        openNavigateModal(st);
                      }}
                      className="px-2.5 py-1.5 text-xs rounded-lg border hover:bg-[var(--brand-50)]"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <i className="bi bi-geo-alt-fill text-blue-600" />
                        <span>Navigate</span>
                      </span>
                    </button>
                  </div>
                </div>
              </Popup>

              {targetId === st.stationId && (
                <Circle
                  center={[st.locationLat, st.locationLon]}
                  radius={450}
                  pathOptions={{
                    color: "#1ee3b3",
                    fillColor: "#1ee3b3",
                    fillOpacity: 0.15,
                  }}
                />
              )}
            </Marker>
          ))}

          {userPos && (
            <Marker position={[userPos.lat, userPos.lng]} icon={userIcon} />
          )}
          {route && (
            <Polyline
              positions={route}
              dashArray="6 8"
              color="#2f66ff"
              weight={4}
            />
          )}
        </MapContainer>
      </div>

      {/* Station list */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Nearby Stations</h3>
          <span className="text-xs text-gray-500">
            {stations.length} station{stations.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {stations.map((st) => {
            const pct = Number(st.availablePercent ?? 0);
            const pct2 = pct.toFixed(2);
            const band =
              pct >= 70
                ? "from-emerald-400 to-emerald-500"
                : pct >= 40
                ? "from-amber-400 to-amber-500"
                : "from-rose-400 to-rose-500";

            return (
              <div
                key={st.stationId}
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {st.stationName}
                    </h4>
                    <p className="text-sm text-gray-500">{st.stationAddress}</p>
                    <p className="text-sm text-gray-700 mt-1">
                      <i className="bi bi-battery-full text-green-600"></i>{" "}
                      {st.batteryAvailable}/{st.totalBattery} batteries
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-gray-500">Availability</div>
                    <div className="mt-1 w-40 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-2 bg-gradient-to-r ${band}`}
                        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{pct2}%</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleNavigateVisual(st)}
                    className="px-3 py-1.5 border rounded-lg hover:bg-[var(--brand-50)] text-gray-700"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <i className="bi bi-eye" />
                      <span>Preview Route</span>
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      handleNavigateVisual(st);
                      openNavigateModal(st);
                    }}
                    className="px-3 py-1.5 border rounded-lg hover:bg-[var(--brand-50)] text-gray-700"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <i className="bi bi-geo-alt-fill text-blue-600" />
                      <span>Navigate</span>
                    </span>
                  </button>
                  <button
                    onClick={() => handleBookSwap(st)}
                    className="px-3 py-1.5 rounded-lg text-white shadow"
                    style={{
                      backgroundColor: "#2f66ff",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#2758d8")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "#2f66ff")
                    }
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <i className="bi bi-lightning-charge-fill" />
                      <span>Book Swap</span>
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Booking */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden border border-gray-100">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-3 text-center text-gray-900">
                Booking at {selectedStation?.stationName}
              </h3>

              <label className="block text-sm font-medium mb-1">
                Select Subscription
              </label>
              <select
                value={selectedSub}
                onChange={(e) => setSelectedSub(e.target.value)}
                className="w-full border p-2.5 rounded-xl mb-2 focus:outline-none focus:ring-4 focus:ring-[color:rgba(47,102,255,0.15)] focus:border-[var(--brand-500)]"
                style={BRAND}
              >
                <option value="">Choose plan</option>
                {subs.length > 0 ? (
                  subs.map((s) => (
                    <option key={s.subId} value={s.subId}>
                      {subOptionLabel(s)}
                    </option>
                  ))
                ) : (
                  <option disabled>No active subscriptions</option>
                )}
              </select>
              <SelectedSubInfo subId={selectedSub} />

              <label className="block text-sm font-medium mb-1 mt-3">
                Date
              </label>
              <input
                type="date"
                value={bookingDate}
                min={new Date().toISOString().split("T")[0]} // ⬅ hạn chế ngày nhỏ hơn hôm nay
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full border p-2.5 rounded-xl mb-3 focus:outline-none focus:ring-4 focus:ring-[color:rgba(47,102,255,0.15)] focus:border-[var(--brand-500)]"
                style={BRAND}
              />

              <label className="block text-sm font-medium mb-1">Time</label>
              <input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className="w-full border p-2.5 rounded-xl mb-4 focus:outline-none focus:ring-4 focus:ring-[color:rgba(47,102,255,0.15)] focus:border-[var(--brand-500)]"
                style={BRAND}
              />

              <div className="flex justify-between">
                <button
                  onClick={confirmBooking}
                  className="px-4 py-2.5 rounded-xl text-white bg-[#2f66ff] hover:bg-[#254fcc] active:bg-[#2144aa] shadow"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border hover:bg-[var(--brand-50)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Navigate */}
      {navStation && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden border border-gray-100">
            <div className="h-2 bg-gradient-to-r from-[var(--brand-start)] to-[var(--brand-end)]" />
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-3 text-center text-gray-900">
                Navigate to {navStation?.stationName}
              </h3>

              <label className="block text-sm font-medium mb-1">
                Select Subscription
              </label>
              <select
                value={navSub}
                onChange={(e) => setNavSub(e.target.value)}
                className="w-full border p-2.5 rounded-xl mb-2 focus:outline-none focus:ring-4 focus:ring-[color:rgba(47,102,255,0.15)] focus:border-[var(--brand-500)]"
                style={BRAND}
              >
                <option value="">Choose plan</option>
                {subs.length > 0 ? (
                  subs.map((s) => (
                    <option key={s.subId} value={s.subId}>
                      {subOptionLabel(s)}
                    </option>
                  ))
                ) : (
                  <option disabled>No active subscriptions</option>
                )}
              </select>
              <SelectedSubInfo subId={navSub} />

              <div className="flex justify-between mt-4">
                <button
                  onClick={confirmNavigate}
                  className="px-4 py-2.5 rounded-xl text-white bg-[#2f66ff] hover:bg-[#254fcc] active:bg-[#2144aa] shadow"
                >
                  Go to Simulation
                </button>
                <button
                  onClick={() => {
                    setNavStation(null);
                    setNavSub("");
                  }}
                  className="px-4 py-2.5 rounded-xl border hover:bg-[var(--brand-50)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global message modal (replaces alerts) */}
      {msgModal && (
        <MessageModal
          title={msgModal.title}
          message={msgModal.message}
          tone={msgModal.tone}
          onClose={() => {
            const cb = msgModal.onClose;
            setMsgModal(null);
            if (typeof cb === "function") cb();
          }}
        />
      )}
    </div>
  );
}
