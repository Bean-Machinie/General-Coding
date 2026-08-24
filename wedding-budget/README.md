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

Assumptions are expressed as **totals per guest for the whole party**, not as a
rate per hour. Sources are cited in `src/data/consumption-presets.ts`.

| Preset | Genstande/gæst | Basis |
| --- | --- | --- |
| Roligt selskab | 5 | Many driving home, older crowd |
| Internationalt | 6 | The Knot / Zola: 1 drink per guest per hour, ~5–6 across a reception |
| **Dansk branchestandard** | **9** | Kokken & Jomfruen: 1½ hvidvin + 2½ rødvin + 1 dessertvin + 4 øl — the default |
| Tørstige gæster | 12 | Young crowd, bar until late |

Soft drinks default to 3 per non-drinking guest, and the 45/55 beer/wine split
comes from the same source (4 beers against 5 glasses of wine).

**Why totals rather than a rate.** Danish trade guidance is written per guest per
course, not per hour. Multiplying a per-hour rate by party length is the wrong
shape for it: it makes an 8-hour wedding imply ~11 drinks a head purely because
the party runs long, when the trade figures say ~9 for a normal wedding.

The figures above are quoted for a **6-hour party** and scale to the actual
length along a taper curve rather than in a straight line:

| Hour of the party | Weight | Why |
| --- | --- | --- |
| 0 | ×2 | Opening surge — everyone gets a drink at once |
| 1–5 | ×1 | Dinner, wine with the courses, speeches |
| 6+ | ×0.5 | Late night, dancing, guests slowing down |

So the Danish standard of 9 drinks per guest becomes:

| Party length | 3 t | 4 t | 6 t | 8 t | 10 t | 12 t |
| --- | --- | --- | --- | --- | --- | --- |
| Genstande/gæst | 5,1 | 6,4 | **9** | 10,3 | 11,6 | 12,9 |

Doubling the party from 6 to 12 hours raises consumption by about 43 %, not
100 %. The same curve also decides *when* the drinks are poured, which is what
makes the hours after an expired ad libitum package cheaper than an even split
would suggest. Soft drinks scale on the same curve.

**Not modelled:** spirits and cocktails. The price list carries them (95 kr per
drink, or a 95 kr/person/hour ad libitum surcharge), and `catalog.ts` still
records both figures, but the app deliberately prices beer and wine only. Add
them back in `drinks.ts` if the plan changes.

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

**Break-even** — the chart plots both models against drinks per drinking guest
and marks the point where they cost the same. Both cost functions are affine in
that total, so the crossing point is solved exactly (by sampling each function at
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
