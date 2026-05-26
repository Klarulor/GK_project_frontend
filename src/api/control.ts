import { apiFetch } from "./client";

export type ElectricityPrice = {
  country: "ee" | "lv" | "lt" | "fi";
  timestamp: number;
  utcTime: string;
  localTime: string;
  priceEurMwh: number;
  priceEurKwh: number;
};

export type Device = {
  id: number;
  uid: string;
  name: string;
  description: string;
  callbackUrl: string;
  connectionType: string;
  priceLimit: number;
  priceLocation: "ee" | "lv" | "lt" | "fi";
  isEnabled: boolean;
  powerKw: number;
  isCritical: boolean;
  stateUpdatedAt: string | null;
  overrideState: 0 | 1 | 2;
};

export type DeviceDraft = {
  name: string;
  description: string;
  callbackUrl: string;
  priceLimit: number;
  priceLocation: "ee" | "lv" | "lt" | "fi";
  powerKw: number;
  isCritical: boolean;
};

export type DeviceCommand = {
  id: number;
  targetState: boolean;
  source: string;
  priceEurMwh: number | null;
  message: string | null;
  isSuccess: boolean;
  createdAt: string;
};

export type SavingsReport = {
  fixedCost: number;
  actualCost: number;
  saved: number;
  savedPercent: number;
  rows: Array<{
    deviceUid: string;
    deviceName: string;
    localTime: string;
    fixedCost: number;
    actualCost: number;
    saved: number;
    targetState: boolean;
  }>;
};

export type AppUser = {
  user_id: number;
  email: string;
  username: string;
  role: number;
  isActive: boolean;
  fixedPriceEurKwh: number;
  vacationMode: boolean;
};

export type UserDraft = {
  email: string;
  username: string;
  password: string;
};

export type Dashboard = {
  user: {
    username: string;
    role: number;
    fixedPriceEurKwh: number;
    vacationMode: boolean;
  };
  currentPrice: ElectricityPrice;
  forecast: ElectricityPrice[];
  devices: Device[];
  decisions: Array<{
    uid: string;
    deviceName: string;
    targetState: boolean;
    reason: string;
    priceEurMwh: number;
    priceSource: "fixed" | "exchange";
  }>;
  savings: SavingsReport;
  plannedSavings: SavingsReport;
};

export function getDashboard() {
  return apiFetch<Dashboard>("/v1/control");
}

export function createDevice(device: DeviceDraft) {
  return apiFetch<Device>("/v1/devices", {
    method: "POST",
    body: JSON.stringify(device),
  });
}

export function updateDevice(uid: string, patch: Partial<DeviceDraft> & {overrideValue?: boolean | null}) {
  const normalizedPatch = {
    ...patch,
    isCritical: typeof patch.isCritical === "number" ? patch.isCritical === 1 : patch.isCritical,
    overrideValue:
      typeof patch.overrideValue === "number"
        ? patch.overrideValue === 1
        : patch.overrideValue,
  };

  return apiFetch<Device>(`/v1/devices/${uid}`, {
    method: "PATCH",
    body: JSON.stringify(normalizedPatch),
  });
}

export function deleteDevice(uid: string) {
  return apiFetch<void>(`/v1/devices/${uid}`, {
    method: "DELETE",
  });
}

export function sendDeviceCommand(uid: string, targetState: boolean) {
  return apiFetch<Device>(`/v1/devices/${uid}/command`, {
    method: "POST",
    body: JSON.stringify({targetState, manualOverride: true}),
  });
}

export function clearDeviceOverride(uid: string) {
  return apiFetch<Device>(`/v1/devices/${uid}/override/clear`, {
    method: "POST",
  });
}

export function testDevice(uid: string) {
  return apiFetch<{ok: boolean}>(`/v1/devices/${uid}/test`, {
    method: "POST",
  });
}

export function getDeviceCommands(uid: string) {
  return apiFetch<DeviceCommand[]>(`/v1/devices/${uid}/commands`);
}

export function runAutomation() {
  return apiFetch<{results: Array<{uid: string; targetState: boolean; reason: string; priceEurMwh: number; priceSource: "fixed" | "exchange"; changed: boolean; error?: string}>}>(
    "/v1/control/automation/run",
    {method: "POST"},
  );
}

export function updatePreferences(fixedPriceEurKwh: number, vacationMode: boolean | number) {
  return apiFetch("/v1/users/me/preferences", {
    method: "PATCH",
    body: JSON.stringify({fixedPriceEurKwh, vacationMode: (vacationMode == 1 ? true : false)}),
  });
}

export function getSavingsReport(period: "day" | "week" | "month") {
  return apiFetch<SavingsReport>(`/v1/control/savings?period=${period}`);
}

export function getUsers() {
  return apiFetch<AppUser[]>("/v1/users");
}

export function createUser(user: UserDraft) {
  return apiFetch<AppUser>("/v1/users", {
    method: "POST",
    body: JSON.stringify(user),
  });
}

export function updateUser(userId: number, patch: Partial<UserDraft> & {isActive?: boolean}) {
  return apiFetch<AppUser>(`/v1/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deactivateUser(userId: number) {
  return apiFetch<AppUser>(`/v1/users/${userId}/deactivate`, {
    method: "POST",
  });
}

export function deleteUser(userId: number) {
  return apiFetch<void>(`/v1/users/${userId}/delete`, {
    method: "POST",
  });
}
