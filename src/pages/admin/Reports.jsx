// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import PageTransition from "@/components/PageTransition";
import api from "@/api/api";

export default function Reports() {
    // filters
    const now = new Date();
    const [viewType, setViewType] = useState("month"); // 'month' | 'year'
    const [monthValue, setMonthValue] = useState(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    ); // HTML month value 'YYYY-MM'
    const [yearValue, setYearValue] = useState(String(now.getFullYear()));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // data
    const [packages, setPackages] = useState([]); // [{planName,totalRevenue,totalUsers}]
    const [summary, setSummary] = useState({
        totalMonthlyRevenue: 0,
        swapTimes: 0,
        activeCustomer: 0,
    });

    // helpers
    const fmtVND = (n) =>
        new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
            Number(n || 0)
        );

    const cardColor = (key) => {
        // tránh tailwind dynamic class không safelist
        const map = {
            revenue: { bg: "bg-blue-100", text: "text-blue-700" },
            swaps: { bg: "bg-green-100", text: "text-green-700" },
            active: { bg: "bg-yellow-100", text: "text-yellow-700" },
        };
        return map[key] || map.revenue;
    };

    const currentParams = useMemo(() => {
        if (viewType === "month") {
            const [y, m] = monthValue.split("-");
            return { viewType: "month", year: Number(y), month: Number(m) };
        }
        return { viewType: "year", year: Number(yearValue) };
    }, [viewType, monthValue, yearValue]);

    const loadReport = async () => {
        setLoading(true);
        setError("");
        try {
            const token = localStorage.getItem("token");
            const res = await api.get("/Plan/view-plan-list", {
                params: currentParams, // <-- gửi filter cho BE
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

            const data = res?.data?.data || {};
            const list = Array.isArray(data.planList) ? data.planList : [];
            const sum = data.summary || {};

            setPackages(
                list.map((x) => ({
                    planName: x.planName,
                    totalRevenue: Number(x.totalRevenue || 0),
                    totalUsers: Number(x.totalUsers || 0),
                }))
            );
            setSummary({
                totalMonthlyRevenue: Number(sum.totalMonthlyRevenue || 0),
                swapTimes: Number(sum.swapTimes || 0),
                activeCustomer: Number(sum.activeCustomer || 0),
            });
        } catch (e) {
            console.error("view-plan-list error:", e?.response?.data || e);
            setError("Không thể tải báo cáo. Vui lòng thử lại.");
            setPackages([]);
            setSummary({ totalMonthlyRevenue: 0, swapTimes: 0, activeCustomer: 0 });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentParams.viewType, currentParams.year, currentParams.month]);

    return (
        <PageTransition>
            <div className="p-8 bg-gray-50 min-h-screen">
                {/* Header */}
                <div className="mb-6 flex items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                        <p className="text-gray-600">Detailed Reports</p>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-3 bg-white rounded-xl shadow p-3">
                        <select
                            value={viewType}
                            onChange={(e) => setViewType(e.target.value)}
                            className="px-3 py-2 border rounded-lg"
                        >
                            <option value="month">By Month</option>
                            <option value="year">By Year</option>
                        </select>

                        {viewType === "month" ? (
                            <input
                                type="month"
                                value={monthValue}
                                onChange={(e) => setMonthValue(e.target.value)}
                                className="px-3 py-2 border rounded-lg"
                            />
                        ) : (
                            <input
                                type="number"
                                value={yearValue}
                                onChange={(e) => setYearValue(e.target.value)}
                                min="2000"
                                max="2100"
                                className="w-28 px-3 py-2 border rounded-lg"
                                placeholder="YYYY"
                            />
                        )}

                        <button
                            onClick={loadReport}
                            disabled={loading}
                            className={`px-4 py-2 rounded-lg border ${loading ? "text-gray-400" : "hover:bg-gray-50"
                                }`}
                            title="Refresh"
                        >
                            <i className="bi bi-arrow-clockwise mr-1" />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>
                )}

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Left: Revenue by Service */}
                    <motion.div
                        className="bg-white rounded-xl shadow-lg p-6 md:col-span-2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Revenue by Service Subscription
                            </h2>
                            <span className="text-sm text-gray-500">
                                {viewType === "month"
                                    ? `Month ${currentParams.month}/${currentParams.year}`
                                    : `Year ${currentParams.year}`}
                            </span>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center py-16 text-gray-600">
                                <div className="animate-spin h-10 w-10 border-4 border-gray-900 border-t-transparent rounded-full mb-3" />
                                <p>Loading…</p>
                            </div>
                        ) : (
                            <div className="grid sm:grid-cols-2 gap-4">
                                {packages.map((pkg) => (
                                    <motion.div
                                        key={pkg.planName}
                                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-300"
                                        whileHover={{ scale: 1.02 }}
                                    >
                                        <div className="flex justify-between mb-2">
                                            <h3 className="font-semibold text-gray-800">{pkg.planName}</h3>
                                        </div>
                                        <div className="grid grid-cols-2 text-sm text-gray-600">
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase">Revenue</p>
                                                <p className="text-lg font-bold text-gray-900">
                                                    {fmtVND(pkg.totalRevenue)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase">Customers</p>
                                                <p className="text-lg font-bold text-gray-900">
                                                    {pkg.totalUsers}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                                {packages.length === 0 && (
                                    <div className="text-gray-500 italic col-span-full text-center py-8">
                                        No data.
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>

                    {/* Right: Summary */}
                    <motion.div
                        className="space-y-4"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        {/* Revenue */}
                        <SummaryCard
                            value={fmtVND(summary.totalMonthlyRevenue)}
                            label={viewType === "month" ? "Total monthly revenue" : "Total yearly revenue"}
                            colorKey="revenue"
                        />
                        {/* Swaps */}
                        <SummaryCard
                            value={summary.swapTimes}
                            label="Swap Times"
                            colorKey="swaps"
                        />
                        {/* Active Customers */}
                        <SummaryCard
                            value={summary.activeCustomer}
                            label="Active Customers"
                            colorKey="active"
                        />
                    </motion.div>
                </div>
            </div>
        </PageTransition>
    );

    function SummaryCard({ value, label, colorKey }) {
        const c = cardColor(colorKey);
        return (
            <div className={`rounded-xl shadow text-center p-6 ${c.bg}`}>
                <p className={`text-2xl font-bold ${c.text} mb-1`}>{value}</p>
                <p className="text-gray-700 text-sm">{label}</p>
            </div>
        );
    }
}
