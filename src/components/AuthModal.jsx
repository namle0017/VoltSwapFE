import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import authApi from "../api/authApi";
import * as yup from "yup";

/* =====================================================
        YUP VALIDATION SCHEMA FOR REGISTER
===================================================== */
const registerSchema = yup.object({
  name: yup
    .string()
    .matches(/^[\p{L} ]{5,42}$/u, "Full name must be 5–42 letters only")
    .required("Full name is required"),

  email: yup
    .string()
    .matches(
      /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)])$/,
      "Invalid email format"
    )
    .required("Email is required"),

  password: yup
    .string()
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=!_*?-]).{8,}$/,
      "Password must contain uppercase, lowercase, number & special character"
    )
    .required("Password is required"),

  address: yup
    .string()
    .matches(/^[A-Za-z0-9À-ỹ\s,./-]{5,100}$/, "Invalid address format")
    .required("Address is required"),

  phone: yup
    .string()
    .matches(/^(0|(\+84))?(3|5|7|8|9)\d{8}$/, "Invalid Vietnamese phone number")
    .required("Phone number is required"),
});

const AuthModal = ({ isOpen, onClose, initialMode = "login" }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode);
  const [forgotMode, setForgotMode] = useState(false);

  const [showNewPasswordModal, setShowNewPasswordModal] = useState(false);
  const [tempUserId, setTempUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // 🔥 Lưu lỗi cho từng input
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setForgotMode(false);
      setErrors({});
    }
  }, [isOpen, initialMode]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    address: "",
    phone: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });

    // clear lỗi khi user gõ lại
    setErrors({ ...errors, [e.target.name]: "" });
  };

  /* =====================================================
               HANDLE SUBMIT WITH YUP
  ===================================================== */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // RESET lỗi mỗi lần submit
    setErrors({});

    /* ----------------- VALIDATE REGISTER ----------------- */
    if (mode === "signup" && !forgotMode) {
      try {
        await registerSchema.validate(formData, { abortEarly: false });
      } catch (validationErr) {
        const newErrors = {};
        validationErr.inner.forEach((err) => {
          newErrors[err.path] = err.message;
        });
        setErrors(newErrors);
        return; // ❌ NGỪNG SUBMIT NẾU VALIDATION FAIL
      }
    }

    try {
      let res;

      /* ----------------- FORGOT PASSWORD ----------------- */
      if (forgotMode) {
        const res = await authApi.post("/confirm-email", {
          driverEmail: formData.email,
        });

        window.toast.info(res.data?.message || "Email confirmed!");
        setTempUserId(res.data?.data);
        setShowNewPasswordModal(true);
        return;
      }

      /* ----------------- REGISTER ----------------- */
      if (mode === "signup") {
        res = await authApi.post("/register", {
          userName: formData.name,
          userPassword: formData.password,
          userEmail: formData.email,
          userTele: formData.phone,
          userRole: "Driver",
          userAddress: formData.address,
          supervior: "",
        });

        alert(res.data.message || "Account created!");
        onClose();
        return;
      }

      /* ----------------- LOGIN ----------------- */
      res = await authApi.post("/login", {
        Email: formData.email,
        Password: formData.password,
      });

      const token = res.data?.data?.token;
      const user = res.data?.data?.user;

      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("userId", user?.userId || "");
        localStorage.setItem("userRole", user?.userRole || "");
        localStorage.setItem("userName", user?.userName || "");
        localStorage.setItem("userEmail", user?.userEmail || "");
      }

      if (user?.userRole === "Admin") navigate("/admin");
      if (user?.userRole === "Staff") navigate("/staff");
      if (user?.userRole === "Driver") navigate("/user/service");

      onClose();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data ||
        "Something went wrong.";

      alert(message);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setForgotMode(false);
    setFormData({ name: "", email: "", password: "", address: "", phone: "" });
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ============ MAIN AUTH MODAL ============ */}
      <div className="fixed inset-0 backdrop-blur-md bg-gray-100/20 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div className="text-2xl font-bold text-blue-600">VoltSwap</div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✖
            </button>
          </div>

          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              {forgotMode
                ? "Reset Password"
                : mode === "login"
                ? "Welcome Back"
                : "Create Account"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {forgotMode ? (
                <div>
                  <label className="block text-sm mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Enter your email"
                  />
                  <p className="text-red-500 text-sm">{errors.email}</p>
                </div>
              ) : (
                <>
                  {mode === "signup" && (
                    <div>
                      <label className="block text-sm mb-1">Full Name</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                      <p className="text-red-500 text-sm">{errors.name}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <p className="text-red-500 text-sm">{errors.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm mb-1">Password</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <p className="text-red-500 text-sm">{errors.password}</p>
                  </div>

                  {mode === "signup" && (
                    <>
                      <div>
                        <label className="block text-sm mb-1">Address</label>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                        <p className="text-red-500 text-sm">{errors.address}</p>
                      </div>

                      <div>
                        <label className="block text-sm mb-1">Phone</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                        <p className="text-red-500 text-sm">{errors.phone}</p>
                      </div>
                    </>
                  )}
                </>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                {forgotMode
                  ? "Send Reset Link"
                  : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
              </button>
            </form>

            {!forgotMode && mode === "login" && (
              <div className="mt-3 text-center">
                <button
                  onClick={() => setForgotMode(true)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {!forgotMode && (
              <div className="mt-4 text-center text-sm">
                {mode === "login"
                  ? "Don't have an account?"
                  : "Already have an account?"}
                <button
                  onClick={switchMode}
                  className="ml-2 text-blue-600 font-semibold"
                >
                  {mode === "login" ? "Sign Up" : "Sign In"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============ NEW PASSWORD MODAL ============ */}
      {showNewPasswordModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Enter New Password</h2>

            <input
              type="text"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewPasswordModal(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  try {
                    await authApi.post("/forgot-password", {
                      userPass: newPassword,
                      userId: tempUserId,
                    });

                    window.toast.success("Password updated! Please login.");
                    setShowNewPasswordModal(false);
                    setForgotMode(false);
                  } catch (err) {
                    const msg =
                      err.response?.data?.errors?.NewPass?.[0] ||
                      "Failed to change password!";
                    window.toast.error(msg);
                  }
                }}
                className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700"
              >
                Save Password
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AuthModal;
