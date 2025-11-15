// src/pages/user/ChangeService.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/api";

export default function ChangeService() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [currentSubId, setCurrentSubId] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🧭 Load dữ liệu
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const userDriverId = localStorage.getItem("userId");

        // 1️⃣ Lấy danh sách tất cả plan
        const planRes = await api.get("/Plan/plan-list");
        const planList = Array.isArray(planRes.data.data)
          ? planRes.data.data
          : [];
        setPlans(planList);

        // 2️⃣ Lấy subscription hiện tại
        const subRes = await api.get(
          `/Subscription/subscription-user-list?DriverId=${userDriverId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (subRes.data?.data?.length > 0) {
          const activeSub = subRes.data.data[0]; // Giả định lấy gói đầu tiên trong danh sách trả về
          const foundPlan = planList.find(
            (p) => p.planName === activeSub.planName
          );
          setCurrentPlan(foundPlan || null);
          setCurrentSubId(activeSub.subId || "");
        } else {
          setCurrentPlan(null);
        }
      } catch (err) {
        console.error("❌ Error loading data:", err);
        alert("Failed to load plans or subscription info!");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 🔁 Xử lý đổi gói
  const handleChangePlan = async () => {
    if (!selected) return alert("Please select a new plan!");
    if (selected.planId === currentPlan?.planId)
      return alert("You are already on this plan!");

    try {
      const driverId = localStorage.getItem("userId");
      const token = localStorage.getItem("token");

      await api.post(
        "/Subscription/change",
        {
          userDriverId: driverId,
          subscriptionId: currentSubId,
          newPlanId: selected.planId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("✅ Plan changed successfully!");
      navigate("/user/transaction");
    } catch (err) {
      console.error("❌ Error changing plan:", err);
      alert("Failed to change plan. Please try again.");
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
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-cyan-100 py-10 px-4">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-8">
          <i className="bi bi-arrow-repeat" style={{ color: "blue" }}></i>{" "}
          Change Subscription Plan
        </h2>

        {currentPlan && (
          <div className="text-center mb-8">
            <p className="text-gray-700 text-lg">
              <strong>Current Plan:</strong>{" "}
              <span className="text-blue-700 font-semibold">
                {currentPlan.planName}
              </span>{" "}
              — {currentPlan.price.toLocaleString()}₫
            </p>
          </div>
        )}

        {/* 📋 Danh sách gói */}
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="p-3">Plan</th>
                <th>Batteries</th>
                <th>Duration</th>
                <th>Mileage</th>
                <th>Price (₫)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr
                  key={p.planId}
                  className={`border-b hover:bg-yellow-50 transition ${
                    selected?.planId === p.planId ? "bg-yellow-100" : ""
                  }`}
                >
                  <td className="p-3 font-semibold">{p.planName}</td>
                  <td>{p.numberBattery}</td>
                  <td>{p.durationDays} days</td>
                  <td>
                    {p.milleageBaseUsed > 0
                      ? `${p.milleageBaseUsed} km`
                      : "Unlimited"}
                  </td>
                  <td>{p.price.toLocaleString()}</td>
                  <td>
                    {currentPlan?.planId === p.planId ? (
                      <span className="text-green-600 font-semibold">
                        In Use
                      </span>
                    ) : (
                      <button
                        onClick={() => setSelected(p)}
                        className={`px-3 py-1 rounded-full ${
                          selected?.planId === p.planId
                            ? "bg-yellow-400 text-black font-semibold"
                            : "bg-yellow-200 hover:bg-yellow-300"
                        }`}
                      >
                        {selected?.planId === p.planId ? "Selected" : "Choose"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 🎛 Nút hành động */}
        <div className="text-center mt-10 space-x-3">
          <button
            onClick={handleChangePlan}
            disabled={!selected}
            className={`px-6 py-2 rounded-lg font-semibold ${
              selected
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-400 text-gray-100 cursor-not-allowed"
            }`}
          >
            <i className="bi bi-arrow-repeat" style={{ color: "blue" }}></i>{" "}
            Confirm Change
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
    </div>
  );
}
