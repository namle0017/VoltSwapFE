import { Navigate, Outlet } from "react-router-dom";
import parseJwt from "../utils/parseJwt";

export default function ProtectedRoute({ requiredRole }) {
    const token = localStorage.getItem("token");
    if (!token) return <Navigate to="/" replace />;

    const payload = parseJwt(token);
    const roles = Array.isArray(payload?.roles)
        ? payload.roles
        : [payload?.role].filter(Boolean);

    if (requiredRole && !roles.includes(requiredRole)) {
        return <Navigate to="/" replace />;
    }
    return <Outlet />;
}
