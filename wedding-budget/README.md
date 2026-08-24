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

Three numbered steps: shared assumptions, the two payment models side by side,
then what gets added on regardless. Both models are always computed, whichever
one is feeding the budget.

### Step 1 — how much the guests drink (shared by both models)

Four presets, taken from published wedding-bar planning guidance rather than
guesswork. Sources are cited in `src/data/consumption-presets.ts`.

| Preset | Rate | Basis |
| --- | --- | --- |
| Roligt selskab | 0,8/t | Many driving home, older crowd |
| Branchestandard | 1,0/t | The Knot / Zola: one drink per guest per hour, ~5–6 across the night |
| Dansk bryllupsfest | 1,4/t | Wine through several courses, dancing late — the default |
| Tørstige gæster | 2,0/t | Young crowd, bar until late |

Danish wedding guides quote per-course figures instead (~1–2 glasses welcome, 2
white, 3 red, 1–2 dessert, ~2 beers), summing to 17–21 drinks per guest. Those
are *purchasing* guides — buy enough of each type that nothing runs out — not
consumption. Converted to actual drinking across a 6–7 hour wedding they land
near the 1,4/hour the Danish preset uses.

**Tempo** switches between an even spread and the classic "2 drinks in the first
hour, then 1 per hour". It never changes the total number of drinks, only when
they are drunk — which matters, because drinks consumed after the ad libitum
package expires are billed per glass.

**Spiritus** is asked once, as a fact about the party, because each model prices
it differently: ad libitum charges 95 kr/person/hour for the whole package,
efter forbrug charges 95 kr per drink actually poured.

### Step 2 — the two models

Every ad libitum control (package length, who buys it) lives inside the ad
libitum card. The efter forbrug card has no extra settings and says so. Each
card shows its own price and cost lines; the one feeding the budget is badged
**Med i budgettet**, the other **Sammenligning**.

If the package is **shorter than the party**, the remaining hours are billed per
drink and added on — a 4-hour package at a 6-hour wedding is not a 4-hour bill.
The package can be priced for **all guests** (how the venue normally sells it)
or for **only the drinkers**.

### Step 3 — added on regardless

Welcome drinks and corkage, billed under either model. Ordering plain
beer/wine/soft here while on an ad libitum package is flagged in amber — the
package already covers those, so you would pay twice. The sparkling wines
(Moscato, Cremant, Brachetto) are genuinely extra and are not flagged.

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
