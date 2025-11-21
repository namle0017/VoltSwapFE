/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/api";

export default function RegisterService() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [planDetail, setPlanDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Icon logic theo loại phí
  const getFeeIcon = (type) => {
    const key = String(type || "").toLowerCase();

    if (key.includes("mileage")) return <i className="bi bi-speedometer2"></i>;
    if (key.includes("swap")) return <i className="bi bi-arrow-repeat"></i>;
    if (key.includes("penalty") || key.includes("late"))
      return (
        <i className="bi bi-exclamation-triangle-fill text-yellow-600"></i>
      );
    if (key.includes("booking"))
      return <i className="bi bi-calendar-event"></i>;
    if (key.includes("deposit")) return <i className="bi bi-cash-coin"></i>;

    return <i className="bi bi-pin-angle-fill"></i>;
  };

  // Load danh sách plan
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await api.get("/Plan/plan-list");
        if (res.data && Array.isArray(res.data.data)) {
          setPlans(res.data.data);
        }
      } catch (err) {
        console.error("❌ Failed to fetch plans:", err?.response?.data || err);
        alert("Failed to load plans!");
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // Xem chi tiết plan và show modal
  const handleViewPlanDetail = async (planId) => {
    try {
      setDetailLoading(true);
      const res = await api.get(`/Plan/plan-detail/${planId}`);
      setPlanDetail(res.data?.data);
      setShowModal(true);
    } catch (err) {
      console.error(
        "❌ Failed to fetch plan details:",
        err?.response?.data || err
      );
      alert("Cannot load plan details!");
    } finally {
      setDetailLoading(false);
    }
  };

  // ✅ Đăng ký gói thuê — sửa payload đúng schema BE (bọc trong requestDto)
  const register = async () => {
    if (!selected) return alert("Please choose a plan first!");

    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (!token || !userId) {
      alert("⚠️ Please log in again!");
      navigate("/login");
      return;
    }
    const payload = { driverId: { userId }, planId: selected.planId };

    try {
      const res = await api.post("/Transaction/transaction-register", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // BE hiện chỉ trả message thành công
      const msg = res.data?.message || "Registration success!";
      alert(`✅ ${msg}`);
      navigate("/user/transaction");
    } catch (err) {
      const v = err?.response?.data;
      // Gom lỗi validation (nếu có)
      let msg =
        (v?.title && `${v.title}`) ||
        v?.message ||
        err?.message ||
        "Registration failed!";
      if (v?.errors && typeof v.errors === "object") {
        const details = Object.entries(v.errors)
          .map(([k, arr]) => `${k}: ${(arr || []).join(", ")}`)
          .join("\n");
        msg += `\n${details}`;
      }
      console.error("❌ Registration error:", err?.response?.data || err);
      alert(`❌ ${msg}`);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-600">
        <div className="animate-spin h-10 w-10 border-4 border-blue-400 border-t-transparent rounded-full mr-3"></div>
        Loading plans...
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-100 to-yellow-100 py-10 px-4">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          <i
            className="bi bi-lightning-charge-fill"
            style={{ color: "red" }}
          ></i>{" "}
          Choose Your Subscription
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="p-3">Package</th>
                <th>Batteries</th>
                <th>Mileage (km)</th>
                <th>Price (₫)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-6 text-gray-500">
                    No subscription plans available.
                  </td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr
                    key={p.planId}
                    className={`border-b hover:bg-yellow-50 transition ${selected?.planId === p.planId ? "bg-yellow-100" : ""
                      }`}
                  >
                    <td className="p-3 font-semibold text-gray-800">
                      {p.planName}
                    </td>
                    <td>{p.numberBattery}</td>
                    <td>
                      {p.milleageBaseUsed > 0
                        ? p.milleageBaseUsed
                        : "Unlimited"}
                    </td>
                    <td>{Number(p.price || 0).toLocaleString("vi-VN")}</td>
                    <td className="space-x-2">
                      <button
                        onClick={() => handleViewPlanDetail(p.planId)}
                        className="px-3 py-1 bg-blue-100 hover:bg-blue-200 rounded-lg"
                      >
                        <i
                          className="bi bi-exclamation-circle"
                          style={{ color: "blue" }}
                        ></i>{" "}
                        Details
                      </button>
                      <button
                        onClick={() => setSelected(p)}
                        className={`px-3 py-1 rounded-full ${selected?.planId === p.planId
                          ? "bg-yellow-400 font-semibold"
                          : "bg-yellow-200 hover:bg-yellow-300"
                          }`}
                      >
                        {selected?.planId === p.planId ? "Selected" : "Choose"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="text-center mt-8 space-x-3">
          <button
            onClick={register}
            disabled={!selected}
            className={`px-6 py-2 rounded-lg font-semibold ${selected
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-400 text-gray-100 cursor-not-allowed"
              }`}
          >
            <i
              className="bi bi-check-circle-fill"
              style={{ color: "blue" }}
            ></i>{" "}
            Confirm Registration
          </button>
          <button
            onClick={() => navigate("/user/service")}
            className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold"
          >
            <i className="bi bi-arrow-left" style={{ color: "blue" }}></i>
            Back
          </button>
        </div>
      </div>
      {/* Modal – Expanded & Clearer */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden transform transition-all duration-200">

            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-400 to-blue-600 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
                  <i className="bi bi-lightning-charge-fill text-yellow-300 text-xl" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide opacity-80">
                    Subscription Plan
                  </p>
                  <h2 className="text-xl font-semibold">
                    {planDetail?.plans?.planName || "Plan Details"}
                  </h2>
                </div>
              </div>

              {planDetail?.plans && (
                <div className="text-right">
                  <div className="text-[11px] uppercase opacity-70">Price</div>
                  <div className="text-xl font-bold">
                    {Number(planDetail.plans.price || 0).toLocaleString("vi-VN")}₫
                  </div>
                  <div className="text-xs opacity-80">
                    / {planDetail.plans.durationDays} days
                  </div>
                </div>
              )}
            </div>

            {/* Body */}
            {detailLoading ? (
              <div className="p-8 flex items-center justify-center text-gray-600">
                <div className="animate-spin h-8 w-8 border-4 border-blue-400 border-t-transparent rounded-full mr-3" />
                Loading plan details...
              </div>
            ) : (
              <div className="p-6 space-y-6">

                {/* Overview Cards */}
                <div className="grid md:grid-cols-2 gap-4">

                  {/* Overview */}
                  <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4 shadow-sm">
                    <h3 className="text-cyan-700 font-semibold mb-2 flex items-center gap-2 text-sm">
                      <i className="bi bi-info-circle" /> Overview
                    </h3>
                    <ul className="text-gray-700 space-y-1 text-sm">
                      <li>
                        <span className="font-medium">Batteries:</span>{" "}
                        {planDetail.plans.numberBattery}
                      </li>
                      <li>
                        <span className="font-medium">Duration:</span>{" "}
                        {planDetail.plans.durationDays} days
                      </li>
                      <li>
                        <span className="font-medium">Mileage:</span>{" "}
                        {planDetail.plans.milleageBaseUsed > 0
                          ? `${planDetail.plans.milleageBaseUsed} km`
                          : "Unlimited"}
                      </li>
                    </ul>
                  </div>

                  {/* Highlights */}
                  <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
                    <h3 className="text-yellow-800 font-semibold mb-2 flex items-center gap-2 text-sm">
                      <i className="bi bi-star-fill text-yellow-500" /> Highlights
                    </h3>
                    <ul className="space-y-1 text-gray-700 text-sm">
                      <li className="flex items-center gap-2">
                        <i className="bi bi-check-circle-fill text-green-600" />
                        Best for daily commuters
                      </li>
                      <li className="flex items-center gap-2">
                        <i className="bi bi-check-circle-fill text-green-600" />
                        Includes flexible mileage options
                      </li>
                      <li className="flex items-center gap-2">
                        <i className="bi bi-check-circle-fill text-green-600" />
                        Transparent fee system
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Fee Table Title */}
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <i className="bi bi-receipt" />
                    Fee Details
                  </h3>

                  <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs border">
                    {(planDetail.planFees || []).length} items
                  </span>
                </div>

                {/* Fee Table – Compact */}
                <div className="border border-gray-300 rounded-2xl overflow-hidden shadow-md">
                  <div className="max-h-[320px] overflow-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-gray-100 border-b-2 border-gray-300">
                        <tr>
                          <th className="p-3 text-left border-r">Icon</th>
                          <th className="p-3 text-left border-r">Type</th>
                          <th className="p-3 text-right border-r">Amount</th>
                          <th className="p-3 text-left border-r">Unit</th>
                          {/* no-wrap range */}
                          <th className="p-3 text-center border-r whitespace-nowrap">
                            Range
                          </th>
                          <th className="p-3 text-left">Description</th>
                        </tr>
                      </thead>

                      <tbody>
                        {(planDetail.planFees || []).map((fee, index) => (
                          <tr
                            key={index}
                            className={`border-b ${index % 2 === 0 ? "bg-white" : "bg-gray-50"
                              } hover:bg-yellow-50 transition`}
                          >
                            <td className="p-3 border-r text-center align-top">
                              <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow">
                                {getFeeIcon(fee.typeOfFee)}
                              </div>
                            </td>

                            <td className="p-3 border-r font-semibold text-gray-900 align-top">
                              {fee.typeOfFee}
                            </td>

                            <td className="p-3 border-r text-right font-bold text-blue-700 align-top">
                              {Number(fee.amountFee || 0).toLocaleString("vi-VN")}
                            </td>

                            <td className="p-3 border-r text-gray-700 align-top">
                              {fee.unit || "-"}
                            </td>

                            {/* no-wrap value */}
                            <td className="p-3 border-r text-center text-gray-700 align-top whitespace-nowrap">
                              {fee.minValue} – {fee.maxValue}
                            </td>

                            <td className="p-3 text-gray-700 align-top leading-relaxed">
                              {fee.description || "-"}
                            </td>
                          </tr>
                        ))}

                        {(planDetail.planFees || []).length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-gray-500">
                              No fee details available.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex flex-col sm:flex-row justify-between items-center gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-sm font-semibold flex items-center gap-2"
              >
                <i className="bi bi-x-circle" />
                Close
              </button>

              <button
                onClick={() => {
                  if (planDetail?.plans) {
                    setSelected(planDetail.plans);
                    setShowModal(false);
                    alert(`✅ ${planDetail.plans.planName} selected!`);
                  }
                }}
                className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center gap-2 shadow-md"
              >
                <i className="bi bi-check-circle-fill" />
                Select This Plan
              </button>
            </div>
          </div>
        </div>
      )}



    </div>
  );
}
