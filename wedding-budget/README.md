# Bryllupsbudget — Bryggeri Skovlyst

A small budget sandbox for pricing a wedding at Bryggeri Skovlyst against their
party price list (pr. 1/1-2026). Built to answer one question in particular:

> Is the **øl/vin/læske ad libitum** package cheaper than just paying
> **efter forbrug**?

## Running it

```bash
npm install
```

```bash
npm run dev
```

Everything is client-side; scenarios are saved in `localStorage`.

## What it does

- **Guests** — adults, children 2–12 (half price) and under-2s (free). Every
  per-person price is multiplied by *billable* guests, not headcount.
- **Venue** — the four rooms with their flat rental prices, validated against
  the guest count (min/max capacity, and the 25-adult minimum for ordering from
  the party menu).
- **Food** — the main meal is a single choice (the menus are alternatives to
  each other); reception, snacks, sweets and natmad stack on top. Overlapping
  picks (e.g. "blandede snacks" plus loose peanuts) raise a soft warning.
- **Drinks** — the core feature. See below.
- **Scenarios** — duplicate the current setup and tweak it to compare two or
  three versions side by side in the header.

## The drinks comparison

Both models are always computed, whichever one you've selected for the budget.

**Efter forbrug** — from your assumptions: share of adults who drink, average
drinks per drinker per hour, the beer/wine split, and whether you settle by the
glass or by the bottle. Non-drinkers and children are billed soft drinks
separately (tap water is free with the room rental).

**Ad libitum** — the per-person package price for the chosen number of hours,
plus the optional spirits surcharge. Two details that matter:

- If the package is **shorter than the party**, the remaining hours are billed
  per drink and added on. A 4-hour package at a 6-hour wedding is not a 4-hour
  bill.
- You can price it for **all guests** (how the venue normally sells it) or for
  **only the drinkers**, to see what that hypothetical would be worth.

**Break-even** — the chart plots both models against drinks-per-drinker-per-hour
and marks the rate where they cost the same. Both cost functions are affine in
that rate, so the crossing point is solved exactly (by sampling each function at
two points, so it can't drift out of sync with the functions themselves).

## Assumptions worth checking with the venue

A couple of lines on the price list are ambiguous. Both are exposed as toggles
rather than hard-coded:

- **"Lokaleleje for Elver – og Troldestuen dækker over opdækning, blomster …"**
  is read as applying to Elverstuen and Troldestuen (and the combined room), so
  table setting and flowers are free there. Turn off *"Regn opdækning og
  blomster som inkluderet"* to price them separately.
- **Reception (5 små retter)** is listed with the main meals but is treated as
  an optional add-on, since at a wedding it usually comes *before* dinner.
  Select it alone if it's meant to be the whole meal.

Welcome/dessert drinks (Moscato, Cremant, …) are billed separately in both
models — they're not part of the ad libitum package.

Items marked with an X on the printed sheet are flagged **Markeret** in the UI
and are pre-selected as the starting scenario.

## Stack

- Vite + React 19 + TypeScript, Tailwind CSS v4
- [Untitled UI React](https://www.untitledui.com/react/docs/introduction) —
  buttons, inputs, selects, sliders, toggles, radios, checkboxes, badges,
  button groups, and the design tokens the whole app is themed from
- [DiceUI](https://diceui.com/) — `stat` and `gauge`, pulled through the shadcn
  registry. `src/styles/shadcn-compat.css` maps the shadcn token names they
  expect onto the Untitled UI palette so they inherit the theme, dark mode
  included
- Recharts for the break-even chart

`src/data/catalog.ts` holds the whole price list; `src/domain/pricing.ts` holds
the calculations. Update `catalog.ts` when the 2027 list lands.
