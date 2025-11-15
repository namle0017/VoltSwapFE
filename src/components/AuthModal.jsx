import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import authApi from "../api/authApi";

const AuthModal = ({ isOpen, onClose, initialMode = "login" }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode);
  const [forgotMode, setForgotMode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setForgotMode(false);
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      let res;

      // 📨 Forgot Password
      if (forgotMode) {
        // eslint-disable-next-line no-undef
        res = await api.post("/forgot-password", {
          userEmail: formData.email,
        });
        window.toast.info("📩 Reset link sent to your email!");
        setForgotMode(false);
        return;
      }

      // 🆕 Register
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
        alert(res.data.message || "✅ Account created!");
      }
      // 🔐 Login
      else {
        res = await authApi.post("/login", {
          Email: formData.email,
          Password: formData.password,
        });

        // ✅ Lấy token và user từ response BE
        const token = res.data?.data?.token;
        const user = res.data?.data?.user;

        // ✅ Lưu token và thông tin user vào localStorage
        if (token) {
          localStorage.setItem("token", token);
          localStorage.setItem("userId", user?.userId || "");
          localStorage.setItem("userRole", user?.userRole || "");
          localStorage.setItem("userName", user?.userName || "");
          localStorage.setItem("userEmail", user?.userEmail || "");
        }

        // ✅ Điều hướng theo role
        if (user?.userRole === "Admin") {
          window.toast.success("Admin login successful! Redirecting...");
          navigate("/admin");
        }
        if (user?.userRole === "Staff") {
          window.toast.success("Staff login successful! Redirecting...");
          navigate("/staff");
        }
        if (user?.userRole === "Driver") {
          window.toast.success("Login Successfully");
          navigate("/user/service");
        }

        onClose();
      }

      onClose();
    } catch (err) {
      console.error("❌ Axios Error:", err);

      const message =
        err.response?.data?.message ||
        err.response?.data ||
        "Something went wrong. Please try again.";

      alert(message);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setForgotMode(false);
    setFormData({ name: "", email: "", password: "", address: "", phone: "" });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-gray-100/20 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {forgotMode ? (
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Enter your email"
                />
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
                      required
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
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
                        required
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border rounded-lg"
                      />
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

          {/* Forgot password link */}
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

          {/* Switch mode */}
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

          {/* Back to login */}
          {forgotMode && (
            <div className="mt-3 text-center">
              <button
                onClick={() => setForgotMode(false)}
                className="text-sm text-gray-500 hover:underline"
              >
                ← Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;