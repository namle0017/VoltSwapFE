// src/layouts/AdminLayout.jsx
import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";

export default function AdminLayout() {
    const handleSignOut = () => {
        localStorage.removeItem("token");
        window.location.href = "/";
    };

    return (
        <div className="flex h-screen bg-gray-50">
            <AdminSidebar onSignOut={handleSignOut} />
            <main className="ml-64 flex-1 overflow-y-auto p-6">
                <Outlet />
            </main>
        </div>
    );
}
