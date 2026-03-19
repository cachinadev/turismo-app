const fs = require("fs");
const path = require("path");

const DEFAULT_HOLIDAYS_FILE = path.join(__dirname, "holidays.pe.json");
const VALID_IMPACTS = new Set(["normal", "bajo", "medio", "alto", "muy_alto"]);

let cachedFilePath = null;
let cachedCalendar = Object.freeze({});

function normalizeDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : null;
}

function normalizeHolidayEntry(raw) {
  if (!raw || typeof raw !== "object") return null;

  const name = String(raw.name || "").trim();
  const impact = String(raw.impact || "normal").trim().toLowerCase();

  if (!name || !VALID_IMPACTS.has(impact)) return null;
  return { name, impact };
}

function normalizeHolidayCalendar(rawCalendar) {
  if (!rawCalendar || typeof rawCalendar !== "object" || Array.isArray(rawCalendar)) {
    return Object.freeze({});
  }

  const normalized = {};
  for (const [dateKey, entry] of Object.entries(rawCalendar)) {
    const safeDateKey = normalizeDateKey(dateKey);
    const safeEntry = normalizeHolidayEntry(entry);
    if (!safeDateKey || !safeEntry) continue;
    normalized[safeDateKey] = safeEntry;
  }

  return Object.freeze(normalized);
}

function resolveConfiguredFile() {
  const configured = String(process.env.HOLIDAYS_FILE || "").trim();
  if (!configured) return DEFAULT_HOLIDAYS_FILE;
  return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
}

function loadHolidayCalendar(forceReload = false) {
  const filePath = resolveConfiguredFile();
  if (!forceReload && cachedFilePath === filePath) return cachedCalendar;

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    cachedCalendar = normalizeHolidayCalendar(parsed);
    cachedFilePath = filePath;
  } catch (error) {
    cachedCalendar = Object.freeze({});
    cachedFilePath = filePath;
    console.warn(`[holidays] Failed to load holiday calendar from ${filePath}: ${error.message}`);
  }

  return cachedCalendar;
}

function getHolidayInfo(dateKey) {
  const safeDateKey = normalizeDateKey(dateKey);
  if (!safeDateKey) return null;
  const calendar = loadHolidayCalendar();
  return calendar[safeDateKey] || null;
}

function getHolidayFactor(dateKey, scale, opts = {}) {
  const capMax = typeof opts.capMax === "number" ? opts.capMax : scale.muy_alto;
  const info = getHolidayInfo(dateKey);

  if (!info) {
    return { FF: scale.normal, isHoliday: false, impact: "normal", name: null };
  }

  const rawFF = scale[info.impact] ?? scale.normal;
  return {
    FF: Math.min(rawFF, capMax),
    isHoliday: true,
    impact: info.impact,
    name: info.name,
  };
}

module.exports = {
  loadHolidayCalendar,
  getHolidayInfo,
  getHolidayFactor,
};
