// src/pages/staff/StaffAccount.jsx
import React, { useState, useEffect } from "react";
import api from "@/api/api";

export default function StaffAccount() {
  // ===== Thông tin tài khoản (chỉ đọc) =====
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // ===== Đổi mật khẩu =====
  const [showPassBox, setShowPassBox] = useState(false);
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [passMsgType, setPassMsgType] = useState("success"); // "success" | "error"
  const [changing, setChanging] = useState(false);

  // userId dùng cho /User/user-information & /auth/change-password
  const userId =
    localStorage.getItem("userId") || localStorage.getItem("UserId") || "";

  // ====== FETCH INFO TỪ /User/user-information?UserId= ======
  useEffect(() => {
    if (!userId) {
      setInfoMessage("Missing userId. Please log in again.");
      setLoading(false);
      return;
    }

    const fetchInfo = async () => {
      try {
        const res = await api.get("/User/staff-information", {
          params: { UserId: userId },
        });

        const data = res?.data?.data || {};
        // BE trả: driverName, driverEmail, driverTele, driverAddress
        setName(data.staffName || "");
        setEmail(data.staffEmail || "");
        setPhone(data.staffTele || "");
        setAddress(data.staffAddress || "");
        setInfoMessage("");
      } catch (e) {
        setInfoMessage(
          e?.response?.data?.message ||
          "Failed to load staff information."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [userId]);

  // ====== HANDLER ĐỔI MẬT KHẨU ======
  async function handleSubmitChangePassword(e) {
    e.preventDefault();

    if (!userId) {
      setPassMsgType("error");
      setPassMsg("Missing userId. Please log in again.");
      return;
    }

    if (!oldPass.trim() || !newPass.trim()) {
      setPassMsgType("error");
      setPassMsg("Please enter both current password and new password.");
      return;
    }

    if (newPass.trim().length < 6) {
      setPassMsgType("error");
      setPassMsg("New password should be at least 6 characters.");
      return;
    }

    if (newPass.trim() !== confirmPass.trim()) {
      setPassMsgType("error");
      setPassMsg("New password and confirmation do not match.");
      return;
    }

    try {
      setChanging(true);
      setPassMsg("");

      const token =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        "";

      const payload = {
        oldPass: oldPass.trim(),
        newPass: newPass.trim(),
        userId,
      };

      const res = await api.post(
        "/auth/change-password",
        payload,
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      );

      const msg = res?.data?.message || "Password changed successfully.";

      setPassMsgType("success");
      setPassMsg(msg);

      // clear field nhưng KHÔNG đóng panel
      setOldPass("");
      setNewPass("");
      setConfirmPass("");
      // ❌ ĐỪNG gọi setShowPassBox(false) nữa
    } catch (e) {
      const status = e?.response?.status;
      const beData = e?.response?.data;
      const beMsg =
        beData?.message ||
        beData?.error ||
        e.message ||
        "Change password failed. Please try again.";

      console.error("CHANGE-PASS ERROR:", { status, data: beData });

      setPassMsgType("error");
      setPassMsg(status ? `(${status}) ${beMsg}` : beMsg);
    } finally {
      setChanging(false);
    }
  }


  // Forgot password (tạm thời demo)
  function handleForgotPassword() {
    alert("Forgot password flow (to be implemented).");
  }

  if (loading) {
    return (
      <section className="staff-account-page">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "260px",
            color: "#6b7280",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "999px",
              border: "3px solid #4f46e5",
              borderTopColor: "transparent",
              animation: "spin 0.9s linear infinite",
            }}
          />
          <span>Loading staff profile…</span>

          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </section>
    );
  }

  return (
    <section className="staff-account-page">
      <header className="acc-header">
        <div className="acc-chip">
          <span className="dot-online" />
          <span>Profile Center</span>
        </div>
        <h1 className="acc-title">Your Account</h1>
        <p className="acc-subtitle">
          Keep your personal information up to date.
        </p>
      </header>

      <div className="acc-card">
        <div className="acc-card-topbar" />

        <div className="acc-card-inner">
          {/* Title row */}
          <div className="acc-card-head">
            <div className="acc-avatar-wrap">
              <div className="acc-avatar">
                {makeInitials(name || email || "U")}
              </div>
            </div>
            <div className="acc-head-main">
              <h2 className="acc-card-title">Account Information</h2>
              <p className="acc-card-desc">Manage your personal details</p>
            </div>
            <div className="acc-secured-pill">
              <i className="bi bi-shield-lock" aria-hidden="true" />
              <span>Secured</span>
            </div>
          </div>

          {/* Form – chỉ đọc, không submit */}
          <form onSubmit={(e) => e.preventDefault()} className="acc-form">
            <div className="acc-grid-2">
              <div className="acc-field">
                <label className="acc-label">Name</label>
                <input
                  className="acc-input"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  readOnly
                />
              </div>

              <div className="acc-field">
                <label className="acc-label">Email</label>
                <input
                  className="acc-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  readOnly
                />
              </div>
            </div>

            <div className="acc-grid-2">
              <div className="acc-field">
                <label className="acc-label">Phone</label>
                <input
                  className="acc-input"
                  type="tel"
                  placeholder="(+84) 9x xxx xxxx"
                  value={phone}
                  readOnly
                />
              </div>
            </div>

            <div className="acc-field">
              <label className="acc-label">Address</label>
              <input
                className="acc-input"
                type="text"
                placeholder="House number, street, ward, district, city"
                value={address}
                readOnly
              />
            </div>

            {/* Row thông báo + 2 nút password */}
            <div className="acc-footer-row">
              <div className="acc-footer-left">
                {infoMessage && <p className="acc-message">{infoMessage}</p>}
              </div>
              <div className="acc-actions">
                <button
                  type="button"
                  className="acc-btn acc-btn-primary"
                  onClick={() => {
                    setShowPassBox((v) => !v);
                    setPassMsg("");
                  }}
                  disabled={changing}
                >
                  <i className="bi bi-key" aria-hidden="true" />
                  <span>{showPassBox ? "Close" : "Change password"}</span>
                </button>
              </div>
            </div>

            {/* Panel đổi mật khẩu */}
            {showPassBox && (
              <div className="acc-pass-card">
                <h3 className="acc-pass-title">Change password</h3>
                <p className="acc-pass-desc">
                  Enter your current password and a new password.
                </p>

                <div className="acc-grid-2 acc-pass-grid">
                  <div className="acc-field">
                    <label className="acc-label">Current password</label>
                    <input
                      className="acc-input"
                      type="password"
                      placeholder="Enter current password"
                      value={oldPass}
                      onChange={(e) => setOldPass(e.target.value)}
                    />
                  </div>
                  <div className="acc-field">
                    <label className="acc-label">New password</label>
                    <input
                      className="acc-input"
                      type="password"
                      placeholder="Enter new password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                    />
                  </div>
                  <div className="acc-field acc-pass-confirm">
                    <label className="acc-label">Confirm new password</label>
                    <input
                      className="acc-input"
                      type="password"
                      placeholder="Re-enter new password"
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                    />
                  </div>
                </div>

                {passMsg && (
                  <p
                    className={
                      "acc-message " +
                      (passMsgType === "error" ? "acc-message-error" : "")
                    }
                    style={{ marginTop: 8 }}
                  >
                    {passMsg}
                  </p>
                )}

                <div className="acc-pass-actions">
                  <button
                    type="button"
                    className="acc-btn acc-btn-primary"
                    onClick={handleSubmitChangePassword}
                    disabled={changing}
                  >
                    <i className="bi bi-shield-lock-fill" aria-hidden="true" />
                    <span>{changing ? "Updating…" : "Confirm change"}</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        <footer className="acc-footer">
          Your data is protected and used only for providing our services.
        </footer>
      </div>

      <style>{`
        .staff-account-page {
          max-width: 1120px;
          margin: 0 auto 40px;
        }

        .acc-header {
          margin-bottom: 18px;
        }
        .acc-chip {
          display:inline-flex;
          align-items:center;
          gap:6px;
          padding:4px 12px;
          border-radius:999px;
          background:#ecfdf5;
          font-size:12px;
          color:#047857;
          margin-bottom:10px;
          box-shadow:0 4px 12px rgba(16,185,129,0.18);
        }
        .dot-online {
          width:8px;
          height:8px;
          border-radius:999px;
          background:#22c55e;
          box-shadow:0 0 0 4px rgba(34,197,94,0.25);
        }
        .acc-title {
          margin:0;
          font-size:30px;
          font-weight:800;
          letter-spacing:0.01em;
        }
        .acc-subtitle {
          margin:4px 0 0;
          font-size:13px;
          color:var(--muted, #6b7280);
        }

        .acc-card {
          margin-top:16px;
          border-radius:24px;
          background:#ffffff;
          box-shadow:0 30px 80px rgba(15,23,42,0.18);
          overflow:hidden;
          border:1px solid #e5e7eb;
        }
        .acc-card-topbar {
          height:5px;
          background:linear-gradient(90deg,#22c55e,#0ea5e9,#4f46e5);
        }
        .acc-card-inner {
          padding:22px 26px 18px;
        }

        .acc-card-head {
          display:flex;
          align-items:center;
          gap:16px;
          margin-bottom:18px;
        }
        .acc-avatar-wrap {
          padding:6px;
          border-radius:18px;
          background:radial-gradient(circle at 0 0,#dbeafe,#eff6ff);
        }
        .acc-avatar {
          width:44px;
          height:44px;
          border-radius:18px;
          background:linear-gradient(135deg,#2563eb,#22c55e);
          display:flex;
          align-items:center;
          justify-content:center;
          color:#fff;
          font-weight:700;
          font-size:20px;
          box-shadow:0 12px 32px rgba(37,99,235,0.45);
        }
        .acc-head-main {
          flex:1;
          min-width:0;
        }
        .acc-card-title {
          margin:0;
          font-size:18px;
          font-weight:700;
        }
        .acc-card-desc {
          margin:3px 0 0;
          font-size:12px;
          color:var(--muted, #6b7280);
        }
        .acc-secured-pill {
          display:inline-flex;
          align-items:center;
          gap:6px;
          padding:5px 11px;
          border-radius:999px;
          border:1px solid #bfdbfe;
          font-size:11px;
          color:#1e3a8a;
          background:#eff6ff;
          white-space:nowrap;
        }
        .acc-secured-pill i {
          font-size:13px;
        }

        .acc-form {
          margin-top:4px;
          display:flex;
          flex-direction:column;
          gap:14px;
        }
        .acc-grid-2 {
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:14px 18px;
        }
        @media (max-width: 820px) {
          .acc-grid-2 { grid-template-columns:minmax(0,1fr); }
        }

        .acc-field {
          display:flex;
          flex-direction:column;
          gap:4px;
          font-size:13px;
        }
        .acc-label {
          font-weight:500;
        }
        .acc-optional {
          font-weight:400;
          font-size:11px;
          color:var(--muted, #6b7280);
        }
        .acc-input {
          border-radius:12px;
          border:1px solid var(--line, #e5e7eb);
          padding:10px 12px;
          font-size:13px;
          outline:none;
          background:#f9fafb;
          transition:border-color .15s, box-shadow .15s, background .15s;
        }
        .acc-input::placeholder {
          color:#9ca3af;
        }
        .acc-input:focus {
          border-color:#4f46e5;
          background:#ffffff;
          box-shadow:0 0 0 1px rgba(79,70,229,0.09);
        }

        .acc-footer-row {
          margin-top:6px;
          padding-top:10px;
          border-top:1px dashed #e5e7eb;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          flex-wrap:wrap;
        }
        .acc-footer-left {
          min-height:20px;
        }

        .acc-actions {
          display:flex;
          flex-wrap:wrap;
          gap:10px;
          justify-content:flex-end;
        }
        .acc-btn {
          border-radius:999px;
          padding:9px 16px;
          font-size:13px;
          font-weight:500;
          border:1px solid transparent;
          display:inline-flex;
          align-items:center;
          gap:6px;
          cursor:pointer;
          white-space:nowrap;
        }
        .acc-btn-secondary {
          background:#ffffff;
          border-color:var(--line,#e5e7eb);
        }
        .acc-btn-secondary:hover {
          background:#f3f4ff;
        }
        .acc-btn-primary {
          background:linear-gradient(135deg,#10b981,#2563eb);
          color:#ffffff;
          box-shadow:0 14px 36px rgba(37,99,235,0.38);
        }
        .acc-btn-primary i {
          font-size:16px;
        }

        .acc-message {
          margin:0;
          font-size:12px;
          color:#16a34a;
        }
        .acc-message-error {
          color:#dc2626;
        }

        .acc-pass-card {
          margin-top:14px;
          padding:14px 16px;
          border-radius:16px;
          border:1px dashed #e5e7eb;
          background:#f9fafb;
        }
        .acc-pass-title {
          margin:0 0 4px;
          font-size:14px;
          font-weight:600;
        }
        .acc-pass-desc {
          margin:0 0 10px;
          font-size:12px;
          color:#6b7280;
        }
        .acc-pass-grid {
          margin-top:4px;
        }
        .acc-pass-confirm {
          grid-column:1 / -1;
        }
        @media (max-width: 820px) {
          .acc-pass-confirm {
            grid-column:auto;
          }
        }
        .acc-pass-actions {
          margin-top:12px;
          display:flex;
          justify-content:flex-end;
        }

        .acc-footer {
          padding:10px 24px 14px;
          border-top:1px solid #e5e7eb;
          text-align:center;
          font-size:11px;
          color:var(--muted,#6b7280);
          background:radial-gradient(circle at top,#f9fafb,#f3f4ff);
        }
      `}</style>
    </section>
  );
}

function makeInitials(text) {
  if (!text) return "U";
  const parts = String(text)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  const first = parts[0][0];
  const last = parts[parts.length - 1][0];
  return (first + last).toUpperCase();
}
