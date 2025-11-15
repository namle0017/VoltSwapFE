// src/pages/ComplaintsManagement.jsx
import { useEffect, useMemo, useState } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { fetchComplaints, fetchStaffList, assignStaff } from "@/api/complaintsApi";
import api from "@/api/api";

const STATUS = {
  OPEN: "Open",
  ASSIGNED: "Assigned",
  RESOLVED: "Resolved",
};

// tạo id ổn định & duy nhất nếu thiếu reportId
function makeComplaintId(r, idx) {
  const rid = r?.reportId ?? r?.id ?? r?.reportCode ?? null;
  if (rid) return `CMP-${String(rid)}`;
  const stamp = `${r?.createAt ?? r?.createdAt ?? ""}|${r?.userDriverId ?? r?.userId ?? ""}|${r?.stationName ?? ""}|${idx}`;
  const safe = stamp.toString().replace(/\s/g, "_").replace(/[^a-zA-Z0-9_|.-]/g, "");
  return `CMP-${safe}`;
}

const ComplaintsManagement = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Data
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [complaintsError, setComplaintsError] = useState("");

  const [staffs, setStaffs] = useState([]);
  const [loadingStaffs, setLoadingStaffs] = useState(false);
  const [staffsError, setStaffsError] = useState("");

  // Modals
  const [assignModal, setAssignModal] = useState(null);     // { complaintId }
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [responseModal, setResponseModal] = useState(null); // { complaintId }

  // Contact email cache  loading
  const [contactByDriver, setContactByDriver] = useState({}); // { [driverId]: email }
  const [contactLoading, setContactLoading] = useState({});    // { [driverId]: boolean }

  // Mark-resolve loading theo từng complaint
  const [resolving, setResolving] = useState({}); // { [complaintId]: true }

  // ==== Effects: fetch complaints on mount ====
  useEffect(() => {
    (async () => {
      setLoadingComplaints(true);
      setComplaintsError("");
      try {
        const list = await fetchComplaints();
        const normalized = (Array.isArray(list) ? list : []).map((r, idx) => {
          const id = makeComplaintId(r, idx);
          const reportId = r?.reportId ?? r?.id ?? r?.reportCode ?? null;

          return {
            id,                         // duy nhất & ổn định
            reportId,                   // nguyên gốc để gọi BE
            driverId: r?.userDriverId || "",   // ✅ dùng để lấy contact email
            title: r?.note || "(No title)",
            customerName: r?.userDriverId || "Unknown Driver",
            customerEmail: "",                 // sẽ fill khi nhấn Show Email
            createdAt: r?.createAt?.slice(0, 10) ?? "",
            station: r?.stationName || "",
            content: r?.note || "",
            status:
              (r?.status === "Processing" && STATUS.ASSIGNED) ||
              (r?.status === "Resolved" && STATUS.RESOLVED) ||
              STATUS.OPEN,
            assignedTo: r?.userStaffId ? { id: r.userStaffId, name: r.userStaffId } : null,
            timeline: [
              {
                time: (r?.createAt || "").replace("T", " ").slice(0, 16),
                text: "Report created",
              },
            ],
          };
        });
        setComplaints(normalized);
      } catch (e) {
        setComplaintsError(
          e?.response?.data?.message || e?.message || "Không tải được danh sách complaints."
        );
      } finally {
        setLoadingComplaints(false);
      }
    })();
  }, []);

  // ==== Helpers UI ====
  const badge = (st) =>
  ({
    [STATUS.OPEN]: "bg-gray-100 text-gray-800",
    [STATUS.ASSIGNED]: "bg-indigo-100 text-indigo-800",
    [STATUS.RESOLVED]: "bg-green-100 text-green-800",
  }[st] || "bg-gray-100 text-gray-800");

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return complaints.filter((c) => {
      const matchSearch =
        !s ||
        c.title.toLowerCase().includes(s) ||
        c.customerName.toLowerCase().includes(s) ||
        c.id.toLowerCase().includes(s) ||
        String(c.reportId ?? "").toLowerCase().includes(s);
      const matchStatus = statusFilter === "all" || c.status.toLowerCase() === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [complaints, search, statusFilter]);

  // ===== Contact email =====
  const getContactEmail = async (driverId) => {
    if (!driverId) return null;

    // cache hit
    if (contactByDriver[driverId]) return contactByDriver[driverId];

    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/Report/get-contact", {
        params: { driverId }, // ✅ QUAN TRỌNG: truyền qua params
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      // BE trả: { status, message, data: "email@..." }
      const email = typeof res?.data?.data === "string" ? res.data.data : null;
      if (email) {
        setContactByDriver((m) => ({ ...m, [driverId]: email }));
        return email;
      }
      return null;
    } catch (e) {
      console.error("get-contact error:", e?.response?.data || e);
      return null;
    }
  };

  const onShowEmail = async (c) => {
    const driverId = String(c?.driverId || "").trim();
    if (!driverId) {
      alert("Không có driverId để lấy email.");
      return;
    }
    setContactLoading((m) => ({ ...m, [driverId]: true }));
    try {
      const email =
        c.customerEmail ||
        contactByDriver[driverId] ||
        (await getContactEmail(driverId));

      if (!email) {
        alert("Không lấy được email liên hệ cho driver này.");
        return;
      }

      // cache & cập nhật item hiện tại để hiển thị
      setContactByDriver((m) => ({ ...m, [driverId]: email }));
      setComplaints((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, customerEmail: email } : x))
      );
    } finally {
      setContactLoading((m) => ({ ...m, [driverId]: false }));
    }
  };

  const copyEmail = async (email) => {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      // ignore
    }
  };

  // ==== Actions ====
  const openAssign = async (complaintId) => {
    setAssignModal({ complaintId });
    if (!staffs.length) {
      setLoadingStaffs(true);
      setStaffsError("");
      try {
        const list = await fetchStaffList();
        setStaffs(Array.isArray(list) ? list : []);
      } catch (e) {
        setStaffsError(e?.response?.data?.message || e?.message || "Không tải được danh sách nhân viên.");
      } finally {
        setLoadingStaffs(false);
      }
    }
  };

  const handleAssign = async (staffId) => {
    if (!assignModal?.complaintId) return;
    const current = complaints.find((c) => c.id === assignModal.complaintId);
    if (!current) return;
    if (!current.reportId) {
      alert("Thiếu reportId – không thể assign.");
      return;
    }

    setAssignSubmitting(true);
    try {
      // KHÔNG ép Number để tránh NaN: giữ đúng kiểu BE trả
      const assigned = await assignStaff({
        reportId: current.reportId,
        staffId,
      });

      // Nếu BE không trả name, lấy từ list staffs
      const fallback = staffs.find((s) => String(s.staffId) === String(staffId));
      const staffName = assigned?.staffName || fallback?.staffName || String(staffId);

      setComplaints((prev) =>
        prev.map((c) =>
          c.id === current.id
            ? {
              ...c,
              status: STATUS.ASSIGNED,
              assignedTo: { id: staffId, name: staffName },
              timeline: [
                ...c.timeline,
                {
                  time: new Date().toISOString().slice(0, 16).replace("T", " "),
                  text: `Assigned to ${staffName} (${staffId})`,
                },
              ],
            }
            : c
        )
      );
      setAssignModal(null);
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Gán nhân viên thất bại. Vui lòng thử lại.");
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleAddResponse = (content) => {
    if (!responseModal?.complaintId) return;
    const text = content.trim();
    if (!text) return;
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === responseModal.complaintId
          ? {
            ...c,
            timeline: [
              ...c.timeline,
              {
                time: new Date().toISOString().slice(0, 16).replace("T", " "),
                text: `Admin response: ${text}`,
              },
            ],
          }
          : c
      )
    );
    setResponseModal(null);
  };

  // ✅ GỌI BE: /Report/mark-resolve (đã gắn confirm modal + toast)
  const handleMarkResolved = async (c) => {
    if (!c?.reportId) {
      window.toast.error("Thiếu reportId – không thể mark resolved.");
      return;
    }

    // 🧩 Confirm modal trước khi đánh dấu
    const { ok, note } = await window.confirmModal({
      title: "Mark complaint as resolved?",
      message:
        "This will notify the customer that the complaint has been resolved.",
      confirmText: "Mark Resolved",
      cancelText: "Cancel",
      variant: "primary",
      requireNote: true,
      noteLabel: "Resolution note",
      noteRequired: false,
      placeholder: "Describe how this was resolved (optional)...",
    });
    if (!ok) return;

    setResolving((m) => ({ ...m, [c.id]: true }));
    try {
      const token = localStorage.getItem("token");
      await api.patch(
        "/Report/mark-resolve",
        {
          reportId: c.reportId,
          reportStatus: "",
          note: note || "", // gửi note nếu có
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );

      // cập nhật UI
      setComplaints((prev) =>
        prev.map((x) =>
          x.id === c.id
            ? {
              ...x,
              status: STATUS.RESOLVED,
              timeline: [
                ...x.timeline,
                {
                  time: new Date().toISOString().slice(0, 16).replace("T", " "),
                  text: note
                    ? `Marked as Resolved (${note})`
                    : "Marked as Resolved",
                },
              ],
            }
            : x
        )
      );
      window.toast.success("Complaint marked as resolved");
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.title ||
        e?.message ||
        "Mark resolved failed.";
      window.toast.error(msg);
    } finally {
      setResolving((m) => {
        const copy = { ...m };
        delete copy[c.id];
        return copy;
      });
    }
  };


  // ==== Render ====
  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header & Filters */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 relative">
                <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, ID or customer name..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                />
              </div>
              <motion.button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <i className="bi bi-funnel" /> Filters
              </motion.button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-gray-200"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                      >
                        <option value="all">All</option>
                        <option value="open">Open</option>
                        <option value="assigned">Assigned</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* List */}
          {loadingComplaints ? (
            <div className="text-gray-600">Đang tải complaints...</div>
          ) : complaintsError ? (
            <div className="text-red-600">{complaintsError}</div>
          ) : (
            <div className="space-y-6">
              {filtered.map((c, idx) => {
                const driverId = String(c.driverId || "");
                const email = c.customerEmail || contactByDriver[driverId] || "";
                const isLoadingEmail = contactLoading[driverId];
                const isResolving = !!resolving[c.id];

                return (
                  <motion.div
                    key={c.id} // ✅ unique & stable
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="bg-white rounded-xl shadow-md border p-5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          <i className="bi bi-chat-left-text mr-2" />
                          {c.title}
                        </h3>
                        <div className="text-sm text-gray-600">
                          ReportID: <span className="font-medium">{c.reportId ?? "—"}</span> ·{" "}
                          <span>{c.createdAt}</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge(c.status)}`}>
                        {c.status}
                      </span>
                    </div>

                    <p className="mt-4 text-gray-700">{c.content}</p>

                    {/* Email hiển thị tại đây */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-sm text-gray-600">Contact Email:</span>
                      {email ? (
                        <>
                          <span className="text-sm font-medium text-gray-900">{email}</span>
                          <button
                            className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                            onClick={() => copyEmail(email)}
                            title="Copy email"
                          >
                            Copy
                          </button>
                        </>
                      ) : (
                        <button
                          className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-60"
                          onClick={() => onShowEmail(c)}
                          disabled={isLoadingEmail || !driverId}
                          title={driverId ? "Show email" : "Missing driverId"}
                        >
                          {isLoadingEmail ? "Loading..." : "Show Email"}
                        </button>
                      )}
                    </div>

                    {c.assignedTo && (
                      <div className="mt-2 text-sm text-indigo-700">
                        Assigned to:{" "}
                        <span className="font-medium">
                          {c.assignedTo.name} ({c.assignedTo.id})
                        </span>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-3">
                      {c.status !== STATUS.RESOLVED && (
                        <motion.button
                          className="px-3 py-2 bg-gray-900 text-white rounded-lg"
                          whileHover={{ scale: 1.02 }}
                          onClick={() => openAssign(c.id)}
                        >
                          <i className="bi bi-person-gear mr-1" />
                          Assign Staff
                        </motion.button>
                      )}

                      {c.status !== STATUS.RESOLVED && (
                        <motion.button
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
                          whileHover={{ scale: 1.02 }}
                          onClick={() => handleMarkResolved(c)}
                          disabled={isResolving}
                          title={isResolving ? "Marking..." : "Mark resolved"}
                        >
                          {isResolving ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="inline-block h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                              Processing…
                            </span>
                          ) : (
                            <>
                              <i className="bi bi-check2-circle mr-1" />
                              Mark Resolved
                            </>
                          )}
                        </motion.button>
                      )}
                    </div>

                    <div className="mt-5 border-t pt-4">
                      <div className="text-sm font-medium text-gray-800 mb-2">Timeline</div>
                      <ul className="space-y-1 text-sm text-gray-600">
                        {c.timeline.map((t, i) => (
                          <li key={`${c.id}-tl-${i}-${t.time || "x"}`}>
                            <span className="text-gray-400 mr-2">•</span>
                            <span className="font-mono text-xs mr-2">{t.time}</span>
                            {t.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                );
              })}

              {!filtered.length && (
                <div className="text-center text-gray-500">No complaints found.</div>
              )}
            </div>
          )}
        </div>

        {/* Assign Staff Modal */}
        <AnimatePresence>
          {assignModal && (
            <motion.div
              className="fixed inset-0 bg-black/50 grid place-items-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
              >
                <div className="p-5 border-b flex items-center justify-between">
                  <div className="text-lg font-semibold">Assign Staff</div>
                  <button
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    onClick={() => setAssignModal(null)}
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {loadingStaffs ? (
                    <div className="text-gray-600">Đang tải nhân viên…</div>
                  ) : staffsError ? (
                    <div className="text-red-600">{staffsError}</div>
                  ) : staffs.length === 0 ? (
                    <div className="text-gray-600">Không có nhân viên khả dụng.</div>
                  ) : (
                    <>
                      <label className="block text-sm text-gray-600">Choose a staff</label>
                      <select
                        id="assign-select"
                        className="w-full border rounded-lg px-3 py-2"
                        defaultValue={staffs[0]?.staffId}
                      >
                        {staffs.map((s, i) => (
                          <option key={`${s.staffId || i}-${i}`} value={s.staffId}>
                            {s.staffName} ({s.staffId}) · {s.stationName}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>

                <div className="p-5 border-t flex justify-end gap-2">
                  <button
                    className="px-4 py-2 rounded-lg border"
                    onClick={() => setAssignModal(null)}
                    disabled={assignSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg bg-gray-900 text-white disabled:opacity-50"
                    disabled={assignSubmitting || loadingStaffs || staffs.length === 0}
                    onClick={() =>
                      handleAssign(document.getElementById("assign-select").value)
                    }
                  >
                    {assignSubmitting ? "Assigning..." : "Assign"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Response Modal */}
        <AnimatePresence>
          {responseModal && (
            <motion.div
              className="fixed inset-0 bg-black/50 grid place-items-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
              >
                <div className="p-5 border-b flex items-center justify-between">
                  <div className="text-lg font-semibold">Add Response</div>
                  <button
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    onClick={() => setResponseModal(null)}
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
                <div className="p-5">
                  <textarea
                    id="response-text"
                    rows={5}
                    placeholder="Write your response to the customer..."
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div className="p-5 border-t flex justify-end gap-2">
                  <button
                    className="px-4 py-2 rounded-lg border"
                    onClick={() => setResponseModal(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg bg-primary text-white"
                    onClick={() =>
                      handleAddResponse(
                        document.getElementById("response-text").value.trim()
                      )
                    }
                  >
                    Save
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};

export default ComplaintsManagement;
