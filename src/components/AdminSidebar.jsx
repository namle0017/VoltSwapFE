// src/components/AdminSidebar.jsx
import { NavLink } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

// Đảm bảo bạn đã import CSS của Bootstrap Icons ở entry (main.jsx/App.jsx):
// import "bootstrap-icons/font/bootstrap-icons.css";

const menu = [
    { name: "Overview", path: "/admin", icon: "bi bi-bar-chart-line-fill", end: true },
    { name: "Customers", path: "/admin/customers", icon: "bi bi-people-fill" },
    { name: "Complaints", path: "/admin/complaints", icon: "bi bi-chat-left-text-fill" },
    { name: "Reports", path: "/admin/reports", icon: "bi bi-file-earmark-bar-graph" },
    { name: "Staff", path: "/admin/employees", icon: "bi bi-person-gear" },
    { name: "Stations", path: "/admin/stations", icon: "bi bi-fuel-pump-fill" },
    { name: "Subscriptions", path: "/admin/subscriptions", icon: "bi bi-box-seam" },
    { name: "Payments", path: "/admin/payments", icon: "bi bi-credit-card-2-front-fill" },
];

export default function AdminSidebar({ onSignOut }) {
    return (
        <motion.aside
            className="w-64 bg-white shadow-lg h-full fixed z-10"
            initial={{ x: -250 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                    <div className="text-3xl font-lobster font-bold bg-gradient-to-r from-green-400 via-blue-400 to-blue-600 bg-clip-text text-transparent drop-shadow-md">
                        EV Admin
                    </div>
                </div>
            </div>

            <nav className="mt-6 space-y-1">
                {menu.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        className={({ isActive }) =>
                            `mx-3 flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 ${isActive ? "bg-blue-500 text-white" : "text-gray-700 hover:bg-gray-100"
                            }`
                        }
                    >
                        {/* Render icon đúng chuẩn Bootstrap Icons */}
                        <i className={`${item.icon} text-base`} aria-hidden="true" />
                        <span>{item.name}</span>
                    </NavLink>
                ))}

                <motion.button
                    onClick={onSignOut}
                    className="w-[88%] flex items-center justify-center gap-2 text-white bg-red-500 hover:bg-red-600 transition-colors duration-200 mt-4 mx-auto py-2 rounded-lg"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <i className="bi bi-box-arrow-right" aria-hidden="true" />
                    <span>Sign Out</span>
                </motion.button>
            </nav>
        </motion.aside>
    );
}
