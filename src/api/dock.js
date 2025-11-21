import api from "./api";
import { ROUTES } from "./routes";

export async function dockBattery({
  stationId,
  staffId,
  pillarId,
  batteryInId,
  slotInId,
}) {
  const body = { stationId, staffId, pillarId, batteryInId, slotInId };
  console.log("🛰️ POST Dock →", ROUTES.DOCK, body);
  const { data } = await api.post(ROUTES.DOCK, body);
  return data;
}

export async function undockBattery({
  stationId,
  staffId,
  pillarId,
  batteryOutId,
  slotOutId,
}) {
  const body = { stationId, staffId, pillarId, batteryOutId, slotOutId };
  console.log("🛰️ POST Undock →", ROUTES.UNDOCK, body);
  const { data } = await api.post(ROUTES.UNDOCK, body);
  return data;
}

export async function dockUndockCombo({
  stationId,
  staffId,
  pillarId,
  batteryInId,
  slotInId,
  batteryOutId,
  slotOutId,
}) {
  const body = {
    stationId,
    staffId,
    pillarId,
    batteryInId,
    slotInId,
    batteryOutId,
    slotOutId,
  };
  console.log("🛰️ POST Combo →", ROUTES.DOCK_UNDOCK_COMBO, body);
  const { data } = await api.post(ROUTES.DOCK_UNDOCK_COMBO, body);
  return data;
}
