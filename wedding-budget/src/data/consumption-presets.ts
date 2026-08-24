/**
 * Drinking-rate presets, from published wedding-bar planning guidance.
 *
 * The industry baseline is **one drink per guest per hour**, which The Knot and
 * Zola both use and which holds whether the bar runs 3 or 6 hours — roughly
 * 5–6 drinks per guest across a full reception. The common refinement is
 * **two drinks in the first hour, then one per hour**, which bakes in the surge
 * when everyone gets a drink at once as the reception opens.
 *
 * Danish wedding guides quote per-course figures instead (≈1–2 glasses welcome,
 * 2 white with the starter, 3 red with the main, 1–2 dessert wine, plus ~2
 * beers). Those are *purchasing* guides — buy enough of each type that nothing
 * runs out — and they sum to far more than anyone drinks. Converted to actual
 * consumption across a 6–7 hour Danish wedding they land near 1.4/hour, which
 * is what the "Dansk bryllupsfest" preset uses.
 *
 * Sources:
 * - https://www.theknot.com/content/how-to-stock-the-bar-at-your-wedding
 * - https://eventplanning.com/wedding-alcohol-cost-and-bar-budget/
 * - https://www.reventals.com/blog/party-drink-calculator-how-much-alcohol/
 * - https://magasinetbryllup.dk/planlaegning/drikkevarer-til-bryllup-hvor-meget-drikkelse-skal-i-koebe-til-gaesterne/
 */

export interface ConsumptionPreset {
    id: string;
    label: string;
    /** Average alcoholic drinks per *drinking* guest per hour. */
    drinksPerHour: number;
    /** Share of adults who drink alcohol at all. */
    drinkerShare: number;
    /** Share of the alcohol that is beer; the rest is wine. */
    beerShare: number;
    hint: string;
}

export const consumptionPresets: ConsumptionPreset[] = [
    {
        id: "light",
        label: "Roligt selskab",
        drinksPerHour: 0.75,
        drinkerShare: 0.65,
        beerShare: 0.4,
        hint: "Mange kører hjem, tidlig fest eller en ældre gæsteskare.",
    },
    {
        id: "standard",
        label: "Branchestandard",
        drinksPerHour: 1,
        drinkerShare: 0.8,
        beerShare: 0.5,
        hint: "1 genstand pr. gæst pr. time — ca. 5–6 over hele festen. Bruges af The Knot og Zola.",
    },
    {
        id: "danish",
        label: "Dansk bryllupsfest",
        drinksPerHour: 1.4,
        drinkerShare: 0.85,
        beerShare: 0.45,
        hint: "Vin til flere retter, skåltaler og dans til langt ud på natten.",
    },
    {
        id: "heavy",
        label: "Tørstige gæster",
        drinksPerHour: 2,
        drinkerShare: 0.9,
        beerShare: 0.55,
        hint: "Ung gæsteskare, bar til sent og ingen der skal køre.",
    },
];

/**
 * How the drinking is spread across the evening.
 *
 * This matters for the ad libitum comparison: if the drinking is front-loaded
 * into the hours the package covers, the hours *after* the package expires are
 * cheaper than a flat average would suggest.
 */
export type ConsumptionProfile = "even" | "frontloaded";

export const consumptionProfiles: { id: ConsumptionProfile; label: string; hint: string }[] = [
    {
        id: "frontloaded",
        label: "Tungt i starten",
        hint: "2 genstande den første time, derefter 1 pr. time — den klassiske tommelfingerregel.",
    },
    {
        id: "even",
        label: "Jævnt fordelt",
        hint: "Samme tempo hele aftenen.",
    },
];

/** Relative drinking weight during hour `h` (0-indexed) of the party. */
function hourWeight(profile: ConsumptionProfile, hour: number): number {
    if (profile === "even") return 1;
    // Twice the rate during the opening hour, flat thereafter.
    return hour < 1 ? 2 : 1;
}

/**
 * Drinks consumed by one drinker between `fromHour` and `toHour`, given an
 * average of `ratePerHour` across the whole `partyHours`.
 *
 * The rate is normalised against the profile so the slider always means "the
 * average over the evening" — changing the profile redistributes drinks, it
 * doesn't silently add or remove them.
 */
export function drinksInWindow(
    profile: ConsumptionProfile,
    ratePerHour: number,
    partyHours: number,
    fromHour: number,
    toHour: number,
): number {
    if (partyHours <= 0 || toHour <= fromHour) return 0;

    const integrate = (a: number, b: number) => {
        let sum = 0;
        for (let h = Math.floor(a); h < b; h++) {
            const overlap = Math.min(h + 1, b) - Math.max(h, a);
            if (overlap > 0) sum += hourWeight(profile, h) * overlap;
        }
        return sum;
    };

    const totalWeight = integrate(0, partyHours);
    if (totalWeight <= 0) return 0;

    // Scale so that the whole party averages exactly `ratePerHour`.
    const perWeight = (ratePerHour * partyHours) / totalWeight;
    return perWeight * integrate(Math.max(0, fromHour), Math.min(partyHours, toHour));
}
