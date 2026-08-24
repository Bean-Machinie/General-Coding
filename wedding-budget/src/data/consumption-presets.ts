/**
 * Drinking assumptions, expressed as **totals per guest for the whole party**
 * rather than a rate per hour.
 *
 * That choice is deliberate. The Danish trade guidance is written per guest per
 * course, not per hour — Kokken & Jomfruen quote, for a full party:
 *
 *   1 glas velkomstdrink · 1½ glas hvidvin til forretten ·
 *   2½ glas rødvin til hovedretten · 1 glas dessertvin ·
 *   4 øl · 3 sodavand · 3 drinks à 250 ml
 *
 * i.e. **5 glasses of wine + 4 beers ≈ 9 alcoholic units per guest**, and a
 * beer/wine split of roughly 45/55 — which is where the defaults come from.
 *
 * A per-hour rate multiplied by party length is the wrong shape for this: it
 * makes an 8-hour wedding imply ~11 drinks a head purely because the party runs
 * long, when the trade figures say ~9 regardless. Party length now only decides
 * *when* the drinks are poured (which matters when an ad libitum package
 * expires early), never how many.
 *
 * The international baseline is quoted per hour (The Knot and Zola both use one
 * drink per guest per hour, ~5–6 across a reception), so it appears here as its
 * whole-party total instead.
 *
 * Sources:
 * - https://www.kokken-jomfruen.dk/inspiration/generelt-om-drikkevarerne-til-en-fest/
 * - https://www.theknot.com/content/how-to-stock-the-bar-at-your-wedding
 * - https://eventplanning.com/wedding-alcohol-cost-and-bar-budget/
 */

export interface ConsumptionPreset {
    id: string;
    label: string;
    /** Alcoholic drinks per *drinking* guest across the whole party. */
    drinksPerGuest: number;
    /** Share of adults who drink alcohol at all. */
    drinkerShare: number;
    /** Share of the alcohol that is beer; the rest is wine. */
    beerShare: number;
    /** Soft drinks per non-drinking guest across the whole party. */
    softDrinksPerGuest: number;
    hint: string;
}

export const consumptionPresets: ConsumptionPreset[] = [
    {
        id: "light",
        label: "Roligt selskab",
        drinksPerGuest: 5,
        drinkerShare: 0.65,
        beerShare: 0.4,
        softDrinksPerGuest: 3,
        hint: "Mange kører hjem, tidlig fest eller en ældre gæsteskare.",
    },
    {
        id: "international",
        label: "Internationalt",
        drinksPerGuest: 6,
        drinkerShare: 0.8,
        beerShare: 0.5,
        softDrinksPerGuest: 3,
        hint: "The Knot og Zola: 1 genstand pr. gæst pr. time, ca. 5–6 over en reception.",
    },
    {
        id: "danish",
        label: "Dansk branchestandard",
        drinksPerGuest: 9,
        drinkerShare: 0.85,
        beerShare: 0.45,
        softDrinksPerGuest: 3,
        hint: "Kokken & Jomfruen: 1½ glas hvidvin + 2½ glas rødvin + 1 glas dessertvin + 4 øl pr. gæst.",
    },
    {
        id: "heavy",
        label: "Tørstige gæster",
        drinksPerGuest: 12,
        drinkerShare: 0.9,
        beerShare: 0.55,
        softDrinksPerGuest: 4,
        hint: "Ung gæsteskare, bar til sent og ingen der skal køre.",
    },
];

/**
 * Glasses per bottle, from the same trade guidance. Used when settling by the
 * bottle instead of by the glass.
 */
export const glassesPerBottle = {
    hvidvin: 8,
    roedvin: 6,
    dessertvin: 10,
    portvin: 15,
    velkomstdrink: 6,
    champagne: 7,
} as const;

/** The party length the trade figures above are quoted for. */
export const REFERENCE_PARTY_HOURS = 6;

/**
 * Relative drinking weight during hour `h` (0-indexed) of the party:
 *
 *   hour 0      ×2    — the opening surge, everyone gets a drink at once
 *   hours 1–5   ×1    — dinner, wine with the courses, speeches
 *   hour 6+     ×0.5  — late night, dancing, people slowing down
 *
 * This curve does two jobs. It decides *when* the drinks are poured (which
 * matters once an ad libitum package expires mid-party), and — via
 * `effectiveDrinksPerGuest` — how a longer or shorter party moves the total.
 *
 * The late-night taper is what keeps a 12-hour party from implying twice the
 * drinks of a 6-hour one: guests keep going, but not at dinner pace.
 */
function hourWeight(hour: number): number {
    if (hour < 1) return 2;
    if (hour < 6) return 1;
    return 0.5;
}

function integrateWeight(fromHour: number, toHour: number): number {
    let sum = 0;
    for (let h = Math.floor(Math.max(0, fromHour)); h < toHour; h++) {
        const overlap = Math.min(h + 1, toHour) - Math.max(h, fromHour);
        if (overlap > 0) sum += hourWeight(h) * overlap;
    }
    return sum;
}

/**
 * Scale a trade figure quoted for a standard-length party to the actual party
 * length, along the taper curve above.
 *
 *   3 t → ×0.57 · 4 t → ×0.71 · 6 t → ×1 · 8 t → ×1.14 · 12 t → ×1.43
 *
 * So the Danish standard of 9 drinks per guest becomes ~6.4 at a 4-hour party
 * and ~12.9 at a 12-hour one — responsive to length, but nothing like the
 * straight multiplication a per-hour rate would give.
 */
export function effectiveDrinksPerGuest(atStandardLength: number, partyHours: number): number {
    const reference = integrateWeight(0, REFERENCE_PARTY_HOURS);
    if (reference <= 0 || partyHours <= 0) return 0;
    return atStandardLength * (integrateWeight(0, partyHours) / reference);
}

/**
 * Of a guest's `totalPerGuest` drinks for the evening, how many fall between
 * `fromHour` and `toHour`. The total is fixed by the caller; this only
 * distributes it across the party.
 */
export function drinksInWindow(
    totalPerGuest: number,
    partyHours: number,
    fromHour: number,
    toHour: number,
): number {
    if (partyHours <= 0 || toHour <= fromHour) return 0;

    const integrate = integrateWeight;

    const totalWeight = integrate(0, partyHours);
    if (totalWeight <= 0) return 0;

    const share = integrate(Math.max(0, fromHour), Math.min(partyHours, toHour)) / totalWeight;
    return totalPerGuest * share;
}
