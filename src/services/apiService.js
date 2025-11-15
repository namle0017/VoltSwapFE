// src/services/apiService.js
import { manualAssist as manualAssistOneCall } from "../api/batterySwapApi";

// ✅ Chỉ giữ đúng 1 API thật: Manual Assist
export const manualSwapAPI = {
  // tên cũ FE đang dùng
  staffManualSwapFlexible: (payload) => manualAssistOneCall(payload),

  // giữ stub để trang khác không vỡ (nếu có gọi)
  getHistory: async () => [],
  getStationSlots: async () => [],
  listReadySlots: async () => [],
};

// stub nhẹ cho các trang khác nếu bạn vẫn truy cập
export const dockConsoleAPI = {
  dockBattery: async () => ({
    ok: false,
    error: "Dock API not implemented in this build",
  }),
  undockBattery: async () => ({
    ok: false,
    error: "Undock API not implemented in this build",
  }),
};
export const adminRequestsAPI = {
  fetchAdminRequests: async () => [],
  createAdminRequest: async () => ({ id: Date.now(), status: "Pending" }),
};

export default { manualSwapAPI, dockConsoleAPI, adminRequestsAPI };
