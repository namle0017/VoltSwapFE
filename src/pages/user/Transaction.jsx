/* eslint-disable no-unused-vars */
// src/pages/user/Transaction.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "@/api/api";
import { useSearchParams, useNavigate } from "react-router-dom";

/* ========================= Little UI helpers ========================= */
function toneToClasses(tone, outlined = false) {
    switch (tone) {
        case "brand":
            return outlined
                ? "border-[var(--brand-end)]/40 bg-[var(--brand-50)]"
                : "bg-[var(--brand-50)]";
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

function useToast() {
    const [msg, setMsg] = useState("");
    useEffect(() => {
        if (!msg) return;
        const t = setTimeout(() => setMsg(""), 1600);
        return () => clearTimeout(t);
    }, [msg]);
    const Toast = () =>
        msg ? (
            <div className="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-xl text-white brand-gradient shadow-lg">
                {msg}
            </div>
        ) : null;
    return { setMsg, Toast };
}

function FancyAmount({ value, prefix = "", suffix = "₫", duration = 600 }) {
    const [n, setN] = useState(0);
    const [from, setFrom] = useState(0);
    useEffect(() => {
        const to = Number(value || 0);
        const start = performance.now();
        const tick = (t) => {
            const p = Math.min(1, (t - start) / duration);
            const v = from + (to - from) * (1 - Math.pow(1 - p, 3));
            setN(v);
            if (p < 1) requestAnimationFrame(tick);
            else setFrom(to);
        };
        requestAnimationFrame(tick);
    }, [value, duration]); // eslint-disable-line
    return (
        <span className="font-extrabold text-[var(--brand-end)]">
            {prefix}
            {Math.round(n).toLocaleString("vi-VN")}
            {suffix}
        </span>
    );
}

function StatusPill({ status }) {
    const s = String(status || "pending").toLowerCase();
    const tone = /success|approved|paid/.test(s)
        ? "success"
        : /fail|denied|cancel/.test(s)
            ? "danger"
            : "warn";
    const map = {
        success: "bg-emerald-50 text-emerald-700 border-emerald-200",
        warn: "bg-amber-50 text-amber-700 border-amber-200",
        danger: "bg-rose-50 text-rose-700 border-rose-200",
    };
    const icon =
        tone === "success"
            ? "check-circle"
            : tone === "danger"
                ? "x-circle"
                : "hourglass-split";
    return (
        <span
            title={`Payment status: ${status}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition 
                  hover:scale-[1.03] hover:shadow-sm ${map[tone]}`}
        >
            <i className={`bi bi-${icon}`} />
            {status}
        </span>
    );
}

function SkeletonRow() {
    return (
        <tr className="animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
                <td key={i} className="py-3 px-2">
                    <div className="h-4 w-[70%] bg-gray-200 rounded" />
                </td>
            ))}
        </tr>
    );
}

function EmptyState({ onAction }) {
    return (
        <div className="text-center py-12">
            <div className="h-16 w-16 mx-auto rounded-2xl brand-gradient text-white grid place-items-center mb-3">
                <i className="bi bi-inboxes" />
            </div>
            <p className="text-gray-800 font-medium">No transactions yet</p>
            <p className="text-gray-500 text-sm mb-4">
                Your payments will appear here.
            </p>
            {onAction && (
                <button
                    onClick={onAction}
                    className="px-4 py-2 rounded-xl text-white brand-gradient hover:opacity-95"
                >
                    Make a payment
                </button>
            )}
        </div>
    );
}

/* =============================== Page =============================== */
export default function Transaction() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [payingId, setPayingId] = useState("");
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState("All");

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setMsg, Toast } = useToast();

    // VNPAY callback
    useEffect(() => {
        const success = searchParams.get("success");
        const txnRef = searchParams.get("txnRef");
        const transNo = searchParams.get("transNo");

        if (success === "true" && txnRef) {
            setTransactions((prev) =>
                prev.map((t) =>
                    t.transactionId === txnRef
                        ? { ...t, paymentStatus: "Success", vnpayTransactionNo: transNo }
                        : t
                )
            );
            alert(`Thanh toán thành công! Mã VNPAY: ${transNo}`);
            navigate("/user/transaction", { replace: true });
            setTimeout(() => window.location.reload(), 1200);
        } else if (success === "false") {
            alert("Thanh toán thất bại. Vui lòng thử lại.");
            navigate("/user/transaction", { replace: true });
        }
    }, [searchParams, navigate]);

    // Load data
    useEffect(() => {
        const loadTransactions = async () => {
            try {
                const token = localStorage.getItem("token");
                const userId = localStorage.getItem("userId");

                const res = await api.get(
                    `/Transaction/user-transaction-history-list/${userId}`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );

                const transactionData =
                    (res.data && Array.isArray(res.data.data) && res.data.data) ||
                    (res.data && Array.isArray(res.data) && res.data) ||
                    [];

                setTransactions(transactionData);
            } catch (err) {
                console.error("Failed to load transactions:", err);
                alert("Failed to load transaction history.");
            } finally {
                setLoading(false);
            }
        };
        loadTransactions();
    }, []);

    const startPayment = async (transactionId) => {
        if (!transactionId) return;
        setPayingId(transactionId);
        try {
            const token = localStorage.getItem("token");
            const res = await api.post("/Payment/create-payment", null, {
                params: { transactionId },
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            const url = res?.data?.paymentUrl || res?.data?.data?.paymentUrl || "";
            if (!url) throw new Error("No payment URL");
            window.location.href = url;
        } catch (err) {
            alert(
                `Tạo phiên thanh toán thất bại: ${err?.response?.data?.message || err.message
                }`
            );
        } finally {
            setPayingId("");
        }
    };

    // Quick filter + search
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return transactions.filter((t) => {
            const status = String(t.paymentStatus || "Pending");
            const passFilter =
                filter === "All" ||
                (filter === "Pending" && /pending|waiting/i.test(status)) ||
                (filter === "Success" && /success|approved|paid/i.test(status)) ||
                (filter === "Failed" && /fail|denied|cancel/i.test(status));
            const passQuery =
                !q ||
                String(t.transactionId || "")
                    .toLowerCase()
                    .includes(q) ||
                String(t.transactionNote || t.transactionType || "")
                    .toLowerCase()
                    .includes(q);
            return passFilter && passQuery;
        });
    }, [transactions, filter, query]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white">
                <div className="max-w-5xl mx-auto px-4 md:px-6 py-10">
                    <Header />
                    <Card>
                        <TableHead />
                        <tbody>
                            {Array.from({ length: 7 }).map((_, i) => (
                                <SkeletonRow key={i} />
                            ))}
                        </tbody>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen">
            <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
                <Header />

                <Card>
                    {/* Toolbar */}
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <i className="bi bi-search absolute left-3 top-2.5 text-gray-400 text-sm" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search ID / note…"
                                className="pl-9 pr-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[var(--brand-end)]"
                            />
                        </div>
                        {["All", "Pending", "Success", "Failed"].map((x) => (
                            <button
                                key={x}
                                onClick={() => setFilter(x)}
                                className={`px-3 py-1.5 rounded-full text-sm border ${filter === x
                                    ? "bg-[var(--brand-50)] text-[var(--brand-end)] border-[var(--brand-end)]/30"
                                    : "bg-white text-gray-700 hover:bg-gray-50"
                                    }`}
                            >
                                {x}
                            </button>
                        ))}
                    </div>

                    {/* Table */}
                    {filtered.length === 0 ? (
                        <EmptyState onAction={null} />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-center">
                                <TableHead />
                                <tbody>
                                    {filtered.map((t) => {
                                        const status = String(t.paymentStatus || "Pending");
                                        const isPending = /pending|waiting/i.test(status);
                                        const formattedDate = t.paymentDate
                                            ? new Date(t.paymentDate).toLocaleDateString("en-CA")
                                            : "—";
                                        const btnLoading = payingId === t.transactionId;

                                        return (
                                            <tr
                                                key={
                                                    t.transactionId ||
                                                    `${t.planId}-${t.createdAt || Math.random()}`
                                                }
                                                className="group border-b hover:bg-[var(--brand-50)]/40 transition"
                                            >
                                                <td className="py-3 px-2 font-semibold text-gray-800 group/td text-left">
                                                    <span className="mr-2">{t.transactionId || "—"}</span>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(
                                                                t.transactionId || ""
                                                            );
                                                            setMsg("Copied ID");
                                                        }}
                                                        className="opacity-0 group-hover/td:opacity-100 transition text-[11px] px-2 py-0.5 rounded border"
                                                    >
                                                        Copy
                                                    </button>
                                                </td>
                                                <td className="py-3 px-2 text-gray-700 text-left">
                                                    {t.transactionNote || t.transactionType || "—"}
                                                </td>
                                                <td className="py-3 px-2">
                                                    <FancyAmount value={t.amount} />
                                                </td>
                                                <td className="py-3 px-2">
                                                    <StatusPill status={status} />
                                                </td>
                                                <td className="py-3 px-2 text-gray-600">
                                                    {formattedDate}
                                                </td>
                                                <td className="py-3 px-2">
                                                    {isPending && Number(t.amount || 0) > 0 ? (
                                                        <button
                                                            onClick={() => startPayment(t.transactionId)}
                                                            disabled={btnLoading}
                                                            className="text-white text-sm px-4 py-1.5 rounded shadow flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
                                                            style={{ backgroundColor: "#2f66ff" }}
                                                            onMouseEnter={(e) =>
                                                                (e.target.style.backgroundColor = "#2758d8")
                                                            }
                                                            onMouseLeave={(e) =>
                                                                (e.target.style.backgroundColor = "#2f66ff")
                                                            }
                                                        >
                                                            {btnLoading ? (
                                                                "Processing…"
                                                            ) : (
                                                                <>
                                                                    <i className="bi bi-credit-card-fill text-base"></i>
                                                                    Pay Now
                                                                </>
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() =>
                                                                setMsg(
                                                                    t.vnpayTransactionNo
                                                                        ? "Copied VNPAY No"
                                                                        : "No VNPAY No"
                                                                )
                                                            }
                                                            onMouseDown={() => {
                                                                if (t.vnpayTransactionNo) {
                                                                    navigator.clipboard.writeText(
                                                                        t.vnpayTransactionNo
                                                                    );
                                                                }
                                                            }}
                                                            className="text-xs px-3 py-1.5 rounded border flex items-center gap-2 text-[var(--brand-end)] bg-white hover:bg-[var(--brand-50)] transition"
                                                        >
                                                            {t.vnpayTransactionNo ? (
                                                                <>
                                                                    <i className="bi bi-clipboard-check text-sm"></i>
                                                                    Copy VNPAY No
                                                                </>
                                                            ) : (
                                                                "—"
                                                            )}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>
            <Toast />
        </div>
    );
}

/* ============================ Small bits ============================ */
function Header() {
    return (
        <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl brand-gradient text-white grid place-items-center shadow-sm">
                    <i className="bi bi-receipt-cutoff text-lg" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        <span className="text-brand-gradient">Transactions</span>
                    </h2>
                    <p className="text-gray-500 text-sm">
                        Your payment history & receipts
                    </p>
                </div>
            </div>
            <span className="text-xs text-gray-500">
                Last update: {new Date().toLocaleTimeString()}
            </span>
        </div>
    );
}

function Card({ children }) {
    return (
        <div className="bg-white border rounded-2xl shadow-sm p-6">{children}</div>
    );
}

function TableHead() {
    return (
        <thead>
            <tr className="text-sm bg-[var(--brand-50)] text-[var(--brand-end)]">
                <th className="py-3 px-2 rounded-tl-lg text-left">Transaction ID</th>
                <th className="py-3 px-2 text-left">Transaction Note</th>
                <th className="py-3 px-2">Amount</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2">Date</th>
                <th className="py-3 px-2 rounded-tr-lg">Action</th>
            </tr>
        </thead>
    );
}
