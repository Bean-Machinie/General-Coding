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

/**
 * Relative drinking weight during hour `h` (0-indexed): double during the
 * opening hour, flat thereafter — the standard "2 drinks in the first hour,
 * then 1 per hour" surge.
 *
 * Fixed rather than configurable: it only changes *when* drinks happen, never
 * the total, so it is invisible unless an ad libitum package expires before the
 * party ends — where it correctly makes the leftover hours cheaper than a flat
 * average would suggest.
 */
function hourWeight(hour: number): number {
    return hour < 1 ? 2 : 1;
}

/**
 * Of a guest's `totalPerGuest` drinks for the evening, how many fall between
 * `fromHour` and `toHour`.
 *
 * The total is fixed by the caller; this only distributes it, so a longer party
 * spreads the same drinks thinner rather than inventing new ones.
 */
export function drinksInWindow(
    totalPerGuest: number,
    partyHours: number,
    fromHour: number,
    toHour: number,
): number {
    if (partyHours <= 0 || toHour <= fromHour) return 0;

    const integrate = (a: number, b: number) => {
        let sum = 0;
        for (let h = Math.floor(a); h < b; h++) {
            const overlap = Math.min(h + 1, b) - Math.max(h, a);
            if (overlap > 0) sum += hourWeight(h) * overlap;
        }
        return sum;
    };

    const totalWeight = integrate(0, partyHours);
    if (totalWeight <= 0) return 0;

    const share = integrate(Math.max(0, fromHour), Math.min(partyHours, toHour)) / totalWeight;
    return totalPerGuest * share;
}
