(function (root) {
  const AMOUNT = "(?:\\d{1,3}(?:,\\d{2,3})+|\\d+)(?:\\.\\d+)?";
  // UAE Dirham is commonly written as AED, د.إ, Dh, or Dhs on websites.
  // U+20C3 is the new UAE Dirham sign. Some sites use a private-font version
  // of the sign, but keep AED or د.إ as their accessible text.
  const PREFIX_CURRENCY = "(?:\\bAED|د\\.إ|⃃|\\bDHS?)";
  const SUFFIX_CURRENCY = "(?:AED\\b|د\\.إ|⃃|DHS?\\b)";
  const CURRENCY_ONLY = /^(?:AED|د\.إ|⃃|DH|DHS)$/iu;
  const PREFIX = new RegExp(PREFIX_CURRENCY + "\\s*(?:[:=]\\s*)?(" + AMOUNT + ")\\b", "giu");
  const SUFFIX = new RegExp("\\b(" + AMOUNT + ")\\s*" + SUFFIX_CURRENCY, "giu");
  const WHOLE_AMOUNT = new RegExp("^" + PREFIX_CURRENCY + "\\s*(" + AMOUNT + ")$", "iu");

  function parseAmount(value) {
    return Number.parseFloat(value.replaceAll(",", ""));
  }

  function formatInr(amount, rate) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(amount * rate);
  }

  function extractAedAmount(text) {
    const match = text.replaceAll(" ", " ").trim().match(WHOLE_AMOUNT);
    return match ? parseAmount(match[1]) : null;
  }

  function isAedCurrency(text) {
    return CURRENCY_ONLY.test(text.replaceAll(" ", " ").trim());
  }

  function decorateText(text, rate) {
    if (!Number.isFinite(rate) || rate <= 0) return text;
    const appendEstimate = (match, amount) => {
      const value = parseAmount(amount);
      return Number.isFinite(value) ? `${match} (≈${formatInr(value, rate)})` : match;
    };
    return text
      .replace(PREFIX, appendEstimate)
      .replace(SUFFIX, appendEstimate);
  }

  const api = { decorateText, extractAedAmount, formatInr, isAedCurrency, parseAmount };
  if (typeof module !== "undefined") module.exports = api;
  root.AedInrConverter = api;
})(typeof globalThis === "undefined" ? this : globalThis);
