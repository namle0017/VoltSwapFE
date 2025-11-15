// src/layouts/MainLayout.jsx
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Outlet } from "react-router-dom";

const MainLayout = () => {
  return (
    <div className="App">
      <Navbar />
      <main>
        <Outlet /> {/* Page con sẽ render ở đây */}
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
