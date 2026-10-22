# Penny · Expense Tracker

Track spending and income month by month, set a budget, and see where your money goes with a category donut and daily bar chart. Everything stays in your browser.

**Live:** https://cryoviper.github.io/expense-tracker/

## Features

- Add expenses and income with category, date and note, with input validation
- Month switcher, with spending compared to last month
- Monthly budget with a progress bar that turns amber at 80% and red when you go over
- Category donut chart and daily spending bars, drawn with plain SVG (no chart library)
- Transactions grouped by day, with search and category filter
- Currency switcher (₹, $, €, £) using `Intl.NumberFormat`
- Export everything to CSV
- Sample data on first visit, saved to `localStorage`; light and dark mode

## Tech

- Vanilla JavaScript (ES modules), HTML, CSS, SVG. No libraries, no build step.
- Money stored as **integer minor units** (paise/cents) to avoid floating point errors like `0.1 + 0.2`
- CSV export escapes quotes properly

## Run locally

```bash
git clone https://github.com/cryoviper/expense-tracker.git
cd expense-tracker
npx serve .
```

## What I learned

- Why you should never store money as floats
- Drawing charts with SVG math (`stroke-dasharray` for the donut, scaled rects for bars)
- Formatting currency and dates for different locales with `Intl`

---

Built by [Praveen Sinwar](https://github.com/cryoviper).
