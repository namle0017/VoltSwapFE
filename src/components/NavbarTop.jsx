import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function NavbarTop() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState({ name: "", email: "" });

  useEffect(() => {
    const loadUser = () => {
      const name = localStorage.getItem("userName");
      const email = localStorage.getItem("userEmail");

      setUser({
        name: name || "User",
        email: email || "No email",
      });
    };

    // Load lần đầu
    loadUser();

    // Lắng nghe sự kiện từ Profile
    window.addEventListener("user-updated", loadUser);

    return () => window.removeEventListener("user-updated", loadUser);
  }, []);
  const handleLogout = () => {
    localStorage.clear();
    alert("You have logged out!");
    navigate("/");
  };

  const goToPersonalInfo = () => {
    setMenuOpen(false);
    navigate("/user/profile");
  };

  const goToPortal = () => {
    setMenuOpen(false);
    navigate("/user/station");
  };

  return (
    <nav className="bg-white shadow-md px-6 py-3 flex justify-between items-center border-b">
      {/* 🔋 Logo */}
      <div className="text-3xl font-lobster font-bold bg-gradient-to-r from-green-400 via-blue-400 to-blue-600 bg-clip-text text-transparent drop-shadow-md">
        VoltSwap
      </div>

      {/* User Menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-white font-bold px-5 py-2 rounded-lg transition-all"
          style={{
            backgroundColor: "#2f66ff",
          }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "#2758d8")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "#2f66ff")}
        >
          <i className="bi bi-person-circle mr-2"></i>
          {user.name}
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            {/* Header User Info */}
            <div className="px-4 py-3 border-b">
              <p className="text-base font-bold text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>

            {/* Menu Items */}
            <ul className="py-2">
              <li>
                <button
                  onClick={goToPersonalInfo}
                  className="flex items-center gap-3 w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                >
                  <i className="bi bi-person-lines-fill text-indigo-600 text-lg"></i>
                  <span>Personal Information</span>
                </button>
              </li>

              <li>
                <button
                  onClick={goToPortal}
                  className="flex items-center gap-3 w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                >
                  <i className="bi bi-box-seam text-blue-600 text-lg"></i>
                  <span>Portal</span>
                </button>
              </li>
            </ul>

            {/* Logout */}
            <div className="border-t">
              <button
                onClick={handleLogout}
                className="w-full text-left text-red-600 hover:bg-red-50 font-semibold px-4 py-2"
              >
                <i className="bi bi-box-arrow-right mr-2"></i>
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
