/* eslint-disable no-unused-vars */
import { useEffect, useMemo, useState } from "react";
import Services from "../components/Services";
import PageTransition from "@/components/PageTransition";
import AuthModal from "../components/AuthModal";
import api from "@/api/api";

/* ===== Format helpers ===== */
const fmtVND = (n, { code = false } = {}) => {
  const num = typeof n === "string" ? Number(n.replace(/[^\d.-]/g, "")) || 0 : Number(n || 0);
  // code=false -> ₫ ; code=true -> VND
  return num.toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    currencyDisplay: code ? "code" : "symbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};
const fmtNum = (n, { min = 0, max = 0 } = {}) => {
  const num = typeof n === "string" ? Number(n.replace(/[^\d.-]/g, "")) || 0 : Number(n || 0);
  return num.toLocaleString("vi-VN", { minimumFractionDigits: min, maximumFractionDigits: max });
};

/** Quy ước nhãn “Unlimited” cho GU, TP3U (không có milleageBaseUsed) */
const isUnlimitedPlan = (planName) => {
  const p = String(planName || "").toUpperCase();
  return p === "GU" || p === "TP3U";
};

/** Gom plan theo prefix nhóm “G” và “TP” */
const groupPlans = (planList = []) => {
  const swap = [];       // G1, G2, G3, GU
  const selfCharge = []; // TP1, TP2, TP3, TP3U
  for (const p of planList) {
    const name = String(p.planName || "").toUpperCase();
    if (name.startsWith("G")) swap.push(p);
    else if (name.startsWith("TP")) selfCharge.push(p);
  }
  swap.sort((a, b) => String(a.planName).localeCompare(String(b.planName)));
  selfCharge.sort((a, b) => String(a.planName).localeCompare(String(b.planName)));
  return { swap, selfCharge };
};

/** Lấy feeGroup theo groupKey (“G” hoặc “TP”) */
const getFeeGroup = (feeGroups = [], key) =>
  feeGroups.find((g) => String(g.groupKey || "").toUpperCase() === String(key).toUpperCase())?.feeSummary || null;

/** Tạo label khoảng km từ min/max BE */
const bandLabel = (minValue, maxValue) => {
  const min = Number(minValue ?? 0);
  const max = Number(maxValue ?? 0);

  // “999999” hay giá trị cực lớn coi như vô hạn
  const isMaxInfinity = !isFinite(max) || max >= 999999;

  if (min <= 0 && !isMaxInfinity) return `Up to ${fmtNum(max)} km`;
  if (min > 0 && !isMaxInfinity) return `From ${fmtNum(min)} to ${fmtNum(max)} km`;
  if (min > 0 && isMaxInfinity) return `From ${fmtNum(min)} km onwards`;
  return `${fmtNum(min)} - ${isMaxInfinity ? "∞" : fmtNum(max)} km`;
};

export default function ServicesPage() {
  // Modal đăng nhập / đăng ký
  const [authModal, setAuthModal] = useState({ isOpen: false, mode: "signup" });
  const openAuthModal = (mode) => setAuthModal({ isOpen: true, mode });
  const closeAuthModal = () => setAuthModal({ isOpen: false, mode: "signup" });

  // BE data
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [planList, setPlanList] = useState([]);
  const [feeGroups, setFeeGroups] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await api.get("/Plan/view-plan-landscape");
        const data = res?.data?.data ?? res?.data ?? {};
        const plans = Array.isArray(data?.planList) ? data.planList : [];
        const fees = Array.isArray(data?.feeGroups) ? data.feeGroups : [];
        setPlanList(plans);
        setFeeGroups(fees);
      } catch (e) {
        console.error("view-plan-landscape error:", e?.response?.data || e);
        setErr(e?.response?.data?.message || e?.message || "Không tải được gói dịch vụ.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const { swap: swapPlans, selfCharge: selfPlans } = useMemo(() => groupPlans(planList), [planList]);

  // Fee cho từng nhóm
  const feeG = useMemo(() => getFeeGroup(feeGroups, "G"), [feeGroups]);
  const feeTP = useMemo(() => getFeeGroup(feeGroups, "TP"), [feeGroups]);

  /* ================== RENDER HELPERS ================== */

  const renderPlanCard = (pkg, highlightUnlimited = false) => {
    const name = pkg.planName;
    const tagUnlimited = isUnlimitedPlan(name);
    const tag = tagUnlimited ? "Unlimited" : "Limited";

    const priceText = fmtVND(pkg.price, { code: true }); // “123.000 VND”
    const mileage =
      tagUnlimited || pkg.milleageBaseUsed == null
        ? "Unlimited"
        : `${fmtNum(pkg.milleageBaseUsed)} km / month`;

    return (
      <div
        key={pkg.planId}
        className={[
          "p-8 text-center rounded-2xl shadow-md border transition transform hover:-translate-y-2 hover:shadow-2xl duration-300",
          highlightUnlimited && tagUnlimited
            ? "border-2 border-[var(--brand-end)] bg-gradient-to-b from-white via-blue-50 to-blue-100"
            : "bg-white",
        ].join(" ")}
      >
        <div
          className={[
            "px-3 py-1 rounded-full text-xs font-semibold mb-4 inline-block",
            tagUnlimited
              ? "brand-gradient text-white shadow-md"
              : "bg-[var(--brand-50)] text-[var(--brand-end)]",
          ].join(" ")}
        >
          {tag}
        </div>

        <h4 className="text-2xl font-bold text-gray-900 mb-3">{name}</h4>

        <div className="text-3xl font-extrabold text-[var(--brand-end)] mb-4">
          <span className="block">{priceText}</span>
          <span className="text-sm text-gray-600">per month</span>
        </div>

        <ul className="space-y-2 text-gray-600 mb-6 text-sm">
          <li>• Battery count: {pkg.numberBattery ?? "-"}</li>
          <li>• Base mileage: {mileage}</li>
          <li>• VAT included</li>
        </ul>

        <button
          onClick={() => openAuthModal("signup")}
          className="w-full text-sm py-2 rounded-full font-semibold brand-gradient text-white hover:opacity-95 transition"
        >
          Choose Plan
        </button>
      </div>
    );
  };

  /** Bảng fee theo dải km — dựng hoàn toàn theo BE, hỗ trợ n cột */
  const renderExcessTable = (feeSummary, title = "Excess Mileage Fee") => {
    if (!feeSummary) return null;
    const rows = Array.isArray(feeSummary.excessMileage) ? feeSummary.excessMileage.slice() : [];
    if (!rows.length) return null;

    // sắp xếp theo minValue tăng dần
    rows.sort((a, b) => Number(a.minValue ?? 0) - Number(b.minValue ?? 0));

    const chip = (label, value) => (
      <div className="px-4 py-2 rounded-full text-sm font-semibold text-white brand-gradient shadow">
        {label}: <span className="font-bold text-yellow-200 ml-1">{value}</span>
      </div>
    );

    const booking = feeSummary.booking ? fmtVND(feeSummary.booking.amount) : null;
    const deposit = feeSummary.batteryDeposit ? fmtVND(feeSummary.batteryDeposit.amount) : null;
    const swapFee = feeSummary.batterySwap ? fmtVND(feeSummary.batterySwap.amount) : null;

    return (
      <div className="mt-16 bg-gradient-to-b from-blue-50 to-green-50 p-8 rounded-3xl shadow-inner">
        <h4 className="text-2xl font-extrabold text-[var(--brand-end)] text-center mb-6 tracking-wide uppercase">
          {title}
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-center bg-white rounded-2xl shadow-sm overflow-hidden">
            <thead>
              <tr className="bg-gradient-to-r from-blue-100 to-blue-50 text-gray-800 text-sm font-semibold">
                <th className="py-3 px-4 border border-blue-200 rounded-tl-2xl">
                  Monthly mileage (km)
                </th>
                {rows.map((r, idx) => (
                  <th key={idx} className="py-3 px-4 border border-blue-200">
                    {bandLabel(r.minValue, r.maxValue)}
                  </th>
                ))}
                <th className="py-3 px-4 border border-blue-200 rounded-tr-2xl">
                  Unit
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-gray-700">
                <td className="py-4 px-4 border border-blue-100 font-medium text-sm bg-blue-50">
                  Extra fee – VAT included
                </td>
                {rows.map((r, idx) => (
                  <td key={idx} className="py-4 px-4 border border-blue-100 font-semibold text-[var(--brand-end)]">
                    {fmtNum(r.amount)}
                  </td>
                ))}
                <td className="py-4 px-4 border border-blue-100 text-sm text-gray-600">
                  {rows[0]?.unit || "VND/km"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {(booking || deposit || swapFee) && (
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {swapFee && chip("Swap Fee per Time", swapFee)}
            {deposit && chip("Battery Deposit", deposit)}
            {booking && chip("Booking Fee", booking)}
          </div>
        )}
      </div>
    );
  };

  return (
    <PageTransition>
      <main className="pt-16 bg-gradient-to-b from-gray-50 via-white to-gray-100">
        <Services />

        <section className="section-padding">
          <div className="max-w-7xl mx-auto">
            {/* Title */}
            <div className="text-center mb-16">
              <h2 className="text-5xl font-extrabold text-brand-gradient mb-4">
                Service Packages
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Choose the perfect battery service plan for your EV needs.
              </p>
            </div>

            {/* ===== Monthly Battery Swap Service (G*) ===== */}
            <div className="mb-20">
              <h3 className="text-3xl font-bold text-gray-900 mb-10 text-center">
                Monthly Battery Swap Service
              </h3>

              {loading ? (
                <div className="flex items-center justify-center py-10 text-gray-600">
                  <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mr-3" />
                  Loading plans…
                </div>
              ) : err ? (
                <div className="text-center text-red-600">{err}</div>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {swapPlans.map((p) => renderPlanCard(p, true))}
                  </div>
                  {renderExcessTable(feeG, "Excess Mileage Fee")}
                </>
              )}
            </div>

            {/* ===== Monthly Self-Charging Battery Rental Service (TP*) ===== */}
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-10 text-center">
                Monthly Self-Charging Battery Rental Service
              </h3>

              {loading ? (
                <div className="flex items-center justify-center py-10 text-gray-600">
                  <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mr-3" />
                  Loading plans…
                </div>
              ) : err ? (
                <div className="text-center text-red-600">{err}</div>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {selfPlans.map((p) => renderPlanCard(p, true))}
                  </div>
                  {renderExcessTable(feeTP, "Excess Mileage Fee")}
                </>
              )}
            </div>
          </div>
        </section>

        {/* Modal đăng nhập / đăng ký */}
        <AuthModal isOpen={authModal.isOpen} onClose={closeAuthModal} initialMode={authModal.mode} />
      </main>
    </PageTransition>
  );
}