# AED → INR Companion

A Chrome extension that shows an INR estimate beside UAE-dirham amounts on any webpage. It recognizes `AED`, `د.إ`, `Dh`, and `Dhs`, as well as UAE-dirham icon markup used by LuLu UAE; for example, `AED 100` becomes `AED 100 (≈₹2,250)`.

## Install locally

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Select **Load unpacked** and choose this folder.

The popup lets you switch the feature off, refresh the cached exchange rate, or use a custom rate. The automatic rate is fetched from ExchangeRate-API and refreshed every 12 hours; it may be updated by the provider once per day.

## Test

```sh
node --test
```
