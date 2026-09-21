export const VALID_LICENSE_KEYS = [
  "P4ssw0rd_*",
  "akusukambg",
  "sayaakanlawan",
  "buahlil",
  "hidupjokowi",
];

const LICENSE_STORAGE_KEY = "bigma_baik_license_active";
const FIRST_VISIT_KEY = "bigma_baik_first_visit_shown";

export function isLicenseActive(): boolean {
  try {
    return localStorage.getItem(LICENSE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function verifyLicenseKey(key: string): boolean {
  const cleanKey = key.trim();
  return VALID_LICENSE_KEYS.includes(cleanKey);
}

export function activateLicense(key: string): boolean {
  if (verifyLicenseKey(key)) {
    try {
      localStorage.setItem(LICENSE_STORAGE_KEY, "true");
      localStorage.setItem("bigma_baik_license_activated_at", new Date().toISOString());
    } catch (e) {
      console.error("Failed to persist license activation:", e);
    }
    return true;
  }
  return false;
}

export function hasShownFirstVisit(): boolean {
  try {
    return localStorage.getItem(FIRST_VISIT_KEY) === "true";
  } catch {
    return false;
  }
}

export function markFirstVisitShown(): void {
  try {
    localStorage.setItem(FIRST_VISIT_KEY, "true");
  } catch (e) {
    console.error("Failed to mark first visit:", e);
  }
}
