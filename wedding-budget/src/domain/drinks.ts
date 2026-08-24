import { adLibitumOptions, consumptionPrices, rules } from "@/data/catalog";
import { drinksInWindow, effectiveDrinksPerGuest } from "@/data/consumption-presets";
import type { ConsumptionConfig, CostLine, DrinkCostBreakdown, Scenario, WineType } from "./types";
import { formatDKK, formatNumber } from "./format";

/** A Danish standard drink contains 12 g of pure alcohol (Sundhedsstyrelsen). */
const STANDARD_DRINK_GRAMS = 12;
/** Density of pure ethanol at 20 °C (NIST). */
const ETHANOL_GRAMS_PER_MILLILITRE = 0.789;

/** Convert a container's volume and alcohol percentage to Danish standard drinks. */
export function standardDrinksInVolume(litres: number, alcoholPercent: number): number {
    const pureAlcoholMillilitres = Math.max(0, litres) * 1000 * (Math.max(0, alcoholPercent) / 100);
    return (pureAlcoholMillilitres * ETHANOL_GRAMS_PER_MILLILITRE) / STANDARD_DRINK_GRAMS;
}

/** Standard drinks in the venue's fixed 1.5 L beer pitcher. */
export function standardDrinksInBeerPitcher(): number {
    return standardDrinksInVolume(
        consumptionPrices.beer.pitcherLitres,
        consumptionPrices.beer.defaultAlcoholPercent,
    );
}

/** Standard drinks in the selected fixed 0.75 L house-wine bottle. */
export function standardDrinksInWineBottle(wineType: WineType): number {
    const wine = consumptionPrices[wineType];
    return standardDrinksInVolume(wine.bottleLitres, wine.defaultAlcoholPercent);
}

/** Price of one beer-or-wine drink, blended across the chosen beer/wine split. */
export function blendedDrinkPrice(c: ConsumptionConfig): number {
    const beer = consumptionPrices.beer;
    const wine = consumptionPrices[c.wineType];

    const beerUnit =
        c.priceBasis === "glass"
            ? beer.glass
            : beer.pitcher / Math.max(0.1, standardDrinksInBeerPitcher());
    const wineUnit =
        c.priceBasis === "glass"
            ? wine.glass
            : wine.bottle / Math.max(0.1, standardDrinksInWineBottle(c.wineType));

    return c.beerShare * beerUnit + (1 - c.beerShare) * wineUnit;
}

interface DrinkPopulation {
    /** Adults who drink alcohol. */
    drinkers: number;
    /** Adults who don't drink alcohol. */
    soberAdults: number;
    /** Children 2–12 — soft drinks only, half price on packages. */
    children: number;
}

export function population(scenario: Scenario): DrinkPopulation {
    const { adults, children } = scenario.guests;
    const drinkers = adults * scenario.drinks.consumption.drinkerShare;
    return { drinkers, soberAdults: adults - drinkers, children };
}

/** Alcoholic drinks poured for the whole group between two hour marks. */
function alcoholUnitsInWindow(
    scenario: Scenario,
    totalPerGuest: number,
    fromHour: number,
    toHour: number,
): number {
    const perDrinker = drinksInWindow(totalPerGuest, scenario.partyHours, fromHour, toHour);
    return population(scenario).drinkers * perDrinker;
}

/** Soft drinks for a group between two hour marks, on the same distribution. */
function softDrinkCostInWindow(
    scenario: Scenario,
    guests: number,
    fromHour: number,
    toHour: number,
): number {
    const c = scenario.drinks.consumption;
    const softTotal = effectiveDrinksPerGuest(c.softDrinksPerGuest, scenario.partyHours);
    const perGuest = drinksInWindow(softTotal, scenario.partyHours, fromHour, toHour);
    return guests * perGuest * consumptionPrices.soda.glass;
}

/** Full "efter forbrug" bill: everyone settles per glass/bottle. */
export function consumptionCost(scenario: Scenario, totalPerGuestOverride?: number): DrinkCostBreakdown {
    const c = scenario.drinks.consumption;
    const total = totalPerGuestOverride ?? effectiveDrinksPerGuest(c.drinksPerGuest, scenario.partyHours);
    const hours = scenario.partyHours;
    const pop = population(scenario);

    const alcoholUnits = alcoholUnitsInWindow(scenario, total, 0, hours);
    const beerWineCost = alcoholUnits * blendedDrinkPrice(c);

    const softGuests = pop.soberAdults + pop.children;
    const soft = softDrinkCostInWindow(scenario, softGuests, 0, hours);

    const lines: CostLine[] = [];
    if (beerWineCost > 0) {
        lines.push({
            id: "alcohol",
            label: "Øl og vin",
            detail: `${formatNumber(alcoholUnits, 0)} genstande à ${formatDKK(blendedDrinkPrice(c))}`,
            amount: beerWineCost,
        });
    }
    if (soft > 0) {
        lines.push({
            id: "soft",
            label: "Sodavand til ikke-drikkende",
            detail: `${formatNumber(softGuests, 0)} gæster × ${formatNumber(c.softDrinksPerGuest, 1)} sodavand à ${formatDKK(consumptionPrices.soda.glass)}`,
            amount: soft,
        });
    }

    return {
        total: beerWineCost + soft,
        lines,
        alcoholUnits,
        pricePerDrink: alcoholUnits > 0 ? beerWineCost / alcoholUnits : null,
    };
}

/**
 * Ad libitum bill. If the package is shorter than the party, the remaining
 * hours fall back to consumption pricing — which is what actually happens.
 */
export function adLibitumCost(scenario: Scenario, totalPerGuestOverride?: number): DrinkCostBreakdown {
    const { adLib, consumption: c } = scenario.drinks;
    const total = totalPerGuestOverride ?? effectiveDrinksPerGuest(c.drinksPerGuest, scenario.partyHours);
    const option = adLibitumOptions.find((o) => o.hours === adLib.hours) ?? adLibitumOptions[0];
    const pop = population(scenario);

    const packageHours = Math.min(option.hours, scenario.partyHours);
    const overflowHours = Math.max(0, scenario.partyHours - option.hours);

    const coveredAdults = adLib.coverage === "all" ? scenario.guests.adults : pop.drinkers;
    const coveredChildren = adLib.coverage === "all" ? pop.children : 0;
    const packageHeads = coveredAdults + coveredChildren * rules.childDiscount;

    const lines: CostLine[] = [];

    // Spell out that the package is charged per head, not per drinker — otherwise
    // the price looks unresponsive when the drinking assumptions change.
    const packageCost = packageHeads * option.price;
    const nonDrinkersOnPackage = adLib.coverage === "all" ? pop.soberAdults + pop.children : 0;
    lines.push({
        id: "package",
        label: `Ad libitum i ${option.hours} timer`,
        detail:
            adLib.coverage === "drinkers_only"
                ? `${formatNumber(packageHeads, 1)} drikkende × ${formatDKK(option.price)}`
                : `${formatNumber(packageHeads, 1)} betalende × ${formatDKK(option.price)}` +
                  (nonDrinkersOnPackage >= 0.5
                      ? ` — heraf ${formatNumber(nonDrinkersOnPackage, 0)} der ikke drikker alkohol`
                      : ""),
        amount: packageCost,
    });

    // Guests left off the package still drink soft drinks all evening.
    const uncoveredSoftGuests = adLib.coverage === "all" ? 0 : pop.soberAdults + pop.children;
    const uncoveredSoft = softDrinkCostInWindow(scenario, uncoveredSoftGuests, 0, scenario.partyHours);
    if (uncoveredSoft > 0) {
        lines.push({
            id: "uncovered_soft",
            label: "Sodavand til gæster uden pakke",
            detail: `${formatNumber(uncoveredSoftGuests, 0)} gæster × ${formatNumber(c.softDrinksPerGuest, 1)} sodavand`,
            amount: uncoveredSoft,
        });
    }

    // Hours past the end of the package are billed per drink. Because drinking
    // is front-loaded, these late hours hold fewer drinks than an even split.
    let overflow = 0;
    if (overflowHours > 0) {
        const overflowUnits = alcoholUnitsInWindow(scenario, total, packageHours, scenario.partyHours);
        const overflowAlcohol = overflowUnits * blendedDrinkPrice(c);
        const overflowSoft = softDrinkCostInWindow(
            scenario,
            adLib.coverage === "all" ? pop.soberAdults + pop.children : 0,
            packageHours,
            scenario.partyHours,
        );
        overflow = overflowAlcohol + overflowSoft;
        lines.push({
            id: "overflow",
            label: `De sidste ${formatNumber(overflowHours, 0)} time(r)`,
            detail: `Pakken er udløbet — ${formatNumber(overflowUnits, 0)} genstande afregnes efter forbrug`,
            amount: overflow,
        });
    }

    const alcoholUnits = alcoholUnitsInWindow(scenario, total, 0, scenario.partyHours);
    const grandTotal = packageCost + uncoveredSoft + overflow;

    return {
        total: grandTotal,
        lines,
        alcoholUnits,
        pricePerDrink: alcoholUnits > 0 ? grandTotal / alcoholUnits : null,
    };
}

/**
 * Drinks per drinking guest at which both models cost the same.
 *
 * Both cost functions are affine in that total, so we sample each at two points
 * and solve the resulting linear equation. Sampling (rather than deriving the
 * coefficients by hand) keeps this exactly consistent with the functions above.
 */
export function breakEvenDrinksPerGuest(scenario: Scenario): number | null {
    const c0 = consumptionCost(scenario, 0).total;
    const c1 = consumptionCost(scenario, 1).total;
    const a0 = adLibitumCost(scenario, 0).total;
    const a1 = adLibitumCost(scenario, 1).total;

    const denominator = c1 - c0 - (a1 - a0);
    if (Math.abs(denominator) < 1e-9) return null;

    const drinks = (a0 - c0) / denominator;
    return drinks > 0 && Number.isFinite(drinks) ? drinks : null;
}
