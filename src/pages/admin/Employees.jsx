/* eslint-disable no-unused-vars */
// src/pages/admin/StaffManagement.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import api from "@/api/api";

const roleBadge = (role) => {
    const r = String(role || "").toLowerCase();
    if (r.includes("admin")) return "bg-purple-100 text-purple-800";
    if (r.includes("manager")) return "bg-amber-100 text-amber-800";
    if (r.includes("staff") || r.includes("operator")) return "bg-blue-100 text-blue-800";
    if (r.includes("technician")) return "bg-teal-100 text-teal-800";
    return "bg-gray-100 text-gray-800";
};
const statusBadge = (status) =>
    String(status || "").toLowerCase() === "active"
        ? "bg-green-100 text-green-800"
        : "bg-red-100 text-red-800";

export default function StaffManagement() {
    const [staffs, setStaffs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    // filters
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [roleFilter, setRoleFilter] = useState("all");
    const [stationFilter, setStationFilter] = useState("all");
    const [showFilters, setShowFilters] = useState(false);

    const [selectedStaff, setSelectedStaff] = useState(null);

    // ===== Create Staff Modal state =====
    const [createOpen, setCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [stations, setStations] = useState([]);
    const [loadingStations, setLoadingStations] = useState(false);
    const [createForm, setCreateForm] = useState({
        staffName: "",
        staffEmail: "",
        staffTele: "",
        staffAddress: "",
        staffStatus: "Active",
        stationId: "",
        shiftStart: "08:00",
        shiftEnd: "17:00",
    });


    const extractValidationErrors = (data) => {
        if (data?.errors && typeof data.errors === "object") {
            const parts = [];
            Object.entries(data.errors).forEach(([field, messages]) => {
                if (Array.isArray(messages)) {
                    messages.forEach((m) => {
                        parts.push(`${field}: ${m}`);
                    });
                } else if (messages) {
                    parts.push(`${field}: ${String(messages)}`);
                }
            });
            if (parts.length) {
                return parts.join("\n");
            }
        }

        // fallback
        if (data?.message) return data.message;
        if (data?.title) return data.title;
        return "";
    };

    // ===== UPDATE STAFF modal state =====
    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        staffId: "",
        staffName: "",
        staffEmail: "",
        staffTele: "",
        staffAddress: "",
        staffStatus: "Active",
        stationId: "",
        shiftStart: "08:00",
        shiftEnd: "17:00",
    });

    const toHHMMSS = (t) => (t && t.length === 5 ? `${t}:00` : t || "00:00:00");
    const isValidEmail = (s = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

    // ===== Load staff list =====
    const loadStaffs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await api.get("/User/staff-list", {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

            const arr = res?.data?.data ?? [];
            const mapped = arr.map((x) => ({
                staffId: x.staffId ?? x.userId ?? x.employeeId ?? x.id,
                userId: x.userId ?? x.staffId ?? x.employeeId ?? x.id, // dùng để delete & detail
                name: x.staffName ?? x.fullName ?? x.employeeName ?? x.name,
                email: x.staffEmail ?? x.email,
                phone: x.staffPhone ?? x.phone ?? x.telephone,
                role: x.role ?? x.position ?? "Staff",
                stationName: x.stationName ?? x.station?.name ?? x.stationId ?? "—",
                status: x.staffStatus ?? x.status ?? "Active",
                shifts: x.totalShifts ?? x.shifts ?? 0,
            }));
            setStaffs(mapped);
        } catch (err) {
            console.error("staff-list error", err?.response?.data || err);
            alert("❌ Failed to load staff list.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStaffs();
    }, []);

    // ===== Load stations (dùng cho create & edit) =====
    const loadStations = async () => {
        setLoadingStations(true);
        try {
            const token = localStorage.getItem("token");
            const res = await api.get("Station/station-list", {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            const list = Array.isArray(res?.data?.data) ? res.data.data : [];
            const mapped = list.map((s, i) => ({
                stationId: s.stationId ?? s.id ?? s.code ?? `STA-${i + 1}`,
                stationName: s.stationName ?? s.name ?? s.label ?? `Station ${i + 1}`,
            }));
            setStations(mapped);
            if (!createForm.stationId && mapped.length) {
                setCreateForm((f) => ({ ...f, stationId: mapped[0].stationId }));
            }
        } catch (e) {
            console.error("station-list error", e?.response?.data || e);
            setStations([]);
        } finally {
            setLoadingStations(false);
        }
    };

    useEffect(() => {
        if (createOpen) loadStations();
    }, [createOpen]);

    // có danh sách trạm khi mở edit
    useEffect(() => {
        if (editOpen && !stations.length) loadStations();
    }, [editOpen]);

    // ===== Load staff detail (ONLY pass UserId) =====
    const openDetail = async (row) => {
        setLoadingDetail(true);
        try {
            const token = localStorage.getItem("token");
            const res = await api.get("User/staff-information", {
                params: { UserId: row.userId },
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

            const d = res?.data?.data;
            if (!d) throw new Error("No data");

            const detail = {
                staffId: d.staffId,
                name: d.staffName,
                email: d.staffEmail,
                phone: d.staffTele,
                address: d.staffAddress,
                status: d.staffStatus,
                stationId: d.stationStaff?.stationId || "—",
                shiftStart: d.stationStaff?.shiftStart || "—",
                shiftEnd: d.stationStaff?.shiftEnd || "—",
                role: d.role ?? row.role ?? "Staff",
                registrationDate: d.registation ?? d.createdAt ?? "—",
                certifications: d.certifications ?? [],
                shiftHistory: Array.isArray(d.shiftHistory) ? d.shiftHistory : [],
            };

            setSelectedStaff(detail);
        } catch (err) {
            console.error("staff-information error", err?.response?.data || err);
            alert("❌ Can't load staff detail.");
        } finally {
            setLoadingDetail(false);
        }
    };

    // --- DELETE staff (POST /api/User/delete-user { userId }) + confirm modal + toast ---
    const deleteStaff = async (row) => {
        const userId = row.userId ?? row.staffId;
        if (!userId) {
            window.toast.error("User ID not found. Unable to delete.");
            return;
        }

        // English confirmation modal (simple, modern)
        const { ok } = await window.confirmModal({
            title: "Are you sure?",
            message: `This action will permanently delete ${row.name} (${userId}).`,
            confirmText: "Delete",
            cancelText: "Cancel",
            variant: "danger",
        });
        if (!ok) return;

        setDeletingId(row.staffId);
        try {
            const token = localStorage.getItem("token");
            await api.post(
                "/User/delete-user",
                { userId },
                { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
            );

            // Update UI after deletion
            setStaffs((prev) => prev.filter((s) => s.staffId !== row.staffId));
            if (selectedStaff?.staffId === row.staffId) setSelectedStaff(null);

            window.toast.success("Staff deleted successfully.");
        } catch (err) {
            console.error("delete-user error:", err?.response?.data || err);
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.title ||
                err?.message ||
                "Failed to delete staff. Please try again.";
            window.toast.error(msg);
        } finally {
            setDeletingId(null);
        }
    };

    // ===== Create staff submit =====
    const onCreateStaff = async (e) => {
        e.preventDefault();
        if (!createForm.staffName.trim()) return alert("Please enter staff name.");
        if (!createForm.staffEmail.trim()) return alert("Please enter staff email.");
        if (!createForm.stationId) return alert("Please choose station.");
        if (!isValidEmail(createForm.staffEmail)) return alert("Wrong email format.");

        const payload = {
            staffName: createForm.staffName.trim(),
            staffEmail: createForm.staffEmail.trim(),
            staffTele: createForm.staffTele.trim(),
            staffAddress: createForm.staffAddress.trim(),
            staffStatus: createForm.staffStatus || "Active",
            stationStaff: {
                stationId: createForm.stationId,
                shiftStart: toHHMMSS(createForm.shiftStart),
                shiftEnd: toHHMMSS(createForm.shiftEnd),
            },
        };

        try {
            setCreating(true);
            const token = localStorage.getItem("token");
            await api.put("/User/create-staff", payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

            alert("✅ Create staff account successfully.");
            setCreateOpen(false);
            setCreateForm({
                staffName: "",
                staffEmail: "",
                staffTele: "",
                staffAddress: "",
                staffStatus: "Active",
                stationId: stations[0]?.stationId || "",
                shiftStart: "08:00",
                shiftEnd: "17:00",
            });
            loadStaffs();
        } catch (err) {
            console.error("create-staff error", err?.response?.data || err);
            const data = err?.response?.data;
            const msg =
                extractValidationErrors(data) ||
                (typeof data === "string" && data) ||
                err.message ||
                "Create staff failed.";
            alert(`❌ Create Failed.\n${msg}`);
        } finally {
            setCreating(false);
        }

    };

    // ===== OPEN EDIT (from row) =====
    const openEditFromRow = async (row) => {
        try {
            const token = localStorage.getItem("token");
            const res = await api.get("User/staff-information", {
                params: { UserId: row.userId ?? row.staffId },
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            const d = res?.data?.data || {};

            setEditForm({
                staffId: d.staffId ?? row.staffId,
                staffName: d.staffName ?? row.name ?? "",
                staffEmail: d.staffEmail ?? row.email ?? "",
                staffTele: d.staffTele ?? row.phone ?? "",
                staffAddress: d.staffAddress ?? "",
                staffStatus: d.staffStatus ?? row.status ?? "Active",
                stationId: d.stationStaff?.stationId || "",
                shiftStart: String(d.stationStaff?.shiftStart || "08:00").slice(0, 5),
                shiftEnd: String(d.stationStaff?.shiftEnd || "17:00").slice(0, 5),
            });
            setEditOpen(true);
        } catch (e) {
            console.error("openEditFromRow error:", e?.response?.data || e);
            alert("❌ Không lấy được thông tin nhân viên để sửa.");
        }
    };

    // ===== OPEN EDIT (from detail modal) =====
    const openEditFromDetail = () => {
        const d = selectedStaff;
        setEditForm({
            staffId: d.staffId,
            staffName: d.name || "",
            staffEmail: d.email || "",
            staffTele: d.phone || "",
            staffAddress: d.address || "",
            staffStatus: d.status || "Active",
            stationId: d.stationId || "",
            shiftStart: String(d.shiftStart || "08:00").slice(0, 5),
            shiftEnd: String(d.shiftEnd || "17:00").slice(0, 5),
        });
        setEditOpen(true);
    };

    // ===== SUBMIT UPDATE =====
    const submitUpdateStaff = async (e) => {
        e?.preventDefault?.();

        const payload = {
            staffId: editForm.staffId?.trim(),
            staffName: editForm.staffName?.trim(),
            staffEmail: editForm.staffEmail?.trim(),
            staffTele: editForm.staffTele?.trim(),
            staffAddress: editForm.staffAddress?.trim(),
            staffStatus: editForm.staffStatus || "Active",
            stationStaff: {
                stationId: editForm.stationId || "",
                shiftStart: toHHMMSS(editForm.shiftStart),
                shiftEnd: toHHMMSS(editForm.shiftEnd),
            },
        };

        if (!payload.staffId) return alert("Thiếu staffId.");
        if (!payload.staffName) return alert("Vui lòng nhập tên.");
        if (!payload.staffEmail || !isValidEmail(payload.staffEmail))
            return alert("Email không hợp lệ.");

        try {
            setSaving(true);
            const token = localStorage.getItem("token");
            await api.put("/User/update-staff-information", payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

            // cập nhật ngay bảng
            setStaffs((prev) =>
                prev.map((s) =>
                    s.staffId === payload.staffId
                        ? {
                            ...s,
                            name: payload.staffName,
                            email: payload.staffEmail,
                            status: payload.staffStatus,
                            stationName:
                                stations.find((x) => x.stationId === payload.stationStaff.stationId)
                                    ?.stationName ?? s.stationName,
                        }
                        : s
                )
            );

            // cập nhật modal chi tiết (nếu đang mở)
            setSelectedStaff((prev) =>
                prev && prev.staffId === payload.staffId
                    ? {
                        ...prev,
                        name: payload.staffName,
                        email: payload.staffEmail,
                        phone: payload.staffTele,
                        address: payload.staffAddress,
                        status: payload.staffStatus,
                        stationId: payload.stationStaff.stationId,
                        shiftStart: payload.stationStaff.shiftStart,
                        shiftEnd: payload.stationStaff.shiftEnd,
                    }
                    : prev
            );

            alert("✅ Update Successfully.");
            setEditOpen(false);
        } catch (err) {
            console.error("update-staff-information error:", err?.response?.data || err);
            const data = err?.response?.data;
            const msg =
                extractValidationErrors(data) ||
                (typeof data === "string" && data) ||
                err.message ||
                "Update Staff Failed.";
            alert(`❌ Update Staff Failed   .\n${msg}`);
        } finally {
            setSaving(false);
        }

    };

    // ===== Derived filters =====
    const roleOptions = useMemo(() => {
        const set = new Set(
            staffs.map((s) => String(s.role || "").trim()).filter((x) => x && x !== "—")
        );
        return Array.from(set);
    }, [staffs]);

    const stationOptions = useMemo(() => {
        const set = new Set(
            staffs.map((s) => String(s.stationName || "").trim()).filter((x) => x && x !== "—")
        );
        return Array.from(set);
    }, [staffs]);

    const filteredStaffs = useMemo(() => {
        const q = searchTerm.toLowerCase();
        return staffs.filter((s) => {
            const matchesSearch =
                String(s.name || "").toLowerCase().includes(q) ||
                String(s.email || "").toLowerCase().includes(q);
            const matchesStatus =
                statusFilter === "all" ||
                String(s.status || "").toLowerCase() === statusFilter;
            const matchesRole =
                roleFilter === "all" ||
                String(s.role || "").toLowerCase() === roleFilter.toLowerCase();
            const matchesStation =
                stationFilter === "all" ||
                String(s.stationName || "").toLowerCase() === stationFilter.toLowerCase();

            return matchesSearch && matchesStatus && matchesRole && matchesStation;
        });
    }, [staffs, searchTerm, statusFilter, roleFilter, stationFilter]);

    return (
        <PageTransition>
            <div className="p-8">
                {/* Header */}
                <motion.div
                    className="mb-8 flex flex-wrap gap-2 items-center justify-between"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Management</h1>
                        <p className="text-gray-600">Search, filter and manage station staff accounts.</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCreateOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800"
                        >
                            <i className="bi bi-person-plus" />
                            Create Staff
                        </button>
                        <button
                            onClick={loadStaffs}
                            disabled={loading}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${loading ? "text-gray-400" : "hover:bg-gray-50"
                                }`}
                        >
                            <i className="bi bi-arrow-clockwise" />
                            Refresh
                        </button>
                    </div>
                </motion.div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <div className="flex gap-4 items-center">
                        <div className="flex-1 relative">
                            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search staff by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters((s) => !s)}
                            className="flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg"
                        >
                            <i className="bi bi-funnel" /> Filters
                        </button>
                    </div>

                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="mt-4 pt-4 border-t border-gray-200 grid md:grid-cols-4 sm:grid-cols-2 gap-4"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Status
                                    </label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="all">All</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Role
                                    </label>
                                    <select
                                        value={roleFilter}
                                        onChange={(e) => setRoleFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="all">All</option>
                                        {roleOptions.map((r) => (
                                            <option key={r} value={r}>
                                                {r}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Station
                                    </label>
                                    <select
                                        value={stationFilter}
                                        onChange={(e) => setStationFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="all">All</option>
                                        {stationOptions.map((s) => (
                                            <option key={s} value={s}>
                                                {s}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Table */}
                <motion.div
                    className="bg-white rounded-xl shadow-lg overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {loading ? (
                        <div className="flex flex-col items-center py-16 text-gray-600">
                            <div className="animate-spin h-10 w-10 border-4 border-gray-900 border-t-transparent rounded-full mb-3" />
                            <p>Loading staff…</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                            Staff
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                            Role
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                            Station
                                        </th>
                                        {/* Removed Shifts column */}
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-200">
                                    {filteredStaffs.map((s) => (
                                        <tr key={s.staffId} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{s.name}</div>
                                                <div className="text-sm text-gray-500">{s.email}</div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge(
                                                        s.role
                                                    )}`}
                                                >
                                                    {s.role}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 text-gray-900">{s.stationName}</td>

                                            {/* Removed Shifts cell */}

                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusBadge(
                                                        s.status
                                                    )}`}
                                                >
                                                    {s.status}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openDetail(s)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                        title="View Details"
                                                    >
                                                        <i className="bi bi-eye" />
                                                    </button>

                                                    <button
                                                        onClick={() => openEditFromRow(s)}
                                                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"
                                                        title="Edit staff"
                                                    >
                                                        <i className="bi bi-pencil-square" />
                                                    </button>

                                                    <button
                                                        onClick={() => deleteStaff(s)}
                                                        className={`p-2 rounded-lg ${deletingId === s.staffId
                                                            ? "text-gray-400 cursor-not-allowed"
                                                            : "text-red-600 hover:bg-red-50"
                                                            }`}
                                                        disabled={deletingId === s.staffId}
                                                        title="Delete staff"
                                                    >
                                                        {deletingId === s.staffId ? (
                                                            <i className="bi bi-hourglass-split" />
                                                        ) : (
                                                            <i className="bi bi-trash" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>

                {/* Detail Modal */}
                <AnimatePresence>
                    {selectedStaff && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                            >
                                <div className="p-6 border-b flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-gray-900">Staff Details</h2>
                                    <div className="flex items-center gap-2">
                                        {/* NEW: Edit from detail */}
                                        <button
                                            onClick={openEditFromDetail}
                                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"
                                            title="Edit staff"
                                        >
                                            <i className="bi bi-pencil-square" />
                                        </button>

                                        <button
                                            onClick={() =>
                                                deleteStaff({
                                                    staffId: selectedStaff.staffId,
                                                    userId:
                                                        staffs.find((x) => x.staffId === selectedStaff.staffId)?.userId ??
                                                        selectedStaff.staffId,
                                                    name: selectedStaff.name,
                                                })
                                            }
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                            title="Delete staff"
                                        >
                                            <i className="bi bi-trash" />
                                        </button>
                                        <button
                                            onClick={() => setSelectedStaff(null)}
                                            className="p-2 hover:bg-gray-100 rounded-lg"
                                        >
                                            <i className="bi bi-x-lg" />
                                        </button>
                                    </div>
                                </div>

                                {loadingDetail ? (
                                    <div className="flex justify-center py-10 text-gray-500">
                                        Loading details…
                                    </div>
                                ) : (
                                    <div className="p-6 space-y-6">
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                                <h3 className="text-lg font-semibold mb-3">Personal Info</h3>
                                                <InfoRow icon="bi-person" title="Full Name" value={selectedStaff.name} />
                                                <InfoRow icon="bi-envelope" title="Email" value={selectedStaff.email} />
                                                <InfoRow icon="bi-telephone" title="Phone" value={selectedStaff.phone || "—"} />
                                                <InfoRow icon="bi-geo-alt" title="Address" value={selectedStaff.address || "—"} />
                                                <InfoRow icon="bi-card-checklist" title="Role" value={selectedStaff.role} />
                                                <InfoRow icon="bi-calendar" title="Registration" value={selectedStaff.registrationDate || "—"} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold mb-3">Work / Station</h3>
                                                <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between mb-3">
                                                    <span className="text-gray-600">Current status</span>
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge(
                                                            selectedStaff.status
                                                        )}`}
                                                    >
                                                        {selectedStaff.status}
                                                    </span>
                                                </div>
                                                <InfoRow icon="bi-building" title="Station ID" value={selectedStaff.stationId} />
                                                <InfoRow icon="bi-clock" title="Shift Start" value={selectedStaff.shiftStart} />
                                                <InfoRow icon="bi-clock-history" title="Shift End" value={selectedStaff.shiftEnd} />

                                                {!!selectedStaff.certifications?.length && (
                                                    <div className="mt-4">
                                                        <div className="text-gray-600 mb-2">Certifications</div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {selectedStaff.certifications.map((c, i) => (
                                                                <span
                                                                    key={i}
                                                                    className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
                                                                >
                                                                    {c}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {!!selectedStaff.shiftHistory?.length && (
                                            <div>
                                                <h3 className="text-lg font-semibold mb-3 flex items-center">
                                                    <i className="bi bi-clock-history mr-2" /> Recent Shifts
                                                </h3>
                                                <div className="overflow-x-auto border rounded-lg">
                                                    <table className="min-w-full text-sm">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th className="p-2 text-left">Date</th>
                                                                <th className="p-2 text-left">Station</th>
                                                                <th className="p-2 text-left">Role</th>
                                                                <th className="p-2 text-left">Notes</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selectedStaff.shiftHistory.map((sh, idx) => (
                                                                <tr key={idx} className="border-t">
                                                                    <td className="p-2">{sh.date || "—"}</td>
                                                                    <td className="p-2">{sh.stationName || selectedStaff.stationId || "—"}</td>
                                                                    <td className="p-2">{sh.role || selectedStaff.role || "—"}</td>
                                                                    <td className="p-2">{sh.note || "—"}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ===== Create Staff Modal ===== */}
                <AnimatePresence>
                    {createOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        >
                            <motion.div
                                initial={{ y: 16, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 16, opacity: 0 }}
                                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl"
                            >
                                <div className="p-6 border-b flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Create Staff</h3>
                                    <button className="p-2 hover:bg-gray-100 rounded-lg" onClick={() => setCreateOpen(false)}>
                                        <i className="bi bi-x-lg" />
                                    </button>
                                </div>

                                <form className="p-6 grid md:grid-cols-2 gap-4" onSubmit={onCreateStaff}>
                                    <div className="md:col-span-2 grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-gray-700 mb-1">Full name</label>
                                            <input
                                                className="w-full border rounded-lg px-3 py-2"
                                                value={createForm.staffName}
                                                onChange={(e) => setCreateForm((f) => ({ ...f, staffName: e.target.value }))}
                                                placeholder="Nguyễn Văn A"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-700 mb-1">Email</label>
                                            <input
                                                type="email"
                                                className="w-full border rounded-lg px-3 py-2"
                                                value={createForm.staffEmail}
                                                onChange={(e) => setCreateForm((f) => ({ ...f, staffEmail: e.target.value }))}
                                                placeholder="name@example.com"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Telephone</label>
                                        <input
                                            className="w-full border rounded-lg px-3 py-2"
                                            value={createForm.staffTele}
                                            onChange={(e) => setCreateForm((f) => ({ ...f, staffTele: e.target.value }))}
                                            placeholder="09xx xxx xxx"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Status</label>
                                        <select
                                            className="w-full border rounded-lg px-3 py-2"
                                            value={createForm.staffStatus}
                                            onChange={(e) => setCreateForm((f) => ({ ...f, staffStatus: e.target.value }))}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm text-gray-700 mb-1">Address</label>
                                        <input
                                            className="w-full border rounded-lg px-3 py-2"
                                            value={createForm.staffAddress}
                                            onChange={(e) => setCreateForm((f) => ({ ...f, staffAddress: e.target.value }))}
                                            placeholder="123 Street, Ward, District, City"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Station</label>
                                        <select
                                            className="w-full border rounded-lg px-3 py-2"
                                            value={createForm.stationId}
                                            onChange={(e) => setCreateForm((f) => ({ ...f, stationId: e.target.value }))}
                                            required
                                        >
                                            {loadingStations ? (
                                                <option>Loading...</option>
                                            ) : stations.length ? (
                                                stations.map((s) => (
                                                    <option key={s.stationId} value={s.stationId}>
                                                        {s.stationName} ({s.stationId})
                                                    </option>
                                                ))
                                            ) : (
                                                <option value="">No stations</option>
                                            )}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-gray-700 mb-1">Shift start</label>
                                            <input
                                                type="time"
                                                className="w-full border rounded-lg px-3 py-2"
                                                value={createForm.shiftStart}
                                                onChange={(e) => setCreateForm((f) => ({ ...f, shiftStart: e.target.value }))}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-700 mb-1">Shift end</label>
                                            <input
                                                type="time"
                                                className="w-full border rounded-lg px-3 py-2"
                                                value={createForm.shiftEnd}
                                                onChange={(e) => setCreateForm((f) => ({ ...f, shiftEnd: e.target.value }))}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                                        <button
                                            type="button"
                                            className="px-4 py-2 border rounded-lg"
                                            onClick={() => setCreateOpen(false)}
                                            disabled={creating}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-60"
                                            disabled={creating}
                                        >
                                            {creating ? "Creating..." : "Create"}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ===== UPDATE STAFF MODAL ===== */}
                <AnimatePresence>
                    {editOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        >
                            <motion.div
                                initial={{ y: 16, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 16, opacity: 0 }}
                                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl"
                            >
                                <div className="p-6 border-b flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Update Staff</h3>
                                    <button className="p-2 hover:bg-gray-100 rounded-lg" onClick={() => setEditOpen(false)}>
                                        <i className="bi bi-x-lg" />
                                    </button>
                                </div>

                                <form className="p-6 grid md:grid-cols-2 gap-4" onSubmit={submitUpdateStaff}>
                                    <div className="md:col-span-2 grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-gray-700 mb-1">Staff ID</label>
                                            <input className="w-full border rounded-lg px-3 py-2 bg-gray-100" value={editForm.staffId} readOnly />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-700 mb-1">Full name</label>
                                            <input
                                                className="w-full border rounded-lg px-3 py-2"
                                                value={editForm.staffName}
                                                onChange={(e) => setEditForm((f) => ({ ...f, staffName: e.target.value }))}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            className="w-full border rounded-lg px-3 py-2"
                                            value={editForm.staffEmail}
                                            onChange={(e) => setEditForm((f) => ({ ...f, staffEmail: e.target.value }))}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Telephone</label>
                                        <input
                                            className="w-full border rounded-lg px-3 py-2"
                                            value={editForm.staffTele}
                                            onChange={(e) => setEditForm((f) => ({ ...f, staffTele: e.target.value }))}
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm text-gray-700 mb-1">Address</label>
                                        <input
                                            className="w-full border rounded-lg px-3 py-2"
                                            value={editForm.staffAddress}
                                            onChange={(e) => setEditForm((f) => ({ ...f, staffAddress: e.target.value }))}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Status</label>
                                        <select
                                            className="w-full border rounded-lg px-3 py-2"
                                            value={editForm.staffStatus}
                                            onChange={(e) => setEditForm((f) => ({ ...f, staffStatus: e.target.value }))}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-700 mb-1">Station</label>
                                        <select
                                            className="w-full border rounded-lg px-3 py-2"
                                            value={editForm.stationId}
                                            onChange={(e) => setEditForm((f) => ({ ...f, stationId: e.target.value }))}
                                            required
                                        >
                                            {loadingStations ? (
                                                <option>Loading...</option>
                                            ) : stations.length ? (
                                                stations.map((s) => (
                                                    <option key={s.stationId} value={s.stationId}>
                                                        {s.stationName} ({s.stationId})
                                                    </option>
                                                ))
                                            ) : (
                                                <option value="">No stations</option>
                                            )}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-gray-700 mb-1">Shift start</label>
                                            <input
                                                type="time"
                                                className="w-full border rounded-lg px-3 py-2"
                                                value={editForm.shiftStart}
                                                onChange={(e) => setEditForm((f) => ({ ...f, shiftStart: e.target.value }))}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-700 mb-1">Shift end</label>
                                            <input
                                                type="time"
                                                className="w-full border rounded-lg px-3 py-2"
                                                value={editForm.shiftEnd}
                                                onChange={(e) => setEditForm((f) => ({ ...f, shiftEnd: e.target.value }))}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                                        <button
                                            type="button"
                                            className="px-4 py-2 border rounded-lg"
                                            onClick={() => setEditOpen(false)}
                                            disabled={saving}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-60"
                                            disabled={saving}
                                        >
                                            {saving ? "Saving..." : "Save changes"}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </PageTransition>
    );
}

function InfoRow({ icon, title, value }) {
    return (
        <div className="flex items-center space-x-3 mb-2">
            <i className={`bi ${icon} text-gray-400`} />
            <div>
                <div className="font-medium text-gray-900">{value}</div>
                <div className="text-sm text-gray-500">{title}</div>
            </div>
        </div>
    );
}