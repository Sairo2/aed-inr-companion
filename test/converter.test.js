const test = require("node:test");
const assert = require("node:assert/strict");
const { decorateText, isAedCurrency, parseAmount } = require("../converter.js");

test("adds INR after prefix and suffix AED amounts", () => {
  assert.equal(decorateText("AED 100 and 1,250.50 AED", 22.5), "AED 100 (≈₹2,250.00) and 1,250.50 AED (≈₹28,136.25)");
});
test("recognizes common UAE dirham symbols", () => {
  assert.equal(decorateText("د.إ 100, Dhs 20", 22.5), "د.إ 100 (≈₹2,250.00), Dhs 20 (≈₹450.00)");
});
test("recognizes Amazon's no-space accessible price text", () => {
  assert.equal(decorateText("AED21.90", 22.5), "AED21.90 (≈₹492.75)");
  assert.equal(require("../converter.js").extractAedAmount("AED21.90"), 21.9);
});
test("recognizes the new UAE dirham sign", () => {
  assert.equal(isAedCurrency("⃃"), true);
  assert.equal(decorateText("⃃ 175", 22.5), "⃃ 175 (≈₹3,937.50)");
});
test("keeps text unchanged for invalid rates", () => {
  assert.equal(decorateText("AED 100", null), "AED 100");
});
test("parses formatted amounts", () => {
  assert.equal(parseAmount("1,250.50"), 1250.5);
});
