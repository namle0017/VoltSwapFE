// src/api/complaintsApi.js
import { batteryApi } from "./batterySwapApi";

const GET_REPORTS = "/Report/get-report";
const GET_STAFF_LIST = "/api/Report/get_staff-list";
const ASSIGN_STAFF = "/api/Report/assign-staff";

export const fetchComplaints = async () => {
  const res = await batteryApi.get(GET_REPORTS);
  const raw = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
  return raw;
};

export const fetchStaffList = async () => {
  const res = await batteryApi.get(GET_STAFF_LIST);
  const raw = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
  // Chuẩn hoá về { staffId, staffName, stationName, stationId, phoneNumber }
  return raw.map((s) => ({
    staffId: s.staffId ?? s.userStaffId ?? s.id,
    staffName: s.staffName ?? s.name,
    stationName: s.stationName ?? s.station?.name,
    stationId: s.stationId ?? s.station?.id,
    phoneNumber: s.phoneNumber ?? s.phone,
  }));
};

export const assignStaff = async ({ reportId, staffId }) => {
  const payload = { reportId, staffId };
  const res = await batteryApi.post(ASSIGN_STAFF, payload);
  // BE trả về object staff đã assign
  const data = res?.data?.data ?? res?.data ?? {};
  return {
    staffId: data.staffId,
    staffName: data.staffName,
    stationName: data.stationName,
    stationId: data.stationId,
    phoneNumber: data.phoneNumber,
  };
};

export default { fetchComplaints, fetchStaffList, assignStaff };
