// src/App.jsx
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";

/** Layouts */
import MainLayout from "@/layouts/MainLayout";
import AdminLayout from "@/layouts/AdminLayout";
import StaffLayout from "@/layouts/StaffLayout";
import UserLayout from "@/layouts/UserLayout";

/** Route guard */
import ProtectedRoute from "@/components/ProtectedRoute";

/** Public pages */
import Home from "@/pages/Home";
import AboutPage from "@/pages/AboutPage";
import ServicesPage from "@/pages/ServicesPage";
import BenefitsPage from "@/pages/BenefitsPage";
import ContactPage from "@/pages/ContactPage";
import StationSwap from "@/pages/StationSwap";

/** Admin pages */
import AdminPage from "@/pages/admin/AdminPage";
import CustomerManagement from "@/pages/admin/CustomerManagement";
import ComplaintsManagement from "@/pages/admin/ComplaintsManagement";
import Reports from "@/pages/admin/Reports";
import Employees from "@/pages/admin/Employees";
import Stations from "@/pages/admin/Stations";
import Subscription from "@/pages/admin/Subscription";
import PaymentInfo from "@/pages/admin/PaymentInfo";
/** Staff pages */
/** Staff pages */
import Overview from "@/pages/staff/Overview";
import Inventory from "@/pages/staff/Inventory";
import ManualAssist from "@/pages/staff/ManualAssist";
import BatterySwap from "@/pages/staff/BatterySwap";
import Booking from "@/pages/staff/Booking";
import AdminRequest from "@/pages/staff/AdminRequest";
import CustomerSupport from "@/pages/staff/CustomerSupport";
import Ping from "@/pages/staff/Ping";
import APITest from "@/pages/staff/APITest";
import BatteryManager from "@/pages/staff/BatteryManager";
import StaffAccount from "@/pages/staff/StaffAccount"; // <-- THÊM DÒNG NÀY


/** User pages */
import Service from "@/pages/user/Service";
import RegisterService from "@/pages/user/RegisterService";
import ChangeService from "@/pages/user/ChangeService";
import Station from "@/pages/user/Station";
import Transaction from "@/pages/user/Transaction";
import Vehicle from "@/pages/user/Vehicle";
import Support from "@/pages/user/Support";
import Profile from "@/pages/user/Profile";
import SuggestService from "@/pages/user/SuggestService";
import "leaflet/dist/leaflet.css";

const router = createBrowserRouter([
  /** Public site */
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "about", element: <AboutPage /> },
      { path: "services", element: <ServicesPage /> },
      { path: "benefits", element: <BenefitsPage /> },
      { path: "contact", element: <ContactPage /> },
    ],
  },
  { path: "stations", element: <StationSwap /> },

  /** User app (after login as Driver/Customer) */
  {
    path: "/user",
    element: <UserLayout />,
    children: [
      { index: true, element: <Navigate to="service" replace /> },
      { path: "service", element: <Service /> },
      { path: "service/register", element: <RegisterService /> },
      { path: "service/change", element: <ChangeService /> },
      { path: "vehicle", element: <Vehicle /> },
      { path: "station", element: <Station /> },
      { path: "transaction", element: <Transaction /> },
      { path: "support", element: <Support /> },
      { path: "profile", element: <Profile /> },
      { path: "service/suggest", element: <SuggestService /> },
    ],
  },

  /** Staff console (guarded) */
  {
    element: <ProtectedRoute requiredRole="Staff" />,
    children: [
      {
        path: "/staff",
        element: <StaffLayout />,
        children: [
          { index: true, element: <Navigate to="overview" replace /> },
          { path: "overview", element: <Overview /> },
          { path: "inventory", element: <Inventory /> },
          { path: "assist", element: <ManualAssist /> },
          { path: "swap", element: <BatterySwap /> },
          { path: "booking", element: <Booking /> },
          { path: "admin-request", element: <AdminRequest /> },
          { path: "support", element: <CustomerSupport /> },
          { path: "ping", element: <Ping /> },
          { path: "api-test", element: <APITest /> },

          /* NEW: Battery Manager */
          { path: "battery-mgmt", element: <BatteryManager /> },

          /* NEW: Staff account / profile */
          { path: "account", element: <StaffAccount /> }, // <-- THÊM Ở ĐÂY
        ],
      },
    ],
  },


  /** Admin portal (guarded) */
  {
    // element: <ProtectedRoute requiredRole="Admin" />,
    children: [
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminPage /> },
          { path: "customers", element: <CustomerManagement /> },
          { path: "complaints", element: <ComplaintsManagement /> },
          { path: "reports", element: <Reports /> },
          { path: "employees", element: <Employees /> },
          { path: "stations", element: <Stations /> },
          { path: "subscriptions", element: <Subscription /> },
          { path: "payments", element: <PaymentInfo /> },
          // { path: "transactions", element: <TransactionManagement /> }, // add later if needed
        ],
      },
    ],
  },

  /** Fallback */
  { path: "*", element: <Navigate to="/" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}