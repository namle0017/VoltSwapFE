/* eslint-disable no-unused-vars */
// src/pages/StationSwap.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import {
  getStationList,
  validateSubscription,
  swapInBattery,
  swapOutBattery,
} from "@/api/batterySwapApi";
import api from "@/api/api";

const FALLBACK_STATIONS = [
  { stationId: "STA-10-03-7891", stationName: "Thu Duc Station (Fallback)" },
  { stationId: "STA-01-12-5678", stationName: "District 1 Station (Fallback)" },
];

const toLower = (v) => String(v || "").toLowerCase();
const isValidSubFormat = (sub) => /^SUB-\d{8}$/.test((sub || "").trim());
const isPositiveMsg = (msg = "") => {
  const m = toLower(msg);
  return (
    m.includes("success") ||
    m.includes("ok") ||
    m.includes("please put your battery") ||
    m.includes("validated") ||
    m.includes("valid") ||
    m.includes("please, take batteries")
  );
};

const slotColorClass = (isGreen) => (isGreen ? "bg-emerald-500" : "bg-slate-400");

// ===== Extract helpers =====
const extractSlotsFromResponse = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    if (Array.isArray(raw.pillarSlot)) return raw.pillarSlot;
    if (Array.isArray(raw.pillarSlotDtos)) return raw.pillarSlotDtos;
    if (Array.isArray(raw.data)) return raw.data;
  }
  return [];
};
const extractBatTake = (raw) => {
  if (!raw || typeof raw !== "object") return [];
  if (Array.isArray(raw.batTake)) return raw.batTake;
  if (raw.data && Array.isArray(raw.data.batTake)) return raw.data.batTake;
  return [];
};
const extractSlotEmptyIds = (raw) => {
  if (!raw || typeof raw !== "object") return [];
  if (Array.isArray(raw.slotEmpty)) return raw.slotEmpty;
  if (raw.data && Array.isArray(raw.data.slotEmpty)) return raw.data.slotEmpty;
  return [];
};
const extractReturnBatteryIds = (raw) => {
  if (!raw || typeof raw !== "object") return [];
  const arr = Array.isArray(raw.batteryDtos) ? raw.batteryDtos : [];
  return arr.map((x) => x?.batteryId).filter(Boolean);
};

// ===== Group by pillarId, always 20 slots/pillar =====
const groupSlotsByPillar = (slots = [], currentStationId) => {
  const map = new Map();
  for (const s of slots) {
    const pid = s.pillarId || "UNKNOWN-PILLAR";
    if (!map.has(pid)) map.set(pid, []);
    map.get(pid).push(s);
  }
  for (const [pid, arr] of map) {
    arr.sort((a, b) => (a.slotNumber ?? 0) - (b.slotNumber ?? 0));
    while (arr.length < 20) {
      const nextNum = arr.length + 1;
      arr.push({
        slotId: `fake-${pid}-${nextNum}-${Math.random().toString(36).slice(2, 6)}`,
        slotNumber: nextNum,
        stationId: currentStationId,
        pillarId: pid,
        pillarStatus: "Unavailable",
        batteryStatus: "Available",
        batterySoc: 0,
        batterySoh: 0,
      });
    }
    map.set(pid, arr.slice(0, 20));
  }
  return map;
};

// View step 3 (Swap-Out): only green slots can be taken
const makeStep3ViewMap = (pillarMap, pickedList, focusPillarId) => {
  const allowed = new Set((pickedList || []).map((x) => String(x.slotId)));
  const view = new Map();
  for (const [pid, arr] of pillarMap) {
    const show = !focusPillarId || pid === focusPillarId;
    const cloned = arr.map((s) => {
      const isAllowed = allowed.has(String(s.slotId));
      return { ...s, __dim: !show, __green: isAllowed };
    });
    view.set(pid, cloned);
  }
  return view;
};

// View step 2 (Swap-In): ONLY green slots are those inside slotEmpty from BE; other pillars are dimmed
const makeStep2ViewMap_AllowedSlotsOnly = (
  pillarMap,
  selectedPillarId,
  selectedSlotIds,
  allowedSet
) => {
  const view = new Map();
  const selectedSet = new Set((selectedSlotIds || []).map(String));
  for (const [pid, arr] of pillarMap) {
    const show = !selectedPillarId || pid === selectedPillarId;
    const cloned = arr.map((s) => {
      const isAllowed = allowedSet.has(String(s.slotId));
      return {
        ...s,
        __dim: !show,
        __selected: selectedSet.has(String(s.slotId)),
        __green: isAllowed,
      };
    });
    view.set(pid, cloned);
  }
  return view;
};

const flattenFromPillarMap = (pillarMap) => {
  const entries = Array.from(pillarMap.entries());
  entries.sort(([a], [b]) => String(a).localeCompare(String(b)));
  return entries;
};

export default function StationSwap() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const presetStationId =
    location.state?.stationId ||
    searchParams.get("stationId") ||
    localStorage.getItem("swap_stationId") ||
    "";
  const presetStationName =
    location.state?.stationName ||
    localStorage.getItem("swap_stationName") ||
    "";
  const presetSubscriptionId =
    location.state?.subscriptionId ||
    searchParams.get("subscriptionId") ||
    localStorage.getItem("swap_subscriptionId") ||
    "";
  const isPreset = Boolean(presetStationId && presetSubscriptionId);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [stations, setStations] = useState([]);
  const [stationLoading, setStationLoading] = useState(true);
  const [stationError, setStationError] = useState("");
  const [stationId, setStationId] = useState("");
  const [subscriptionId, setSubscriptionId] = useState("");
  const [subError, setSubError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);

  const [pillarSlotsMap, setPillarSlotsMap] = useState(new Map());
  const [slotIdToPillar, setSlotIdToPillar] = useState(new Map());

  // Swap-In form
  const [batteryIdsInput, setBatteryIdsInput] = useState("");
  const [batteryIdsLocked, setBatteryIdsLocked] = useState(false); // always FALSE so user can edit
  const [swapInResult, setSwapInResult] = useState(null);
  const [swapOutResult, setSwapOutResult] = useState(null);
  const [swapInError, setSwapInError] = useState(null);

  const [outOptions, setOutOptions] = useState([]);
  const [autoPicked, setAutoPicked] = useState([]);
  const [autoPickError, setAutoPickError] = useState("");
  const [swapInCount, setSwapInCount] = useState(0);

  const [selectedPillarId, setSelectedPillarId] = useState("");
  const [pickupPillarId, setPickupPillarId] = useState("");

  const [selectedSlotIds, setSelectedSlotIds] = useState([]);

  // === Rating (optional) ===
  const [ratingScore, setRatingScore] = useState(0); // 0-5
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingDone, setRatingDone] = useState(false); // already submitted or skipped
  const [ratingError, setRatingError] = useState("");

  // ✅ empty slots for Swap-In provided by BE (use slotEmpty only)
  const [allowedSwapIn, setAllowedSwapIn] = useState(new Set());

  const tryParseStations = (raw) => {
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return [];
      }
    }
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object") {
      if (Array.isArray(raw.stations)) return raw.stations;
      if (Array.isArray(raw.data)) return raw.data;
    }
    return [];
  };

  const loadStations = async () => {
    setStationLoading(true);
    setStationError("");
    try {
      const userDriverId = localStorage.getItem("userId");
      let res;
      try {
        res = await api.post("Station/station-list", { DriverId: userDriverId });
      } catch {
        res = await getStationList();
      }
      let list = tryParseStations(res.data);
      list = list.map((s, i) => ({
        stationId: s.stationId ?? s.id ?? s.code ?? `STA-${i}`,
        stationName: s.stationName ?? s.name ?? s.label ?? `Station ${i + 1}`,
      }));
      if (!list.length) throw new Error("Empty station list from backend.");
      setStations(list);
    } catch (e) {
      console.error("getStationList error:", e?.response?.data || e);
      setStationError(
        e?.response?.data?.message || e?.message || "Failed to load station list from backend."
      );
      setStations(FALLBACK_STATIONS);
    } finally {
      setStationLoading(false);
    }
  };

  useEffect(() => {
    loadStations();
  }, []);

  useEffect(() => {
    if (!stationLoading && isPreset) {
      setStationId(presetStationId);
      setSubscriptionId(presetSubscriptionId);
      setTimeout(() => doValidate(presetSubscriptionId, presetStationId), 0);
    }
  }, [stationLoading]); // eslint-disable-line

  const requiredBatteryCount = useMemo(() => {
    const o = subscriptionInfo || {};
    return (
      o.packagePins ??
      o.batteryCount ??
      o.numberOfBatteries ??
      o.requiredBatteries ??
      0
    );
  }, [subscriptionInfo]);

  // Number of batteries that must be given (prioritize BE-picked list)
  const getMustPickCount = () => {
    if (autoPicked?.length) return autoPicked.length; // BE has already picked
    if (outOptions?.length) {
      if (requiredBatteryCount > 0) return Math.min(requiredBatteryCount, outOptions.length);
      if (swapInCount > 0) return Math.min(swapInCount, outOptions.length);
      return outOptions.length;
    }
    if (requiredBatteryCount > 0) return requiredBatteryCount;
    if (swapInCount > 0) return swapInCount;
    return 1;
  };

  const resetAll = () => {
    setStep(1);
    setStationId("");
    setSubscriptionId("");
    setSubError("");
    setSubscriptionInfo(null);

    setBatteryIdsInput("");
    setBatteryIdsLocked(false);
    setSwapInResult(null);
    setSwapOutResult(null);

    setPillarSlotsMap(new Map());
    setSlotIdToPillar(new Map());
    setSwapInError(null);
    setOutOptions([]);
    setAutoPicked([]);
    setAutoPickError("");
    setSwapInCount(0);
    setSelectedPillarId("");
    setPickupPillarId("");
    setSelectedSlotIds([]);
    setAllowedSwapIn(new Set());
  };

  // === validate subscription ===
  const doValidate = async (sub, sta) => {
    setSubError("");
    setSwapInError(null);
    const subTrim = (sub || "").trim();
    if (!sta) return setSubError("Please select a station first.");
    if (!isValidSubFormat(subTrim))
      return setSubError("Invalid Subscription ID format. Example: SUB-18779758");

    setSubmitting(true);
    setLoading(true);
    try {
      // Attach token to validate call
      const token = localStorage.getItem("token");
      if (token) {
        // Set temporarily for shared axios instance
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      } else {
        // If no token, clear header (backend may respond 401)
        delete api.defaults.headers.common["Authorization"];
      }

      // Call helper function as before (keep logic)
      const res = await validateSubscription(subTrim, sta /* , {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    } */);

      const data = res.data;
      if (!data || typeof data !== "object") throw new Error("Backend returned invalid data format.");

      if (data.isValid === false || toLower(data.status) === "invalid") {
        setSubError(data.message || "Subscription is invalid.");
        return;
      }

      const positive =
        data.isValid === true ||
        data.valid === true ||
        toLower(data.status) === "valid" ||
        isPositiveMsg(data.message);

      if (!positive) {
        setSubError(data.message || "Unable to validate subscription.");
        return;
      }

      const info = data.data ?? data;
      setSubscriptionInfo(info);

      // --- slot grid & allowed slots from slotEmpty (must use backend) ---
      const rawSlots = extractSlotsFromResponse(info);
      const pMap = groupSlotsByPillar(rawSlots, sta);

      const indexMap = new Map();
      for (const [pid, arr] of pMap) arr.forEach((s) => indexMap.set(String(s.slotId), pid));
      setPillarSlotsMap(new Map(pMap));
      setSlotIdToPillar(indexMap);

      const slotEmptyIds = (extractSlotEmptyIds(info) || []).map((x) => String(x));
      const allowedSet = new Set(slotEmptyIds);
      setAllowedSwapIn(allowedSet);

      if (slotEmptyIds.length > 0 && !selectedPillarId) {
        const first = String(slotEmptyIds[0]);
        const pid = indexMap.get(first);
        if (pid) setSelectedPillarId(pid);
      }

      const batteriesToReturn = extractReturnBatteryIds(info);
      if (batteriesToReturn.length > 0) {
        setBatteryIdsInput(batteriesToReturn.join("\n"));
        setBatteryIdsLocked(false);
        setSwapInCount(batteriesToReturn.length);
      } else {
        setBatteryIdsInput("");
        setBatteryIdsLocked(false);
        setSwapInCount(0);
      }

      const batTake = extractBatTake(info);
      if (Array.isArray(batTake) && batTake.length > 0) {
        const picked = batTake
          .filter((x) => x?.batteryId && x?.slotId)
          .map((x) => ({ batteryId: x.batteryId, slotId: x.slotId }));
        setAutoPicked(picked);
        setOutOptions(picked);
        setSwapInCount((prev) => prev || picked.length);
        const pid = indexMap.get(String(picked[0]?.slotId)) || "";
        setPickupPillarId(pid);
      } else {
        setAutoPicked([]);
        setOutOptions([]);
        setPickupPillarId("");
      }

      setSelectedSlotIds([]);

      const initialTake = /please,\s*take\s*batteries/i.test(String(data.message || info.message || ""));
      setStep(initialTake ? 3 : 2);
    } catch (err) {
      setSubError(
        `❌ ${err?.response?.data?.message ||
        err?.message ||
        "Unable to validate subscription."
        }`
      );
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  const handleValidate = (e) => {
    e.preventDefault();
    doValidate(subscriptionId, stationId);
  };

  const parsedBatteryIds = useMemo(() => {
    const src = batteryIdsInput;
    const chunks = src.split(/[\n,]/g);
    return chunks.map((s) => s.trim()).filter(Boolean);
  }, [batteryIdsInput]);

  const togglePickSlot = (slot) => {
    if (step !== 2) return;
    if (!selectedPillarId) return;
    if (!slot || slot.pillarId !== selectedPillarId) return;
    if (!allowedSwapIn.has(String(slot.slotId))) return; // only slotEmpty

    const maxNeed = parsedBatteryIds.length || getMustPickCount();
    if (!maxNeed) return;

    setSelectedSlotIds((prev) => {
      const id = String(slot.slotId);
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxNeed) return prev;
      return [...prev, id];
    });
  };

  const getFreeSlotIdsOnSelectedPillar = () => {
    if (!selectedPillarId) return [];
    const arr = pillarSlotsMap.get(selectedPillarId) || [];
    return arr
      .filter((s) => allowedSwapIn.has(String(s.slotId)))
      .map((s) => s.slotId);
  };

  // === swap-in ===
  const handleSwapIn = async () => {
    setSwapInError(null);

    if (!selectedPillarId) {
      alert("Please select a pillar to deposit batteries (Swap-In).");
      return;
    }

    const ids = parsedBatteryIds;

    if (requiredBatteryCount > 0 && ids.length !== requiredBatteryCount) {
      alert(`You must enter exactly ${requiredBatteryCount} battery IDs according to the package.`);
      return;
    }
    if (ids.length === 0) {
      alert("No battery IDs to Swap-In.");
      return;
    }

    const freeSlotIds = getFreeSlotIdsOnSelectedPillar();
    if (freeSlotIds.length < ids.length) {
      alert(
        `Pillar "${selectedPillarId}" does not have enough free slots according to backend slotEmpty. Need ${ids.length}, currently ${freeSlotIds.length}.`
      );
      return;
    }

    let slotOrder = selectedSlotIds.slice(0, ids.length);
    if (slotOrder.length < ids.length) {
      const chosenSet = new Set(slotOrder.map(String));
      const remain = freeSlotIds.filter((sid) => !chosenSet.has(String(sid)));
      const need = ids.length - slotOrder.length;
      slotOrder = slotOrder.concat(remain.slice(0, need).map(String));
    }
    if (slotOrder.length < ids.length) {
      alert("Not enough slots to assign batteries. Please select more slots or change pillar.");
      return;
    }

    const batteryDtos = ids.map((batteryId, idx) => ({
      batteryId,
      slotId: slotOrder[idx],
    }));

    setSwapInCount(ids.length);
    setLoading(true);
    try {
      const payload = {
        batteryDtos,
        subscriptionId: subscriptionId.trim(),
        accessRequest: {
          subscriptionId: subscriptionId.trim(),
          stationId,
        },
        pillarId: selectedPillarId,
      };

      const res = await swapInBattery(payload);
      setSwapInResult(res.data);

      const raw = res?.data?.data ?? res?.data ?? {};

      // Priority: list of batteries to give from backend (BatteryDtos / batTake)
      let fromBE = (raw.BatteryDtos || raw.batteryDtos || []).map((it) => ({
        batteryId: it.batteryId ?? it.BatteryId,
        slotId: it.slotId ?? it.SlotId,
      }));

      if (!fromBE.length) {
        const picked = extractBatTake(raw);
        if (picked.length) {
          fromBE = picked
            .filter((x) => x?.batteryId && x?.slotId)
            .map((x) => ({ batteryId: x.batteryId, slotId: x.slotId }));
        }
      }

      // Final fallback: if backend does not return any list, keep it empty and show warning
      setOutOptions(fromBE);

      // Number of batteries that must be given according to new rule
      const mustPick = fromBE.length ? fromBE.length : getMustPickCount();

      if (!fromBE.length) {
        setAutoPicked([]);
        setAutoPickError(
          "Backend did not return the list of batteries to give (BatteryDtos/batTake). Please check backend."
        );
      } else {
        setAutoPicked(fromBE.slice(0, mustPick));
        setAutoPickError("");
      }

      const firstSlot = (fromBE[0] || {}).slotId;
      const pid = firstSlot ? slotIdToPillar.get(String(firstSlot)) : "";
      setPickupPillarId(pid || "");

      setStep(3);
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;

      if (status === 404 && data?.message) {
        setSwapInError({
          message: data.message,
          wrongBatteries: Array.isArray(data.data) ? data.data : [],
        });
        return;
      }

      let msg = `Swap-In failed${status ? ` (status ${status})` : ""}`;
      if (typeof data === "string") msg += `\n${data}`;
      else if (data?.title) msg += `\n${data.title}`;
      if (data?.errors) {
        msg +=
          "\n" +
          Object.entries(data.errors)
            .map(([k, v]) => `${k}: ${(v || []).join(", ")}`)
            .join("\n");
      }
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const submitRating = async () => {
    // rating is optional — if no star selected, encourage user or they can click "Skip"
    if (!ratingScore) {
      alert("Please select a star rating before submitting (or click 'Skip').");
      return;
    }

    const driverId =
      localStorage.getItem("userId") ||
      localStorage.getItem("driverId") ||
      "";

    if (!driverId) {
      alert("Cannot detect driverId. Please log in again.");
      return;
    }
    if (!stationId) {
      alert("Missing stationId.");
      return;
    }

    const payload = {
      driverId,
      stationId,
      ratingScore: Number(ratingScore),
      comment: ratingComment.trim(),
    };

    try {
      setRatingSubmitting(true);
      setRatingError("");

      const token = localStorage.getItem("token");
      await api.post("/Rating/create-rating", payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      setRatingDone(true);
      alert("✅ Thank you for your rating!");
    } catch (e) {
      console.error("create-rating error:", e?.response?.data || e);
      setRatingError(
        e?.response?.data?.message ||
        e?.response?.data?.title ||
        "❌ Failed to submit rating."
      );
    } finally {
      setRatingSubmitting(false);
    }
  };

  // === Confirm batteries taken → Swap-Out ===
  const confirmTakeBatteries = async () => {
    const mustPick = getMustPickCount();
    const list = (autoPicked.length ? autoPicked : outOptions).slice(0, mustPick);

    if (!list.length) {
      alert("Backend has not provided the list of batteries to take.");
      return;
    }

    setLoading(true);
    try {
      await doSwapOut(list);
    } finally {
      setLoading(false);
    }
  };

  // === swap-out ===
  const doSwapOut = async (picked) => {
    setLoading(true);
    try {
      const payload = {
        batteryDtos: picked.map(({ batteryId, slotId }) => ({ batteryId, slotId })),
        subscriptionId: subscriptionId.trim(),
        accessRequest: { subscriptionId: subscriptionId.trim(), stationId },
        pillarId: pickupPillarId || stationId,
      };

      const res = await swapOutBattery(payload);
      setSwapOutResult(res.data);
      setStep(4);
    } catch (err) {
      const v = err?.response?.data;
      let friendly = "Swap-Out failed.";
      if (v?.title) friendly = v.title;
      if (v?.errors && typeof v?.errors === "object") {
        const parts = Object.entries(v.errors).map(
          ([key, arr]) => `${key}: ${(arr || []).join(", ")}`
        );
        friendly += `\n${parts.join("\n")}`;
      } else if (typeof v === "string") {
        friendly += `\n${v}`;
      }
      console.error("swap-out error:", err?.response?.status, v);
      alert(`❌ ${friendly}`);
    } finally {
      setLoading(false);
    }
  };

  // === View map for UI ===
  const mustPickList = useMemo(
    () => (autoPicked.length ? autoPicked : outOptions).slice(0, getMustPickCount()),
    [autoPicked, outOptions, requiredBatteryCount, swapInCount]
  );

  const displayPillarMap = useMemo(() => {
    if (step === 3) {
      const focusPid =
        pickupPillarId ||
        (mustPickList.length
          ? slotIdToPillar.get(String(mustPickList[0]?.slotId)) || ""
          : "");
      return makeStep3ViewMap(pillarSlotsMap, mustPickList, focusPid);
    }
    if (step === 2) {
      return makeStep2ViewMap_AllowedSlotsOnly(
        pillarSlotsMap,
        selectedPillarId,
        selectedSlotIds,
        allowedSwapIn
      );
    }
    return pillarSlotsMap;
  }, [
    pillarSlotsMap,
    step,
    selectedPillarId,
    pickupPillarId,
    mustPickList,
    slotIdToPillar,
    selectedSlotIds,
    allowedSwapIn,
  ]);

  const pillarEntries = useMemo(() => flattenFromPillarMap(displayPillarMap), [displayPillarMap]);

  // ===== Title using station name =====
  const stationTitle =
    stations.find((s) => s.stationId === stationId)?.stationName ||
    presetStationName ||
    "Battery Swap";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-center">📗 {stationTitle}</h1>

      {stationLoading && (
        <div className="text-gray-600 text-center">Loading station list...</div>
      )}

      {!stationLoading && (
        <>
          {step === 1 && (
            <form onSubmit={handleValidate} className="card p-6 space-y-3">
              <h2 className="text-base font-semibold">Step 1: Select station & enter Subscription</h2>
              <select
                className="p-3 border rounded-lg w-full"
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                required
              >
                <option value="">-- Select station --</option>
                {stations.map((s, idx) => (
                  <option key={idx} value={s.stationId}>
                    {s.stationName} ({s.stationId})
                  </option>
                ))}
              </select>

              <input
                className="p-3 border rounded-lg w-full"
                placeholder="Enter Subscription ID (e.g., SUB-18779758)"
                value={subscriptionId}
                onChange={(e) => setSubscriptionId(e.target.value)}
                required
              />

              {subError && <div className="text-sm text-red-600">{subError}</div>}

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading || submitting}
              >
                {submitting ? "Validating..." : "Validate subscription"}
              </button>
            </form>
          )}

          {/* Pillar & slot grid */}
          {subscriptionInfo && (
            <div className="card p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">⚡ Pillar status at this station</h2>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                    Slot can be selected (inside <code>slotEmpty</code>)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-slate-400 inline-block" />
                    Cannot be selected
                  </span>
                </div>
              </div>

              {step === 2 && (
                <div className="text-xs text-gray-600 space-y-1">
                  <div>1) <b>Select a pillar</b> to deposit batteries (Swap-In).</div>
                  <div>2) Enter <b>BatteryId</b> (one per line or separated by commas).</div>
                </div>
              )}
              {step === 3 && (
                <div className="text-xs text-gray-600">
                  Only the <b>pickup pillar</b> is highlighted; and only <b>green slots</b> are opened for you to take batteries.
                </div>
              )}

              {pillarEntries.length === 0 ? (
                <div className="text-gray-500 text-sm text-center">
                  No slot data. Please try again or re-check the subscription.
                </div>
              ) : (
                <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-4">
                  {pillarEntries.map(([pid, slots]) => {
                    const isSelected = step === 2 && selectedPillarId && pid === selectedPillarId;
                    const isDim = slots.some((s) => s.__dim);

                    const pillarBase =
                      "bg-gray-50 rounded-lg p-3 border text-left transition-all duration-200";
                    const clickable =
                      step === 2 ? "cursor-pointer hover:shadow-lg" : "cursor-default";
                    const selectedStyle =
                      step === 2 && isSelected
                        ? "ring-2 ring-emerald-500 bg-emerald-50 border-emerald-400"
                        : "";
                    const dimStyle = isDim ? "opacity-40 grayscale" : "";

                    return (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => {
                          if (step === 2) {
                            setSelectedPillarId(pid);
                            setSelectedSlotIds((prev) => {
                              const set = new Set(
                                (pillarSlotsMap.get(pid) || []).map((s) => String(s.slotId))
                              );
                              return prev.filter((x) => set.has(String(x)));
                            });
                          }
                        }}
                        className={`${pillarBase} ${clickable} ${selectedStyle} ${dimStyle}`}
                        title={step === 2 ? "Click to choose Swap-In pillar" : ""}
                      >
                        <h4 className="text-center font-semibold mb-2 text-gray-700 flex items-center justify-center gap-2">
                          <span>Pillar {pid}</span>
                          {step === 2 && isSelected && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px]">
                              Swap-In pillar
                            </span>
                          )}
                        </h4>

                        {/* === Slot grid with effects + Bootstrap icons === */}
                        <div className="grid grid-cols-4 gap-2">
                          {slots.map((slot, i) => {
                            const pickedIdx =
                              selectedSlotIds.findIndex((x) => x === String(slot?.slotId)) + 1;

                            const canPick =
                              step === 2 &&
                              selectedPillarId === pid &&
                              allowedSwapIn.has(String(slot?.slotId));

                            // Slot used to give battery (swap-out highlight)
                            const isOutHighlight = step === 3 && slot.__green;

                            const labelTextClass =
                              canPick || slot.__green ? "text-white/95" : "text-gray-900";

                            const baseClasses =
                              "h-10 rounded-md relative overflow-hidden transition-all duration-300 ease-out";

                            // base color
                            const baseColor = slotColorClass(canPick || slot.__green);
                            // more prominent color for swap-out
                            const outColor = isOutHighlight
                              ? "bg-gradient-to-br from-emerald-400 to-emerald-600"
                              : "";
                            const colorClass = outColor || baseColor;

                            const pointerClass = canPick
                              ? "cursor-pointer hover:ring-2 hover:ring-sky-400"
                              : "cursor-default";

                            // motion effects for swap-in / swap-out
                            let motionClass = "scale-95";
                            if (step === 2 && canPick) {
                              // Swap-In: if not yet selected, hover makes it lift; if selected, always lifted
                              motionClass = pickedIdx
                                ? "scale-100 shadow-lg"
                                : "scale-95 hover:-translate-y-1 hover:shadow-md";
                            } else if (isOutHighlight) {
                              // Swap-Out: slot whose battery is being taken will pulse
                              motionClass = "scale-100 shadow-lg animate-pulse";
                            }

                            return (
                              <div
                                key={slot?.slotId ?? `${pid}-${i}`}
                                onClick={() => canPick && togglePickSlot(slot)}
                                className={`${baseClasses} ${colorClass} ${pointerClass} ${motionClass} ${pickedIdx ? "ring-4 ring-sky-400" : ""
                                  }`}
                                title={`Slot ${slot?.slotNumber ?? i + 1} • SlotId: ${slot?.slotId || "N/A"
                                  }${slot?.batteryId ? ` • ${slot.batteryId}` : ""}`}
                              >
                                {/* Swap-In icon (put battery in) */}
                                {step === 2 && canPick && pickedIdx ? (
                                  <div className="absolute left-1 top-1 flex items-center gap-0.5 text-[11px] text-white pointer-events-none">
                                    <i className="bi bi-battery-charging" />
                                    <i className="bi bi-arrow-down-short" />
                                  </div>
                                ) : null}

                                {/* Swap-Out icon (take battery out) */}
                                {step === 3 && isOutHighlight ? (
                                  <div className="absolute left-1 top-1 flex items-center gap-0.5 text-[11px] text-white pointer-events-none">
                                    <i className="bi bi-battery-full" />
                                    <i className="bi bi-arrow-up-short" />
                                  </div>
                                ) : null}

                                {/* label slotId */}
                                <span
                                  className={`absolute inset-0 grid place-items-center pointer-events-none ${labelTextClass}`}
                                >
                                  <span className="px-1 text-[10px] leading-none font-mono max-w-full truncate">
                                    {String(slot?.slotId || "")}
                                  </span>
                                </span>

                                {/* click order badge when Swap-In */}
                                {pickedIdx ? (
                                  <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white shadow">
                                    {pickedIdx}
                                  </span>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="card p-6 space-y-3">
              <h2 className="text-base font-semibold">Step 2: Swap-In</h2>
              <div className="relative">
                <textarea
                  className="p-3 border rounded-lg w-full"
                  rows={4}
                  placeholder={"Example:\nBT-7436-XFRU\nBT-4300-4GPV"}
                  value={batteryIdsInput}
                  onChange={(e) => setBatteryIdsInput(e.target.value)}
                  readOnly={false}
                />
              </div>

              {/* Preview mapping BatteryId ↔ Slot (click order) */}
              <div className="text-sm text-gray-700">
                <div className="font-medium mb-1">Preview slot mapping (following your click order):</div>
                <div className="max-h-48 overflow-auto border rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">#</th>
                        <th className="p-2 text-left">BatteryId</th>
                        <th className="p-2 text-left">SlotId</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedBatteryIds.map((bid, idx) => (
                        <tr key={`${bid}-${idx}`} className="border-t">
                          <td className="p-2">{idx + 1}</td>
                          <td className="p-2">{bid}</td>
                          <td className="p-2">
                            {selectedSlotIds[idx] ? (
                              String(selectedSlotIds[idx])
                            ) : (
                              <span className="text-gray-400">not selected</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedPillarId ? (
                  <div className="mt-1 text-xs text-gray-600">
                    Selected pillar: <b>{selectedPillarId}</b>. You can only assign into <b>green slots</b> that backend returns in <code>slotEmpty</code>.
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-orange-600">Pillar is not selected yet.</div>
                )}
              </div>

              {swapInError?.message && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
                  <div className="font-medium mb-1">{swapInError.message}</div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  className="btn-primary"
                  onClick={handleSwapIn}
                  disabled={
                    loading ||
                    !selectedPillarId ||
                    parsedBatteryIds.length === 0 ||
                    selectedSlotIds.length < parsedBatteryIds.length
                  }
                >
                  {loading ? "Submitting..." : "Submit Swap-In"}
                </button>
                <span className="text-xs text-gray-500">
                  (Batteries can only be assigned to slots in backend <code>slotEmpty</code>)
                </span>
              </div>

              {swapInResult && (
                <div className="mt-3">
                  <div className="font-medium mb-1">Swap-In result</div>
                  <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto">
                    {JSON.stringify(swapInResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="card p-6 space-y-3">
              <h2 className="text-base font-semibold">Step 3: Swap-Out (confirm taking new batteries)</h2>

              {autoPickError && (
                <div className="text-sm text-red-600">{autoPickError}</div>
              )}

              {!autoPicked.length && !outOptions.length && (
                <div className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
                  Backend did not return the list of batteries to give (BatteryDtos/batTake). Please check backend.
                </div>
              )}

              <div className="text-sm text-gray-600">
                List of batteries the system selected to give — quantity = <b>{getMustPickCount()}</b>:
              </div>

              <div className="max-h-72 overflow-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">BatteryId</th>
                      <th className="p-2 text-left">SlotId</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mustPickList.map((opt, idx) => (
                      <tr key={`${opt.batteryId}-${opt.slotId}-${idx}`} className="border-t">
                        <td className="p-2">{idx + 1}</td>
                        <td className="p-2">{opt.batteryId}</td>
                        <td className="p-2">{opt.slotId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-sm text-gray-500">
                In the pillar grid above: only the <b>pickup pillar</b> is highlighted and only <b>green slots</b> are opened for you to take.
              </div>

              {/* Removed: back to step 2 button */}
              <div className="flex gap-2">
                <button
                  className="btn-primary"
                  onClick={confirmTakeBatteries}
                  disabled={loading || mustPickList.length === 0}
                >
                  {loading ? "Confirming..." : "✅ I have taken all batteries — Confirm"}
                </button>
              </div>

              {swapOutResult && (
                <div className="mt-3">
                  <div className="font-medium mb-1">Swap-Out result</div>
                  <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto">
                    {JSON.stringify(swapOutResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="card p-6 space-y-3">
              <h2 className="text-base font-semibold">✅ Battery swap completed</h2>
              <div>Station: <b>{stationTitle}</b> ({stationId})</div>
              <div>Subscription: <b>{subscriptionId}</b></div>

              {/* Rating optional */}
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Rate your experience (optional)</h3>
                  {ratingDone && (
                    <span className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700">
                      Rating recorded
                    </span>
                  )}
                </div>

                {!ratingDone ? (
                  <div className="space-y-3">
                    {/* Stars */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setRatingScore(n)}
                          className={`text-3xl transition-transform ${ratingScore >= n
                              ? "text-yellow-400 scale-110"
                              : "text-gray-300 hover:text-yellow-300"
                            }`}
                          title={`${n} star(s)`}
                        >
                          ★
                        </button>
                      ))}
                      <span className="text-sm text-gray-600 ml-2">
                        {ratingScore ? `${ratingScore}/5` : "Not selected"}
                      </span>
                    </div>

                    {/* Comment */}
                    <textarea
                      className="w-full border rounded-lg p-3"
                      rows={3}
                      placeholder="Write your comment (optional)…"
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                    />

                    {ratingError && (
                      <div className="text-sm text-red-600">{ratingError}</div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={submitRating}
                        disabled={ratingSubmitting}
                        title="Submit rating (optional)"
                      >
                        {ratingSubmitting ? "Submitting..." : "Submit rating"}
                      </button>

                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => setRatingDone(true)} // skip
                        disabled={ratingSubmitting}
                        title="Skip rating"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    Thank you for using the service! You can close this page or continue swapping.
                  </div>
                )}
              </div>

              {/* Action buttons unchanged */}
              <div className="pt-2 flex gap-2">
                <button className="btn-secondary" onClick={() => setStep(2)}>
                  Swap again
                </button>
                <button className="btn-ghost" onClick={resetAll}>
                  Reset
                </button>
                <button className="btn-primary" onClick={() => navigate("/user/service")}>
                  Finish
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
