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

      {/* Modal */}
      {showModal && planDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-11/12 max-w-3xl p-6 transform transition-all">
            <h2 className="text-2xl font-bold mb-4 text-center">
              Plan Details: {planDetail.plans.planName}
            </h2>

            <div className="mb-4">
              <p>
                <strong>Price:</strong>{" "}
                {Number(planDetail.plans.price || 0).toLocaleString("vi-VN")}₫
              </p>
              <p>
                <strong>Batteries:</strong> {planDetail.plans.numberBattery}
              </p>
              <p>
                <strong>Duration:</strong> {planDetail.plans.durationDays} days
              </p>
              <p>
                <strong>Mileage:</strong> {planDetail.plans.milleageBaseUsed} km
              </p>
            </div>

            <h3 className="font-semibold text-lg mb-2"> Fee Details</h3>
            <table className="w-full text-center border-collapse border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2">Icon</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Unit</th>
                  <th>Range</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {(planDetail.planFees || []).map((fee, index) => (
                  <tr key={index} className="border">
                    <td className="text-lg">{getFeeIcon(fee.typeOfFee)}</td>
                    <td>{fee.typeOfFee}</td>
                    <td>{fee.amountFee}</td>
                    <td>{fee.unit}</td>
                    <td>
                      {fee.minValue} - {fee.maxValue}
                    </td>
                    <td>{fee.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-right mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 mr-2"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelected(planDetail.plans);
                  setShowModal(false);
                  alert(
                    `✅ ${planDetail.plans.planName} selected! Now press Confirm Registration.`
                  );
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Select This Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
