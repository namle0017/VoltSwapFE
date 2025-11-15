import React from "react";
import { NavLink } from "react-router-dom";

export default function SubNavbar() {
    const base =
        "px-5 py-2 rounded-full mx-1 text-sm font-medium transition-all duration-200";
    const active = "bg-white text-black shadow-sm";
    const inactive = "bg-transparent text-gray-800 hover:bg-gray-100";

    return (
        <div className="bg-gray-100 border-b py-3 flex justify-center">
            <NavLink
                to="/user/service"
                className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
            >
                Service
            </NavLink>
            <NavLink
                to="/user/vehicle"
                className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
            >
                Vehicle
            </NavLink>
            <NavLink
                to="/user/station"
                className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
            >
                Station
            </NavLink>
            <NavLink
                to="/user/transaction"
                className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
            >
                Transaction
            </NavLink>
            <NavLink
                to="/user/support"
                className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
            >
                Support
            </NavLink>
        </div>
    );
}
