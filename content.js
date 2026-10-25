(() => {
  const renderedNodes = new Map();
  const amazonEstimates = new Map();
  const splitPriceEstimates = new Map();
  const dirhamIconEstimates = new Map();
  let settings = { enabled: true, rate: null, customRate: null };
  let scanTimer;

  function activeRate() {
    return settings.customRate ?? settings.rate;
  }

  function shouldIgnore(node) {
    for (let element = node.parentElement; element; element = element.parentElement) {
      if (["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "OPTION"].includes(element.tagName) || element.isContentEditable) return true;
    }
    return false;
  }

  function process(node) {
    if (node.nodeType !== Node.TEXT_NODE || shouldIgnore(node)) return;
    const current = node.data;
    if (renderedNodes.get(node)?.rendered === current) return;
    const source = current;
    const rendered = settings.enabled ? AedInrConverter.decorateText(source, activeRate()) : source;
    if (rendered !== source) node.data = rendered;
    renderedNodes.set(node, { source, rendered });
  }

  function renderAmazonPrices(root) {
    if (!root?.querySelectorAll || !settings.enabled || !Number.isFinite(activeRate())) return;
    const prices = root.matches?.(".a-price") ? [root] : [...root.querySelectorAll(".a-price")];
    for (const price of prices) {
      const source = price.querySelector(".a-offscreen")?.textContent ?? "";
      const amount = AedInrConverter.extractAedAmount(source);
      if (!Number.isFinite(amount)) continue;
      const estimate = ` (≈${AedInrConverter.formatInr(amount, activeRate())})`;
      let state = amazonEstimates.get(price);
      if (!state || !state.node.isConnected) {
        const node = document.createElement("span");
        node.className = "aed-inr-estimate";
        node.dataset.aedInrEstimate = "true";
        price.insertAdjacentElement("afterend", node);
        state = { node };
        amazonEstimates.set(price, state);
      }
      state.node.textContent = estimate;
    }
  }

  function nextSplitAmount(currencyNode) {
    let container = currencyNode.parentElement;
    for (let level = 0; container && level < 3; level += 1, container = container.parentElement) {
      if (container.textContent.length > 64) continue;
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      const nodes = [];
      let node;
      while ((node = walker.nextNode())) nodes.push(node);
      const start = nodes.indexOf(currencyNode);
      for (const candidate of nodes.slice(start + 1, start + 4)) {
        const amount = AedInrConverter.parseAmount(candidate.data.trim());
        if (Number.isFinite(amount) && /^\s*(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d+)?\s*$/.test(candidate.data)) return { node: candidate, amount };
      }
    }
    return null;
  }

  function renderSplitCurrencyPrices(root) {
    if (!root || !settings.enabled || !Number.isFinite(activeRate())) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let currencyNode;
    while ((currencyNode = walker.nextNode())) {
      if (shouldIgnore(currencyNode) || !AedInrConverter.isAedCurrency(currencyNode.data)) continue;
      const match = nextSplitAmount(currencyNode);
      if (!match) continue;
      const estimate = ` (≈${AedInrConverter.formatInr(match.amount, activeRate())})`;
      let state = splitPriceEstimates.get(match.node);
      if (!state || !state.node.isConnected) {
        const node = document.createElement("span");
        node.className = "aed-inr-estimate";
        node.dataset.aedInrEstimate = "true";
        match.node.parentElement.insertAdjacentElement("afterend", node);
        state = { node };
        splitPriceEstimates.set(match.node, state);
      }
      state.node.textContent = estimate;
    }
  }

  function renderDirhamIconPrices(root) {
    if (!root?.querySelectorAll || !settings.enabled || !Number.isFinite(activeRate())) return;
    const icons = root.matches?.(".pz-icon-dirham-currency") ? [root] : [...root.querySelectorAll(".pz-icon-dirham-currency")];
    for (const icon of icons) {
      // LuLu renders the currency solely as an icon, so there is no AED text
      // for a text-node scanner to recognise.
      const priceElement = icon.parentElement?.querySelector('[data-testid="price"], [data-testid="product-price"]');
      const rawPrice = priceElement?.textContent?.trim() ?? "";
      if (!/^\d{1,3}(?:,\d{2,3})*(?:\.\d+)?$/.test(rawPrice)) continue;
      const amount = AedInrConverter.parseAmount(rawPrice);
      if (!Number.isFinite(amount)) continue;
      let state = dirhamIconEstimates.get(priceElement);
      if (!state || !state.node.isConnected) {
        const node = document.createElement("span");
        node.className = "aed-inr-estimate";
        node.dataset.aedInrEstimate = "true";
        priceElement.insertAdjacentElement("afterend", node);
        state = { node };
        dirhamIconEstimates.set(priceElement, state);
      }
      state.node.textContent = ` (≈${AedInrConverter.formatInr(amount, activeRate())})`;
    }
  }

  function scan(root = document.body) {
    if (!root || !settings.enabled || !Number.isFinite(activeRate())) return;
    renderAmazonPrices(root);
    renderSplitCurrencyPrices(root);
    renderDirhamIconPrices(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) process(node);
  }

  function rerender() {
    for (const [node, state] of renderedNodes) {
      if (!node.isConnected) { renderedNodes.delete(node); continue; }
      node.data = state.source;
      renderedNodes.delete(node);
    }
    for (const [price, state] of amazonEstimates) {
      state.node.remove();
      amazonEstimates.delete(price);
    }
    for (const [amountNode, state] of splitPriceEstimates) {
      state.node.remove();
      splitPriceEstimates.delete(amountNode);
    }
    for (const [priceElement, state] of dirhamIconEstimates) {
      state.node.remove();
      dirhamIconEstimates.delete(priceElement);
    }
    scan();
  }

  const observer = new MutationObserver((records) => {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
      records.forEach((record) => {
        if (record.type === "characterData") process(record.target);
        record.addedNodes.forEach((node) => scan(node.nodeType === Node.TEXT_NODE ? node.parentElement : node));
      });
    }, 80);
  });

  chrome.storage.local.get(settings, (stored) => {
    settings = { ...settings, ...stored };
    scan();
    observer.observe(document.documentElement, { childList: true, characterData: true, subtree: true });
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    for (const [key, change] of Object.entries(changes)) settings[key] = change.newValue;
    rerender();
  });
})();
