const DEFAULTS = { enabled: true, rate: null, lastUpdated: null, customRate: null };
const RATE_URL = "https://open.er-api.com/v6/latest/AED";

async function getSettings() {
  return { ...DEFAULTS, ...(await chrome.storage.local.get(DEFAULTS)) };
}

async function refreshRate() {
  const response = await fetch(RATE_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("Rate service is unavailable");
  const payload = await response.json();
  const rate = payload?.rates?.INR;
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("INR rate missing from response");
  await chrome.storage.local.set({ rate, lastUpdated: new Date().toISOString() });
  return rate;
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get();
  await chrome.storage.local.set({ ...DEFAULTS, ...current });
  chrome.alarms.create("refresh-aed-inr-rate", { periodInMinutes: 720 });
  try { await refreshRate(); } catch (error) { console.warn("Could not refresh AED/INR rate", error); }
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("refresh-aed-inr-rate", { periodInMinutes: 720 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "refresh-aed-inr-rate") refreshRate().catch(console.warn);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "get-settings") {
    getSettings().then(sendResponse);
    return true;
  }
  if (message.type === "refresh-rate") {
    refreshRate().then((rate) => sendResponse({ ok: true, rate })).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});
