/* eslint-disable no-unused-vars */
/* eslint-disable no-empty */
import React, { useEffect, useState } from "react";
import api from "@/api/api";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import * as Yup from "yup";
export default function Vehicle() {
  // ===== VoltSwap palette =====
  const brandVars = {
    "--brand-start": "#1ee3b3",
    "--brand-end": "#2f66ff",
    "--brand-50": "#f5faff",
    "--brand-500": "#2f66ff",
    "--brand-600": "#2856d4",
  };

  const [vehicles, setVehicles] = useState([]);
  const [driverId, setDriverId] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingRecs, setPendingRecs] = useState([]);
  const [apiMessage, setApiMessage] = useState("");
  const [newVehicle, setNewVehicle] = useState({
    vin: "",
    model: "",
    batteryCount: "",
  });
  const [formErr, setFormErr] = useState({
    vin: "",
    model: "",
    batteryCount: "",
  });
  const navigate = useNavigate();
  const vehicleSchema = Yup.object().shape({
    vin: Yup.string()
      .matches(
        /^VIN[-\s]?([A-Z0-9]{10})$/,
        "VIN is invalid. Format: VIN-XXXXXXXXXX"
      )
      .required("VIN is required."),

    model: Yup.string()
      .matches(
        /^[A-Za-z0-9\-_ ]{3,30}$/,
        "Model must be 3-30 characters (letters, numbers, space, - , _)."
      )
      .required("Model is required."),

    batteryCount: Yup.number()
      .typeError("Battery count must be a number.")
      .min(1, "Battery count must be greater than 0.")
      .max(4, "Battery count must be less than 5.")
      .required("Battery count is required."),
  });
  const mapVehicle = (x, i = 0) => ({
    id: x?.id ?? x?.vehicleId ?? x?.vin ?? `v-${i}`,
    vin: x?.vin ?? "--",
    model: x?.vehicleModel ?? x?.model ?? "Unknown Model",
    batteryCount:
      x?.numberOfBattery ?? x?.numberOfBat ?? x?.batteryCount ?? "N/A",
    recommendPlan: Array.isArray(x?.recommendPlan) ? x.recommendPlan : [],
    createdAt: x?.createdAt ?? null,
  });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (id) setDriverId(id);
  }, []);

  const fetchVehicles = async () => {
    if (!driverId) return;
    try {
      setLoading(true);
      const res = await api.get("/Vehicle/vehicle-list", {
        params: { UserDriverId: driverId, _ts: Date.now() },
      });
      const raw =
        (Array.isArray(res.data) && res.data) ||
        (Array.isArray(res.data?.data) && res.data.data) ||
        [];
      setVehicles(raw.map(mapVehicle));
      setApiMessage("");
    } catch (err) {
      const msg = err?.response?.data?.message;
      setVehicles([]);
      setApiMessage(msg || "Could not load vehicles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (driverId) fetchVehicles();
  }, [driverId]);

  const refreshUntilRecommend = async (vin) => {
    const VIN = (vin || "").trim().toLowerCase();
    setPendingRecs((prev) => (prev.includes(VIN) ? prev : [...prev, VIN]));
    const MAX_TRIES = 8;
    const INTERVAL_MS = 1200;

    for (let i = 0; i < MAX_TRIES; i++) {
      await sleep(INTERVAL_MS);
      try {
        const res = await api.get("/Vehicle/vehicle-list", {
          params: { UserDriverId: driverId, _ts: Date.now() },
        });
        const raw =
          (Array.isArray(res.data) && res.data) ||
          (Array.isArray(res.data?.data) && res.data.data) ||
          [];
        const mapped = raw.map(mapVehicle);
        setVehicles(mapped);

        const found = mapped.find(
          (v) => (v.vin || "").trim().toLowerCase() === VIN
        );
        if (found?.recommendPlan?.length > 0) {
          setPendingRecs((prev) => prev.filter((x) => x !== VIN));
          return true;
        }
      } catch {}
    }
    setPendingRecs((prev) => prev.filter((x) => x !== VIN));
    return false;
  };

  // ===== Modal Validation =====
  const validateModal = async () => {
    try {
      await vehicleSchema.validate(newVehicle, { abortEarly: false });
      setFormErr({ vin: "", model: "", batteryCount: "" });
      return true;
    } catch (err) {
      const errs = { vin: "", model: "", batteryCount: "" };
      if (err.inner) {
        err.inner.forEach((e) => {
          errs[e.path] = e.message;
        });
      }
      setFormErr(errs);
      return false;
    }
  };

  const handleCreateVehicle = async () => {
    const ok = await validateModal();
    if (!ok) return;
    const numberOfBat = parseInt(newVehicle.batteryCount, 10);
    const body = {
      driverId,
      vin: newVehicle.vin.trim(),
      vehicleModel: newVehicle.model.trim(),
      numberOfBat,
    };
    try {
      setSaving(true);
      await api.post("/Vehicle/Create-vehicle", body);
      await fetchVehicles();
      // auto poll recommend
      refreshUntilRecommend(newVehicle.vin);
      alert("✅ Vehicle created successfully!");
      setShowModal(false);
      setNewVehicle({ vin: "", model: "", batteryCount: "" });
      setFormErr({ vin: "", model: "", batteryCount: "" });
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to create vehicle.";
      alert("❌ " + msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVehicle = async (vin) => {
    if (!window.confirm("🗑️ Are you sure you want to delete this vehicle?"))
      return;
    try {
      await api.delete("/Vehicle/delete-vehicle", {
        params: { VIN: vin, UserDriverId: driverId },
      });
      await fetchVehicles();
      alert("✅ Vehicle deleted successfully!");
    } catch {
      alert("❌ Failed to delete vehicle!");
    }
  };

  // ===== Skeleton UI =====
  const SkeletonCard = () => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="h-5 w-40 bg-gray-200 rounded mb-2 animate-pulse" />
      <div className="h-4 w-64 bg-gray-200 rounded mb-2 animate-pulse" />
      <div className="h-4 w-52 bg-gray-200 rounded mb-4 animate-pulse" />
      <div className="h-8 w-36 bg-gray-200 rounded animate-pulse" />
    </div>
  );

  const EmptyState = () => (
    <div className="text-center py-16">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-[var(--brand-50)] grid place-items-center mb-4">
        <i className="bi bi-ev-front text-[var(--brand-500)] text-3xl" />
      </div>
      <h3 className="text-xl font-semibold text-gray-800">No vehicles found</h3>
      <p className="text-gray-500 mt-1">
        Add your first vehicle to see plan recommendations.
      </p>
      <button
        onClick={() => setShowModal(true)}
        className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold bg-[#2f66ff] hover:bg-[#254fcc] active:bg-[#2144aa] shadow"
      >
        <i className="bi bi-plus-lg" />
        Add Vehicle
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white py-10 px-6" style={brandVars}>
      <div className="max-w-6xl mx-auto bg-white border border-gray-100 shadow-xl rounded-3xl p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--brand-50)] border border-[var(--brand-500)]/20 text-[var(--brand-600)] text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-[var(--brand-500)]" />
              Vehicle Garage
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mt-2">
              My Vehicles
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Manage your vehicles and see recommended plans tailored to each
              VIN.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchVehicles}
              className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium"
            >
              <i className="bi bi-arrow-clockwise mr-1" />
              Refresh
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 rounded-xl text-white font-semibold bg-[#2f66ff] hover:bg-[#254fcc] active:bg-[#2144aa] shadow"
            >
              <i className="bi bi-plus-lg mr-1" />
              Add Vehicle
            </button>
          </div>
        </div>

        {/* API message */}
        {apiMessage && (
          <div className="mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
            {apiMessage}
          </div>
        )}

        {/* Vehicle List */}
        {loading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : vehicles.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {vehicles.map((v) => {
              const VIN = (v.vin || "").trim().toLowerCase();
              const waiting =
                pendingRecs.includes(VIN) &&
                (!v.recommendPlan || v.recommendPlan.length === 0);

              return (
                <motion.div
                  key={v.id || v.vin}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-xl transition-all"
                >
                  {/* Title Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                        <i className="bi bi-ev-front-fill text-[var(--brand-500)]" />
                        {v.model}
                      </h3>
                      <div className="mt-1 text-xs text-gray-500">
                        VIN: <span className="font-mono">{v.vin}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteVehicle(v.vin)}
                        className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium"
                        title="Delete vehicle"
                      >
                        <i className="bi bi-trash3" />
                      </button>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="mt-3 flex items-center gap-3 text-sm">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--brand-50)] text-[var(--brand-600)] border border-[var(--brand-500)]/20">
                      <i className="bi bi-battery-half" />
                      {v.batteryCount} batter
                      {Number(v.batteryCount) > 1 ? "ies" : "y"}
                    </span>
                    {v.createdAt ? (
                      <span className="text-gray-500">
                        <i className="bi bi-calendar3 mr-1" />
                        {new Date(v.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                    ) : null}
                  </div>

                  {/* Recommend area */}
                  <div className="mt-4 flex items-center justify-between">
                    {waiting ? (
                      <span className="text-sm text-[var(--brand-600)] flex items-center gap-2">
                        <span className="inline-block h-3 w-3 border-2 border-[var(--brand-500)] border-t-transparent rounded-full animate-spin" />
                        Calculating recommendations…
                      </span>
                    ) : v.recommendPlan?.length ? (
                      <div className="flex flex-wrap gap-2 items-center">
                        {v.recommendPlan.slice(0, 3).map((p, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2.5 py-1 rounded-full bg-gradient-to-r from-[var(--brand-start)]/15 to-[var(--brand-end)]/15 text-[var(--brand-600)] border border-[var(--brand-500)]/20"
                          >
                            {p}
                          </span>
                        ))}
                        {v.recommendPlan.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{v.recommendPlan.length - 3} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">
                        No recommendations yet
                      </span>
                    )}

                    <button
                      className="text-sm font-medium text-[var(--brand-600)] hover:underline"
                      onClick={() =>
                        navigate(
                          `/user/service/suggest?planList=${encodeURIComponent(
                            (v.recommendPlan || []).join(",")
                          )}`
                        )
                      }
                      disabled={
                        !v.recommendPlan || v.recommendPlan.length === 0
                      }
                      title={
                        v.recommendPlan?.length
                          ? "View suggested plans"
                          : "No suggested plans yet"
                      }
                    >
                      View plans →
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* ===== Modal: Create Vehicle ===== */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
            >
              <div className="h-2 bg-[#2f66ff]" />
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Create New Vehicle
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 rounded-lg hover:bg-gray-100"
                    title="Close"
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>

                <div className="space-y-4">
                  <Field
                    label="VIN"
                    placeholder="e.g., VN1ABCDEF12345678"
                    value={newVehicle.vin}
                    onChange={(e) =>
                      setNewVehicle((s) => ({ ...s, vin: e.target.value }))
                    }
                    icon="bi-upc-scan"
                    error={formErr.vin}
                  />
                  <Field
                    label="Model"
                    placeholder="e.g., VoltSwap E-Scooter"
                    value={newVehicle.model}
                    onChange={(e) =>
                      setNewVehicle((s) => ({ ...s, model: e.target.value }))
                    }
                    icon="bi-car-front"
                    error={formErr.model}
                  />
                  <Field
                    label="Battery Count"
                    type="number"
                    placeholder="e.g., 2"
                    value={newVehicle.batteryCount}
                    onChange={(e) =>
                      setNewVehicle((s) => ({
                        ...s,
                        batteryCount: e.target.value,
                      }))
                    }
                    icon="bi-battery-charging"
                    error={formErr.batteryCount}
                  />
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateVehicle}
                    disabled={saving}
                    className={[
                      "px-5 py-2.5 rounded-xl text-white font-semibold",
                      "bg-[#2f66ff] hover:bg-[#254fcc] active:bg-[#2144aa] shadow",
                      saving ? "opacity-75 cursor-not-allowed" : "",
                    ].join(" ")}
                  >
                    {saving ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
                        Creating…
                      </span>
                    ) : (
                      <>
                        <i className="bi bi-check2-circle mr-1" />
                        Create
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ===== Reusable Field component ===== */
function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  icon,
  error = "",
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        {icon ? (
          <i
            className={`bi ${icon} absolute left-3 top-1/2 -translate-y-1/2 text-gray-400`}
            aria-hidden="true"
          />
        ) : null}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={[
            "w-full rounded-xl border bg-white px-10 py-3",
            "outline-none transition shadow-sm placeholder:text-gray-400",
            error
              ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100"
              : "border-gray-200 focus:border-[var(--brand-500)] focus:ring-4 focus:ring-[color:rgba(47,102,255,0.15)]",
          ].join(" ")}
          style={{ "--brand-500": "#2f66ff" }}
        />
      </div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
