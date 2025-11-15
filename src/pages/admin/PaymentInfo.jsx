/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from "react";
import api from "@/api/api";

const LIST_EP = "/Transaction/admin-transaction-list";
const CREATE_EP = "/Transaction/admin-create-transaction";
const DETAIL_EP = "/Transaction/transaction-detail";            // ?requestTransactionId=...
const RECREATE_EP = "/Transaction/recreate-transaction";        // PATCH ?transactionId=...

export default function PaymentInfo() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [creatingAll, setCreatingAll] = useState(false);

    // Detail state
    const [showDetail, setShowDetail] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");
    const [detail, setDetail] = useState(null);
    const [selectedTxId, setSelectedTxId] = useState("");

    // Recreate guard
    const [recreatingIds, setRecreatingIds] = useState(() => new Set());

    const formatVND = (value) =>
        Number(value || 0).toLocaleString("en-US", {
            style: "currency",
            currency: "VND",
        });

    const statusPill = (status) => {
        const s = String(status || "").toLowerCase();
        if (s === "approved" || s === "success") return "bg-green-100 text-green-700";
        if (s === "waiting" || s === "pending") return "bg-yellow-100 text-yellow-700";
        if (s === "denied" || s === "failed" || s === "fail") return "bg-red-100 text-red-700";
        return "bg-gray-100 text-gray-700";
    };

    const isFailed = (status) => {
        const s = String(status || "").toLowerCase();
        return s === "failed" || s === "fail" || s === "denied";
    };

    const loadTransactions = async () => {
        try {
            setRefreshing(true);
            const token = localStorage.getItem("token");
            const res = await api.get(LIST_EP, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            const data = Array.isArray(res?.data?.data) ? res.data.data : [];
            setPayments(data);
        } catch (err) {
            console.error("❌ admin-transaction-list error:", err?.response?.data || err);
            alert("⚠ Failed to load transactions list!");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadTransactions();
    }, []);

    // ===== DETAIL: fetch one transaction =====
    const openDetail = async (transactionId) => {
        if (!transactionId) return;
        setSelectedTxId(transactionId);
        setShowDetail(true);
        setDetailLoading(true);
        setDetailError("");
        setDetail(null);
        try {
            const token = localStorage.getItem("token");
            const res = await api.get(DETAIL_EP, {
                params: { requestTransactionId: transactionId },
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            const payload = res?.data?.data ?? null;

            const normalized = payload
                ? {
                    transactionId: payload.transactionId || transactionId,
                    status: payload.status || "—",
                    transactionType: payload.transactionType || "—",
                    subscriptionId: payload.subscriptionId || "—",
                    driverName: payload.driverName || "—",
                    driverId: payload.driverId || "—",
                    planName: payload.planName || "—",
                    numberOfBooking:
                        typeof payload.numberOfBooking === "number" ? payload.numberOfBooking : 0,
                    totalFee:
                        typeof payload.totalFee === "number"
                            ? payload.totalFee
                            : Number(payload.fee || 0),
                    totalAmount:
                        typeof payload.totalAmount === "number"
                            ? payload.totalAmount
                            : Number(payload.amount || 0),
                }
                : null;

            setDetail(normalized);
        } catch (err) {
            console.error("❌ transaction-detail error:", err?.response?.data || err);
            setDetailError(
                err?.response?.data?.message ||
                err?.message ||
                "Failed to load transaction detail."
            );
        } finally {
            setDetailLoading(false);
        }
    };

    // ===== RECREATE: PATCH ?transactionId=... (only for failed) =====
    const handleRecreate = async (transactionId) => {
        if (!transactionId) return;
        if (recreatingIds.has(transactionId)) return;

        // Modern confirmation modal
        const { ok } = await window.confirmModal({
            title: "Are you sure?",
            message: "This action will attempt to recreate the failed transaction.",
            confirmText: "Recreate",
            cancelText: "Cancel",
            variant: "primary",
        });
        if (!ok) return;

        setRecreatingIds((prev) => new Set(prev).add(transactionId));
        try {
            const token = localStorage.getItem("token");
            await api.patch(RECREATE_EP, null, {
                params: { transactionId },
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

            window.toast.success(`Transaction ${transactionId} recreated successfully.`);
            await loadTransactions();
        } catch (err) {
            console.error("❌ recreate-transaction error:", err?.response?.data || err);
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.title ||
                err?.message ||
                "Failed to recreate transaction.";
            window.toast.error(msg);
        } finally {
            setRecreatingIds((prev) => {
                const n = new Set(prev);
                n.delete(transactionId);
                return n;
            });
        }
    };

    // ===== BULK CREATE INVOICES (Waiting) =====
    const handleCreateAllInvoices = async () => {
        const eligible = payments.filter(
            (p) => String(p.paymentStatus || "").toLowerCase() === "waiting"
        );

        if (eligible.length === 0) {
            alert("No transactions are eligible for invoice creation.");
            return;
        }

        if (
            !window.confirm(
                `Create invoices for ${eligible.length} transaction(s) currently in Waiting status?`
            )
        )
            return;

        const token = localStorage.getItem("token");
        setCreatingAll(true);

        const results = [];
        try {
            for (const p of eligible) {
                try {
                    await api.post(
                        CREATE_EP,
                        { requestTransactionId: p.transactionId },
                        { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
                    );
                    results.push({ id: p.transactionId, ok: true });
                } catch (e) {
                    console.error("create-invoice failed:", p.transactionId, e?.response?.data || e);
                    results.push({
                        id: p.transactionId,
                        ok: false,
                        msg:
                            e?.response?.data?.message ||
                            e?.response?.data?.title ||
                            e?.message ||
                            "failed",
                    });
                }
            }
        } finally {
            setCreatingAll(false);
        }

        const okCount = results.filter((r) => r.ok).length;
        const fail = results.filter((r) => !r.ok);

        let summary = `✅ Invoice creation completed.\nSuccess: ${okCount}/${eligible.length}`;
        if (fail.length) {
            summary += `\n❌ Failed: ${fail.length}`;
            summary += `\nFailed IDs: ${fail.map((f) => f.id).join(", ")}`;
        }
        alert(summary);

        loadTransactions();
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center mt-20 text-gray-600">
                <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mb-3"></div>
                <p>Loading transactions…</p>
            </div>
        );
    }

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="mb-8 flex flex-wrap gap-3 items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Admin Transaction Management
                    </h1>
                    <p className="text-gray-600">Bulk invoice creation & transaction detail viewer</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={loadTransactions}
                        disabled={refreshing || creatingAll}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
                    >
                        {refreshing ? (
                            "Loading…"
                        ) : (
                            <>
                                <i className="bi bi-arrow-repeat me-1" /> Refresh
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleCreateAllInvoices}
                        disabled={creatingAll || refreshing}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-60"
                        title="Create invoices for all eligible transactions"
                    >
                        {creatingAll ? (
                            "Creating…"
                        ) : (
                            <>
                                <i className="bi bi-receipt me-1" /> Create
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Transactions</h2>

                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-center">
                        <thead className="bg-gray-100 border-b">
                            <tr>
                                <th className="px-4 py-3 text-sm font-semibold text-gray-700">Transaction ID</th>
                                <th className="px-4 py-3 text-sm font-semibold text-gray-700">Amount</th>
                                <th className="px-4 py-3 text-sm font-semibold text-gray-700">Context</th>
                                <th className="px-4 py-3 text-sm font-semibold text-gray-700">Note</th>
                                <th className="px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
                                <th className="px-4 py-3 text-sm font-semibold text-gray-700">Date</th>
                                <th className="px-4 py-3 text-sm font-semibold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-6 text-gray-500 italic">
                                        No transactions found.
                                    </td>
                                </tr>
                            ) : (
                                payments.map((p) => {
                                    const status = String(p.paymentStatus || "").toLowerCase();
                                    const formattedDate = p.paymentDate
                                        ? new Date(p.paymentDate).toLocaleDateString("en-US")
                                        : "—";
                                    const canRecreate = isFailed(p.paymentStatus);
                                    const recreating = recreatingIds.has(p.transactionId);

                                    return (
                                        <tr
                                            key={p.transactionId}
                                            className="border-b hover:bg-gray-50 transition duration-150"
                                        >
                                            <td className="px-4 py-3 font-medium text-gray-800">
                                                {p.transactionId}
                                            </td>
                                            <td className="px-4 py-3 text-blue-700 font-semibold">
                                                {formatVND(p.amount)}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700 text-sm">
                                                {p.transactionContext}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700 text-sm">
                                                {p.transactionNote}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`px-3 py-1 text-sm font-medium rounded-full ${statusPill(
                                                        p.paymentStatus
                                                    )}`}
                                                >
                                                    {p.paymentStatus}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{formattedDate}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openDetail(p.transactionId)}
                                                        className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50"
                                                        title="View detail"
                                                    >
                                                        <i className="bi bi-eye me-1" /> View
                                                    </button>

                                                    {canRecreate && (
                                                        <button
                                                            onClick={() => handleRecreate(p.transactionId)}
                                                            disabled={recreating}
                                                            className="px-3 py-1.5 text-sm rounded-lg border text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-60"
                                                            title="Recreate transaction (failed)"
                                                        >
                                                            {recreating ? (
                                                                "Recreating…"
                                                            ) : (
                                                                <>
                                                                    <i className="bi bi-arrow-clockwise me-1" /> Recreate
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-3 text-xs text-gray-500">
                    Tip: The <b>Create</b> button above will bulk-generate invoices for transactions in
                    <b> Waiting</b> status. To change the criteria, adjust <code>eligible</code> inside{" "}
                    <code>handleCreateAllInvoices</code>.
                </div>
            </div>

            {/* ============ DETAIL MODAL ============ */}
            {showDetail && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={() => !detailLoading && setShowDetail(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-5 border-b flex items-center justify-between">
                            <h3 className="text-xl font-semibold">
                                Transaction Detail
                                {selectedTxId ? (
                                    <span className="text-gray-500 font-normal text-sm">
                                        {" "}
                                        • {selectedTxId}
                                    </span>
                                ) : null}
                            </h3>
                            <button
                                className="p-2 rounded-lg hover:bg-gray-100"
                                onClick={() => !detailLoading && setShowDetail(false)}
                            >
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>

                        {detailLoading ? (
                            <div className="p-8 flex items-center justify-center text-gray-600">
                                <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
                                Loading details…
                            </div>
                        ) : detailError ? (
                            <div className="p-6 text-red-600">{detailError}</div>
                        ) : detail ? (
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <KV label="Transaction ID" value={detail.transactionId} />
                                    <KV
                                        label="Status"
                                        value={
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${statusPill(
                                                    detail.status
                                                )}`}
                                            >
                                                {detail.status}
                                            </span>
                                        }
                                    />
                                    <KV label="Type" value={detail.transactionType} />
                                    <KV label="Subscription ID" value={detail.subscriptionId} />
                                    <KV label="Driver Name" value={detail.driverName} />
                                    <KV label="Driver ID" value={detail.driverId} />
                                    <KV label="Plan" value={detail.planName} />
                                    <KV label="Bookings" value={detail.numberOfBooking} />
                                    <KV label="Total Fee" value={formatVND(detail.totalFee)} />
                                    <KV label="Total Amount" value={formatVND(detail.totalAmount)} />
                                </div>

                                <div className="pt-2 flex justify-end gap-2">
                                    <button
                                        className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                                        onClick={() => setShowDetail(false)}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 text-gray-500">No detail data.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function KV({ label, value }) {
    return (
        <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">{label}</div>
            <div className="font-semibold text-gray-900">
                {value ?? <span className="text-gray-400">—</span>}
            </div>
        </div>
    );
}
