const elements = {
  enabled: document.querySelector("#enabled"), rate: document.querySelector("#rate"), updated: document.querySelector("#updated"),
  refresh: document.querySelector("#refresh"), useCustom: document.querySelector("#use-custom"), customRate: document.querySelector("#custom-rate"), status: document.querySelector("#status")
};
let settings;
const format = (rate) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 4 }).format(rate);

function render() {
  const effectiveRate = settings.customRate ?? settings.rate;
  elements.enabled.checked = settings.enabled;
  elements.rate.textContent = effectiveRate ? `1 AED = ${format(effectiveRate)}` : "Rate unavailable";
  elements.updated.textContent = settings.customRate ? "Using your custom rate" : settings.lastUpdated ? `Updated ${new Date(settings.lastUpdated).toLocaleString()}` : "Refresh to get a rate";
  elements.useCustom.checked = Boolean(settings.customRate);
  elements.customRate.disabled = !settings.customRate;
  elements.customRate.value = settings.customRate ?? "";
}

async function save(values) { settings = { ...settings, ...values }; await chrome.storage.local.set(values); render(); }
chrome.runtime.sendMessage({ type: "get-settings" }, (received) => { settings = received; render(); });
elements.enabled.addEventListener("change", () => save({ enabled: elements.enabled.checked }));
elements.useCustom.addEventListener("change", () => save({ customRate: elements.useCustom.checked ? (settings.rate ?? 1) : null }));
elements.customRate.addEventListener("change", () => {
  const rate = Number(elements.customRate.value);
  if (Number.isFinite(rate) && rate > 0) save({ customRate: rate });
});
elements.refresh.addEventListener("click", () => {
  elements.status.textContent = ""; elements.refresh.disabled = true; elements.refresh.textContent = "Refreshing…";
  chrome.runtime.sendMessage({ type: "refresh-rate" }, (result) => {
    elements.refresh.disabled = false; elements.refresh.textContent = "Refresh rate";
    if (!result?.ok) { elements.status.textContent = result?.error ?? "Could not refresh the rate"; return; }
    settings.rate = result.rate; settings.lastUpdated = new Date().toISOString(); render();
  });
});
