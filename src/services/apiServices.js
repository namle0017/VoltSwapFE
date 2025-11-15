import * as apiService from "./apiService";

// Re-export to preserve compatibility with existing imports in pages
export const manualSwapAPI = apiService.manualSwapAPI;
export const dockConsoleAPI = apiService.dockConsoleAPI || {};
export const adminRequestsAPI = apiService.adminRequestsAPI || {};

export default apiService;
