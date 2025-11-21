// src/layouts/StaffLayout.jsx
import React, { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import "bootstrap-icons/font/bootstrap-icons.css";

// Map route -> nhãn + icon Bootstrap
// Lưu ý: KHÔNG để "bi " trong data vì bên dưới đã prepend "bi ".
const sections = [
    { to: "/staff/overview", label: "Overview", icon: "bi-house" },
    { to: "/staff/inventory", label: "Inventory", icon: "bi-box" },
    { to: "/staff/assist", label: "Manual Assist", icon: "bi-tools" },
    { to: "/staff/swap", label: "Battery Swap", icon: "bi-battery-full" },
    { to: "/staff/booking", label: "Booking", icon: "bi-calendar-check" },
    { to: "/staff/admin-request", label: "Admin Request", icon: "bi-file-earmark-text" },
    { to: "/staff/support", label: "Customer Support", icon: "bi-chat-dots" },
    { to: "/staff/battery-mgmt", label: "Battery Manager", icon: "bi-battery-charging" },
];

/* Small, accessible confirm dialog */
function ConfirmDialog({ open, title, message, onCancel, onConfirm }) {
    const cancelRef = useRef(null);

    useEffect(() => {
        if (open) cancelRef.current?.focus();
    }, [open]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[100]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dlg-title"
            aria-describedby="dlg-desc"
            onKeyDown={(e) => e.key === "Escape" && onCancel()}
        >
            <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
            <div className="absolute inset-x-0 top-[20%] mx-auto max-w-md rounded-2xl border bg-white shadow-xl">
                <div className="px-5 py-4 border-b font-semibold" id="dlg-title">
                    {title}
                </div>
                <div className="p-5 text-sm text-slate-600" id="dlg-desc">
                    {message}
                </div>
                <div className="px-5 py-4 border-t flex justify-end gap-2">
                    <button
                        type="button"
                        className="px-3 py-2 rounded-lg border text-sm"
                        ref={cancelRef}
                        onClick={onCancel}
                    >
                        cancel
                    </button>
                    <button
                        type="button"
                        className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm flex items-center"
                        onClick={onConfirm}
                    >
                        <i className="bi bi-box-arrow-right mr-2" aria-hidden="true" />
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function StaffLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [confirmOpen, setConfirmOpen] = useState(false);

    // Lấy info staff từ localStorage (tùy BE bạn set key gì)
    const [staffName] = useState(
        () =>
            localStorage.getItem("StaffName") ||
            localStorage.getItem("fullName") ||
            localStorage.getItem("userName") ||
            "Staff member"
    );
    const [staffEmail] = useState(
        () =>
            localStorage.getItem("StaffEmail") ||
            localStorage.getItem("email") ||
            ""
    );

    const doSignOut = () => {
        const CLEAR_KEYS = [
            "accessToken",
            "role",
            "userId",
            "UserId",
            "staffId",
            "StaffId",
            "stationId",
            "StationId",
        ];
        CLEAR_KEYS.forEach((k) => localStorage.removeItem(k));
        setConfirmOpen(false);
        navigate("/", { replace: true }); // về Home.jsx
    };

    const initials = makeInitials(staffName);

    return (
        // Layout FULL SCREEN, sidebar cố định, content scroll
        <div
            className="staff-shell"
            style={{
                display: "flex",
                height: "100vh", // chiếm đúng viewport
                overflow: "hidden", // chặn scroll toàn trang
                backgroundColor: "#f5f5fb",
            }}
        >
            {/* Sidebar trái (cố định) */}
            <aside
                className="sidebar"
                style={{
                    width: 240,
                    flexShrink: 0,
                    backgroundColor: "#2f66ff",
                    color: "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                    padding: "16px 12px",
                }}
            >
                {/* Brand */}
                <div
                    className="brand-tile"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 24,
                    }}
                >
                    <div
                        className="brand-badge"
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            backgroundColor: "#2f66ff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <i
                            className="bi bi-lightning-charge-fill"
                            style={{ fontSize: 22, color: "#ffd94a" }}
                            aria-hidden="true"
                        />
                        <span className="sr-only">EVSwap</span>
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, lineHeight: 1 }}>EVSwap</div>
                        <div
                            style={{
                                fontSize: 12,
                                opacity: 0.85,
                            }}
                        >
                            Staff Portal
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="nav-list" style={{ flex: 1 }}>
                    {sections.map((s) => (
                        <NavLink
                            key={s.to}
                            to={s.to}
                            title={s.label}
                            className={({ isActive }) =>
                                `nav-item ${isActive ? "active" : ""}`
                            }
                            style={({ isActive }) => ({
                                display: "flex",
                                alignItems: "center",
                                padding: "10px 12px",
                                marginBottom: 6,
                                borderRadius: 12,
                                fontSize: 14,
                                fontWeight: 500,
                                color: isActive ? "#2f66ff" : "#ffffff",
                                backgroundColor: isActive ? "#ffffff" : "transparent",
                                textDecoration: "none",
                                gap: 10,
                                transition: "all 0.18s ease",
                            })}
                        >
                            <i
                                className={`bi ${s.icon}`}
                                aria-hidden="true"
                                style={{ fontSize: 18 }}
                            />
                            <span>{s.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Staff mini profile (click -> /staff/account) */}
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate("/staff/account")}
                    onKeyDown={(e) => e.key === "Enter" && navigate("/staff/account")}
                    style={{
                        marginTop: 8,
                        marginBottom: 10,
                        padding: "10px 12px",
                        borderRadius: 16,
                        background:
                            "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(56,189,248,0.20))",
                        border: "1px solid rgba(191,219,254,0.8)",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        cursor: "pointer",
                        boxShadow: "0 8px 20px rgba(15,23,42,0.25)",
                    }}
                >
                    <div
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: "999px",
                            background:
                                "linear-gradient(135deg, #22c55e, #16a3ff 60%, #3b82f6)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#ffffff",
                            fontWeight: 700,
                            fontSize: 16,
                        }}
                    >
                        {initials}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                            fontSize: 11,
                        }}
                    >
                        <span style={{ opacity: 0.8 }}>Logged in as</span>
                        <span
                            style={{
                                fontSize: 13,
                                fontWeight: 600,
                                lineHeight: 1.2,
                            }}
                        >
                            {staffName}
                        </span>
                        {staffEmail && (
                            <span
                                style={{
                                    opacity: 0.75,
                                    fontSize: 11,
                                }}
                            >
                                {staffEmail}
                            </span>
                        )}
                        <span
                            style={{
                                marginTop: 3,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 2,
                                color: "#e0f2fe",
                            }}
                        >
                            <span>View profile</span>
                            <i className="bi bi-arrow-right-short" aria-hidden="true" />
                        </span>
                    </div>
                </div>

                {/* Nút Sign out */}
                <button
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    title="Đăng xuất"
                    className="mt-4 w-full"
                    style={{
                        marginTop: 4,
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 14,
                        backgroundColor: "#ffffff",
                        color: "#000000",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "none",
                        cursor: "pointer",
                        boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                        gap: 8,
                    }}
                >
                    <i className="bi bi-box-arrow-right" aria-hidden="true" />
                    <span>Sign out</span>
                </button>
            </aside>

            {/* Content phải: chỉ phần này scroll */}
            <main
                className="staff-content"
                style={{
                    flex: 1,
                    padding: "24px 32px",
                    overflowY: "auto",
                    overflowX: "hidden",
                }}
            >
                <AnimatePresence mode="wait">
                    <PageTransition key={location.pathname}>
                        <Outlet />
                    </PageTransition>
                </AnimatePresence>
            </main>

            {/* Confirm before leaving */}
            <ConfirmDialog
                open={confirmOpen}
                title="Log Out?"
                message="Are you sure you want to log out from the staff portal?"
                onCancel={() => setConfirmOpen(false)}
                onConfirm={doSignOut}
            />
        </div>
    );
}

// Lấy chữ cái đầu để bỏ vào avatar
function makeInitials(name) {
    if (!name) return "S";
    const parts = String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (!parts.length) return "S";
    if (parts.length === 1) return parts[0][0].toUpperCase();
    const last = parts[parts.length - 1][0];
    const first = parts[0][0];
    return `${first}${last}`.toUpperCase();
}
