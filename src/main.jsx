import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./shims/alert-to-toast.js";
import ConfirmHost from "./components/Confirm.jsx";
import App from "./App.jsx";
import "leaflet/dist/leaflet.css";
import ToastHost from "./components/Toast.jsx";
import './styles/ui.css'
import "bootstrap-icons/font/bootstrap-icons.css";


createRoot(document.getElementById("root")).render(
  //<StrictMode>
  <>
    <App />
    <ToastHost />
    <ConfirmHost />
  </>
  //</StrictMode>
);
