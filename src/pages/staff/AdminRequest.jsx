// src/pages/AdminRequest.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "@/api/api"; // axios instance chung

// BE endpoints
const GET_TYPES_ENDPOINT = "/Report/get-staff-report-list";
const CREATE_REPORT_ENDPOINT = "/Report/staff-create-report";
const LIST_SUBMITTED_ENDPOINT = "/Report/customer-reports"; // baseURL = /api -> OK

// Chỉ show các reportType 4,5,6,7
const ALLOWED_TYPES = [4, 5, 6, 7];

/* ========= Helpers ========= */

function formatDateTime(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    // Ví dụ: 24/11/2025 12:00AM
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    const mm2 = String(m).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${h}:${mm2}${ampm}`;
}

function normalizeSubmitted(list, staffId) {
    return (list || [])
        // Lọc type 4-7
        .filter((item) =>
            ALLOWED_TYPES.includes(
                Number(item.reportType)
            )
        )
        // Nếu BE không filter theo userId, thì giữ lại những cái thuộc staff đang login
        .filter((item) =>
            item.staffId
                ? item.staffId === staffId
                : true
        )
        .map((item, idx) => ({
            id:
                item.reportId ||
                `${item.staffId || "ST"}-${idx}`,
            typeName:
                item.reportTypeName ||
                `Type ${item.reportType}`,
            driverId: item.driverId || "",
            note: item.reportNote || "",
            createdAt:
                item.createAt ||
                item.createdAt ||
                "",
            status:
                item.reportStatus ||
                item.status ||
                "Processing",
        }));
}

/* ========= Component ========= */

export default function AdminRequest() {
    const [staffId] = useState(
        localStorage.getItem("StaffId") ||
        localStorage.getItem("userId") ||
        ""
    );

    // Form
    const [reportTypes, setReportTypes] =
        useState([]);
    const [reportTypeId, setReportTypeId] =
        useState("");
    const [driverId, setDriverId] = useState("");
    const [reportNote, setReportNote] =
        useState("");

    // Submitted reports từ BE
    const [submitted, setSubmitted] =
        useState([]);
    const [loadingTypes, setLoadingTypes] =
        useState(false);
    const [
        loadingSubmitted,
        setLoadingSubmitted,
    ] = useState(false);
    const [creating, setCreating] =
        useState(false);
    const [error, setError] = useState("");

    const canSubmit = useMemo(
        () =>
            !!staffId &&
            !!reportTypeId &&
            reportNote.trim().length > 0,
        [staffId, reportTypeId, reportNote]
    );

    /* ----- Load report types ----- */
    async function loadReportTypes() {
        try {
            setLoadingTypes(true);
            const res = await api.get(
                GET_TYPES_ENDPOINT
            );
            const list =
                Array.isArray(
                    res?.data?.data
                )
                    ? res.data.data
                    : [];
            setReportTypes(list);
        } catch (e) {
            console.error(e);
            setError(
                e.message ||
                "Failed to load report types"
            );
        } finally {
            setLoadingTypes(false);
        }
    }

    /* ----- Load submitted reports (type 4-7) ----- */
    async function loadSubmitted() {
        if (!staffId) return;
        try {
            setLoadingSubmitted(true);
            const res = await api.get(
                LIST_SUBMITTED_ENDPOINT,
                {
                    params: {
                        userId: staffId,
                    },
                }
            );

            const raw = Array.isArray(
                res?.data?.data
            )
                ? res.data.data
                : [];

            const normalized =
                normalizeSubmitted(
                    raw,
                    staffId
                );
            setSubmitted(normalized);
        } catch (e) {
            console.error(e);
            setError(
                e.message ||
                "Failed to load submitted reports"
            );
        } finally {
            setLoadingSubmitted(false);
        }
    }

    useEffect(() => {
        if (!staffId) {
            setError(
                "Missing staffId. Please login again."
            );
            return;
        }
        loadReportTypes();
        loadSubmitted();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [staffId]);

    /* ----- Submit new report ----- */
    async function onSubmit(e) {
        e.preventDefault();
        if (!canSubmit || !staffId) return;

        try {
            setCreating(true);
            setError("");

            const payload = {
                staffId,
                driverId:
                    driverId.trim() ||
                    null,
                reportTypeId:
                    Number(reportTypeId),
                reportNote:
                    reportNote.trim(),
            };

            await api.post(
                CREATE_REPORT_ENDPOINT,
                payload
            );

            // Sau khi tạo xong -> reload list submitted từ BE để đồng bộ
            await loadSubmitted();

            // Reset form
            setReportTypeId("");
            setDriverId("");
            setReportNote("");
        } catch (e) {
            console.error(e);
            const resData = e?.response?.data;

            // ✅ Bắt case validation từ BE: title = "One or more validation errors occurred."
            if (
                resData?.title === "One or more validation errors occurred." &&
                resData?.errors
            ) {
                // Nếu BE trả lỗi cho ReportNote thì show đúng message đó
                if (resData.errors.ReportNote && resData.errors.ReportNote.length > 0) {
                    setError(resData.errors.ReportNote[0]);
                } else {
                    // fallback: lấy lỗi đầu tiên trong errors
                    const firstKey = Object.keys(resData.errors)[0];
                    const firstMsg = resData.errors[firstKey]?.[0];
                    setError(firstMsg || "Validation error. Please check your inputs.");
                }
            } else {
                // Các lỗi khác giữ như cũ
                setError(resData?.message || e.message || "Submit failed");
            }
        } finally {
            setCreating(false);
        }
    }

    return (
        <section
            style={{
                fontFamily: "system-ui",
                color: "#0f172a",
            }}
        >
            <h2
                style={{
                    margin: "0 0 6px",
                    fontSize: 22,
                    fontWeight: 800,
                }}
            >
                Admin request
            </h2>
            <p
                style={{
                    margin: "0 0 14px",
                    fontSize: 12,
                    color: "#6b7280",
                }}
            >
                Staff ID:{" "}
                <strong>
                    {staffId ||
                        "N/A (please login)"}
                </strong>
            </p>

            {/* FORM */}
            <form
                onSubmit={onSubmit}
                style={card}
            >
                <div style={grid2}>
                    <label style={label}>
                        Report Type
                        <select
                            style={input}
                            value={
                                reportTypeId
                            }
                            onChange={(e) =>
                                setReportTypeId(
                                    e.target.value
                                )
                            }
                            disabled={
                                loadingTypes ||
                                reportTypes.length ===
                                0
                            }
                        >
                            <option value="">
                                {loadingTypes
                                    ? "Loading types..."
                                    : "Select report type"}
                            </option>
                            {reportTypes.map(
                                (t) => (
                                    <option
                                        key={
                                            t.reportTypeId
                                        }
                                        value={
                                            t.reportTypeId
                                        }
                                    >
                                        {
                                            t.reportType
                                        }
                                    </option>
                                )
                            )}
                        </select>
                    </label>

                    <label style={label}>
                        Driver ID (optional)
                        <input
                            style={input}
                            placeholder="Driver ID (can be empty)"
                            value={
                                driverId
                            }
                            onChange={(e) =>
                                setDriverId(
                                    e.target
                                        .value
                                )
                            }
                        />
                    </label>
                </div>

                <label
                    style={{
                        ...label,
                        marginTop: 12,
                    }}
                >
                    Report Note
                    <textarea
                        rows={5}
                        style={{
                            ...input,
                            resize:
                                "vertical",
                        }}
                        placeholder="Describe the issue / request for Admin"
                        value={
                            reportNote
                        }
                        onChange={(e) =>
                            setReportNote(
                                e.target.value
                            )
                        }
                    />
                </label>

                <div
                    style={{
                        marginTop: 14,
                    }}
                >
                    <button
                        type="submit"
                        disabled={
                            !canSubmit ||
                            creating
                        }
                        style={{
                            ...btnPrimary,
                            opacity:
                                !canSubmit ||
                                    creating
                                    ? 0.6
                                    : 1,
                            width:
                                "100%",
                        }}
                    >
                        {creating
                            ? "Sending…"
                            : "Send Report to Admin"}
                    </button>
                </div>

                {error && (
                    <div
                        style={{
                            color: "#b91c1c",
                            marginTop: 10,
                            fontWeight: 600,
                            fontSize: 12,
                        }}
                    >
                        ❌{" "}
                        {error}
                    </div>
                )}
            </form>

            {/* SUBMITTED REPORTS */}
            <div
                style={{
                    ...cardSoft,
                    marginTop: 18,
                }}
            >
                <div
                    style={{
                        display:
                            "flex",
                        justifyContent:
                            "space-between",
                        alignItems:
                            "center",
                        gap: 8,
                    }}
                >
                    <h3
                        style={{
                            margin: 0,
                            fontSize: 15,
                            fontWeight: 800,
                            color: "#111827",
                        }}
                    >
                        Submitted Reports
                    </h3>
                    <button
                        onClick={
                            loadSubmitted
                        }
                        style={
                            btnGhost
                        }
                        disabled={
                            loadingSubmitted
                        }
                    >
                        {loadingSubmitted
                            ? "Loading..."
                            : "Refresh"}
                    </button>
                </div>

                <div
                    style={{
                        overflowX:
                            "auto",
                        marginTop: 10,
                    }}
                >
                    <table
                        style={table}
                    >
                        <thead>
                            <tr>
                                <th
                                    style={
                                        th
                                    }
                                >
                                    Type
                                </th>
                                <th
                                    style={
                                        th
                                    }
                                >
                                    Driver
                                    ID
                                </th>
                                <th
                                    style={
                                        th
                                    }
                                >
                                    Note
                                </th>
                                <th
                                    style={
                                        th
                                    }
                                >
                                    Created
                                    At
                                </th>
                                <th
                                    style={
                                        th
                                    }
                                >
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingSubmitted && (
                                <tr>
                                    <td
                                        colSpan={
                                            5
                                        }
                                        style={
                                            emptyTd
                                        }
                                    >
                                        Loading
                                        submitted
                                        reports...
                                    </td>
                                </tr>
                            )}

                            {!loadingSubmitted &&
                                submitted.length ===
                                0 ? (
                                <tr>
                                    <td
                                        colSpan={
                                            5
                                        }
                                        style={
                                            emptyTd
                                        }
                                    >
                                        No
                                        report
                                        submitted
                                        yet.
                                    </td>
                                </tr>
                            ) : (
                                !loadingSubmitted &&
                                submitted.map(
                                    (
                                        r,
                                        i
                                    ) => (
                                        <tr
                                            key={
                                                r.id
                                            }
                                            style={{
                                                backgroundColor:
                                                    i %
                                                        2 ===
                                                        0
                                                        ? "#ffffff"
                                                        : "#f9fafb",
                                            }}
                                        >
                                            <td
                                                style={
                                                    tdStrong
                                                }
                                            >
                                                {r.typeName ||
                                                    "-"}
                                            </td>
                                            <td
                                                style={
                                                    td
                                                }
                                            >
                                                {r.driverId ||
                                                    "—"}
                                            </td>
                                            <td
                                                style={{
                                                    ...td,
                                                    maxWidth:
                                                        260,
                                                    whiteSpace:
                                                        "nowrap",
                                                    overflow:
                                                        "hidden",
                                                    textOverflow:
                                                        "ellipsis",
                                                }}
                                                title={
                                                    r.note
                                                }
                                            >
                                                {r.note ||
                                                    "-"}
                                            </td>
                                            <td
                                                style={
                                                    td
                                                }
                                            >
                                                {formatDateTime(
                                                    r.createdAt
                                                )}
                                            </td>
                                            <td
                                                style={
                                                    td
                                                }
                                            >
                                                <span
                                                    style={statusBadge(
                                                        r.status
                                                    )}
                                                >
                                                    {r.status ||
                                                        "Processing"}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}

/* ==== styles ==== */

const card = {
    background:
        "#ffffff",
    border:
        "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
    boxShadow:
        "0 6px 18px rgba(15,23,42,0.04)",
};

const cardSoft = {
    background:
        "#f9fafb",
    border:
        "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
    boxShadow:
        "0 4px 14px rgba(15,23,42,0.03)",
};

const grid2 = {
    display: "grid",
    gridTemplateColumns:
        "1fr 1fr",
    gap: 12,
};

const label = {
    display:
        "grid",
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: "#111827",
};

const input = {
    padding:
        "10px 12px",
    border:
        "1px solid #e5e7eb",
    borderRadius: 10,
    outline:
        "none",
    fontSize: 13,
    backgroundColor:
        "#f9fafb",
};

const btn = {
    background:
        "#f3f4f6",
    border:
        "1px solid #e5e7eb",
    padding:
        "8px 12px",
    borderRadius: 8,
    cursor:
        "pointer",
    fontSize: 13,
};

const btnPrimary = {
    ...btn,
    background:
        "#111827",
    color:
        "#ffffff",
    borderColor:
        "#111827",
    fontWeight: 600,
};

const btnGhost = {
    ...btn,
    background:
        "#ffffff",
    borderColor:
        "#e5e7eb",
    fontSize: 12,
};

const table = {
    width: "100%",
    borderCollapse:
        "separate",
    borderSpacing: 0,
    fontSize: 13,
    marginTop: 4,
};

const th = {
    textAlign:
        "left",
    padding:
        "10px 12px",
    fontWeight: 600,
    color:
        "#111827",
    backgroundColor:
        "#eef2ff",
    borderBottom:
        "1px solid #e5e7eb",
    whiteSpace:
        "nowrap",
};

const td = {
    padding:
        "9px 12px",
    color:
        "#111827",
    borderBottom:
        "1px solid #f3f4f6",
    fontWeight: 400,
};

const tdStrong = {
    ...td,
    fontWeight: 600,
};

const emptyTd = {
    padding: 18,
    textAlign:
        "center",
    color:
        "#9ca3af",
    fontSize: 13,
};

function statusBadge(status) {
    const s = String(
        status || ""
    ).toLowerCase();
    let bg =
        "#e5e7eb";
    let color =
        "#111827";

    if (
        s === "processing" ||
        s === "pending"
    ) {
        bg = "#eff6ff";
        color =
            "#1d4ed8";
    } else if (
        s === "resolved" ||
        s === "done"
    ) {
        bg = "#ecfdf5";
        color =
            "#15803d";
    } else if (s === "rejected") {
        bg = "#fef2f2";
        color =
            "#b91c1c";
    }

    return {
        display:
            "inline-flex",
        alignItems:
            "center",
        padding:
            "3px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        backgroundColor:
            bg,
        color,
    };
}