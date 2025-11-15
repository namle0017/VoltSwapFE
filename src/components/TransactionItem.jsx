import React from "react";
import { useNavigate } from "react-router-dom";

export default function TransactionItem({ t }) {
    const navigate = useNavigate();

    return (
        <div className="border border-gray-200 p-4 rounded-xl mb-3 flex justify-between items-center bg-white shadow-sm">
            <div>
                <h4 className="font-semibold">{t.title}</h4>
                <p className="text-gray-500 text-sm">{t.date}</p>
            </div>

            <div className="text-right">
                <div className="font-bold">{t.amount.toLocaleString()}₫</div>
                <div className="mt-2">
                    <span
                        className={`px-2 py-1 rounded-full text-sm ${t.status === "Pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                            }`}
                    >
                        {t.status}
                    </span>
                </div>

                {t.status === "Pending" && (
                    <button
                        onClick={() => navigate(`/payment/${t.id}`)}
                        className="mt-3 bg-blue-600 text-white text-sm px-3 py-1 rounded-md hover:bg-blue-700 transition"
                    >
                        Thanh toán
                    </button>
                )}
            </div>
        </div>
    );
}
