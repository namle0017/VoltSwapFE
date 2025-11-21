import React, { useState, useEffect } from "react";
import api from "@/api/api";
export default function Profile() {
  // ===== Brand palette (VoltSwap) =====
  const brandVars = {
    "--brand-start": "#1ee3b3", // mint/teal "Volt"
    "--brand-end": "#2f66ff", // blue "Swap"
    "--brand-50": "#f5faff", // very light bg
    "--brand-500": "#2f66ff",
    "--brand-600": "#2856d4",
  };

  // ===== Change Password Modal =====
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({
    oldPassword: "",
    newPassword: "",
  });

  const [form, setForm] = useState({
    driverName: "",
    driverEmail: "",
    password: "",
    driverAddress: "",
    driverTele: "",
    driverStatus: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const userId = localStorage.getItem("userId");

  // ==========================
  //  FETCH USER INFO
  // ==========================
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const res = await api.get(`/User/user-information?UserId=${userId}`);
        const userData = res.data?.data || {};

        setForm({
          driverName: userData.driverName || "",
          driverEmail: userData.driverEmail || "",
          password: "",
          driverAddress: userData.driverAddress || "",
          driverTele: userData.driverTele || "",
          driverStatus: userData.driverStatus || "",
        });
      } catch {
        alert("Unable to fetch user information!");
      } finally {
        setLoading(false);
      }
    };
    fetchUserInfo();
  }, [userId]);

  // =============================
  //  CHANGE PASSWORD LOGIC (BE yêu cầu)
  // =============================
  const changePassword = async () => {
    // Confirm trước khi đổi
    const { ok } = await window.confirmModal({
      title: "Confirm Password Change",
      message: "Are you sure you want to update your password?",
      confirmText: "Change",
      cancelText: "Cancel",
      variant: "danger",
    });

    if (!ok) return;

    try {
      const userId = localStorage.getItem("userId");

      await api.post("/auth/change-password", {
        oldPass: pwdForm.oldPassword,
        newPass: pwdForm.newPassword,
        userId: userId,
      });

      // Success modal
      await window.confirmModal({
        title: "Success!",
        message: "Your password has been updated successfully.",
        confirmText: "OK",
      });

      setPwdForm({
        oldPassword: "",
        newPassword: "",
      });

      setShowPwdModal(false);
    } catch (err) {
      // lấy lỗi theo BE chuẩn
      const errorMessage =
        err.response?.data?.errors?.NewPass?.[0] ||
        err.response?.data?.errors?.OldPass?.[0] ||
        err.response?.data?.title ||
        "Failed to change password.";

      await window.confirmModal({
        title: "Update Failed",
        message: errorMessage,
        confirmText: "OK",
        variant: "danger",
      });
    }
  };

  // ============================
  //  UPDATE USER INFO
  // ============================
  const handleChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const handleUpdate = async () => {
    try {
      setSaving(true);

      const token = localStorage.getItem("token");

      const payload = {
        driverId: userId, // BE yêu cầu
        driverName: form.driverName,
        driverEmail: form.driverEmail,
        driverTele: form.driverTele,
        driverAddress: form.driverAddress,
        driverStatus: form.driverStatus, // nếu không cho sửa thì vẫn gửi lại BE
      };

      await api.put("/User/update-user-information", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // cập nhật localStorage
      localStorage.setItem("userName", form.driverName);
      localStorage.setItem("userEmail", form.driverEmail);

      // BẮN SỰ KIỆN TOÀN APP
      window.dispatchEvent(new Event("user-updated"));
      await window.confirmModal({
        title: "Success!",
        message: "Your information has been updated successfully.",
        confirmText: "OK",
      });
    } catch (err) {
      const message =
        err.response?.data?.message || "Update failed! Please try again.";

      await window.confirmModal({
        title: "Update Failed",
        message: message,
        confirmText: "OK",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        className="flex justify-center items-center min-h-screen text-gray-600"
        style={brandVars}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-[var(--brand-500)] border-t-transparent animate-spin" />
          <p className="font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[var(--brand-50)] relative overflow-hidden"
      style={brandVars}
    >
      {/* soft gradient blobs */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 h-[320px] w-[320px] rounded-full blur-3xl opacity-30"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, var(--brand-start), transparent 60%)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-24 h-[320px] w-[320px] rounded-full blur-3xl opacity-30"
        style={{
          background:
            "radial-gradient(circle at 70% 70%, var(--brand-end), transparent 60%)",
        }}
      />

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header card */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur border border-white/40 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[var(--brand-500)]" />
            <span className="text-sm font-medium text-gray-700">
              Profile Center
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-3 tracking-tight text-gray-900">
            Your Account
          </h1>
          <p className="text-gray-600 mt-1">
            Keep your personal information up to date.
          </p>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-3xl shadow-xl ring-1 ring-black/5">
          <div className="h-2 rounded-t-3xl bg-gradient-to-r from-[var(--brand-start)] to-[var(--brand-end)]" />

          <div className="p-6 md:p-8">
            {/* Header row */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[var(--brand-start)] to-[var(--brand-end)] grid place-items-center text-white text-2xl font-bold shadow-md">
                {form.driverName?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">
                  Account Information
                </h2>
                <p className="text-gray-500 text-sm">
                  Manage your personal details
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Name */}
              <Field
                label="Name"
                name="driverName"
                value={form.driverName}
                onChange={handleChange}
                placeholder="Your full name"
                icon="bi-person"
              />

              {/* Email */}
              <Field
                label="Email"
                name="driverEmail"
                type="email"
                value={form.driverEmail}
                onChange={handleChange}
                placeholder="you@example.com"
                icon="bi-envelope"
              />

              {/* Phone */}
              <Field
                label="Phone"
                name="driverTele"
                value={form.driverTele}
                onChange={handleChange}
                placeholder="(+84) 9x xxx xxxx"
                icon="bi-telephone"
              />

              {/* Address full width */}
              <Field
                label="Address"
                name="driverAddress"
                value={form.driverAddress}
                onChange={handleChange}
                placeholder="House number, street, district, city"
                icon="bi-geo-alt"
              />
            </div>
            {/* Actions */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* CHANGE PASSWORD BUTTON */}
              <button
                type="button"
                onClick={() => setShowPwdModal(true)}
                className="w-full sm:w-auto px-4 py-3 rounded-xl font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
              >
                Change Password
              </button>

              {/* SAVE CHANGES BUTTON */}
              <button
                onClick={handleUpdate}
                disabled={saving}
                className={[
                  "w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-white",
                  "bg-gradient-to-r from-[var(--brand-start)] to-[var(--brand-end)]",
                  "hover:opacity-95 active:opacity-90 transition shadow-md",
                  saving ? "opacity-75 cursor-not-allowed" : "",
                ].join(" ")}
              >
                {saving ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <i className="bi bi-save" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Your data is protected and used only for providing our services.
        </p>
      </div>

      {/* =======================
          CHANGE PASSWORD MODAL
      ======================= */}
      {showPwdModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Change Password</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Old Password</label>
                <input
                  type="text"
                  value={pwdForm.oldPassword}
                  onChange={(e) =>
                    setPwdForm((s) => ({ ...s, oldPassword: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">New Password</label>
                <input
                  type="text"
                  value={pwdForm.newPassword}
                  onChange={(e) =>
                    setPwdForm((s) => ({ ...s, newPassword: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPwdModal(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={changePassword}
                className="px-4 py-2 rounded-lg text-white bg-gradient-to-r from-[var(--brand-start)] to-[var(--brand-end)] shadow"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==== Reusable Field component ==== */
function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  icon,
  className = "",
}) {
  return (
    <div className={className}>
      <label className="block text-gray-700 font-medium mb-1">{label}</label>

      <div className="relative">
        {icon && (
          <i
            className={`bi ${icon} absolute left-3 top-1/2 -translate-y-1/2 text-gray-400`}
            aria-hidden="true"
          />
        )}

        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={[
            "w-full rounded-xl border bg-white/60 backdrop-blur px-10 py-3",
            "outline-none transition shadow-sm",
            "placeholder:text-gray-400",
            "border-gray-200 focus:border-[var(--brand-500)] focus:ring-4",
            "focus:ring-[color:rgba(47,102,255,0.15)]",
          ].join(" ")}
          style={{ "--brand-500": "#2f66ff" }}
        />
      </div>
    </div>
  );
}
