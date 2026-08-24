import { SPIRITS_SURCHARGE_PER_HOUR, adLibitumOptions, consumptionPrices } from "@/data/catalog";
import { drinksInWindow } from "@/data/consumption-presets";
import { rules } from "@/data/catalog";
import type { ConsumptionConfig, CostLine, DrinkCostBreakdown, Scenario } from "./types";
import { formatDKK, formatNumber } from "./format";

/** Price of one beer-or-wine drink, blended across the chosen beer/wine split. */
export function blendedDrinkPrice(c: ConsumptionConfig): number {
    const beer = consumptionPrices.beer;
    const wine = consumptionPrices[c.wineType];

    const beerUnit = c.priceBasis === "glass" ? beer.glass : beer.bottle / Math.max(1, c.glassesPerBottleBeer);
    const wineUnit = c.priceBasis === "glass" ? wine.glass : wine.bottle / Math.max(1, c.glassesPerBottleWine);

    return c.beerShare * beerUnit + (1 - c.beerShare) * wineUnit;
}

/** Price of one alcoholic drink once spirits are mixed into the average. */
export function averageAlcoholPrice(c: ConsumptionConfig, spiritsServed: boolean): number {
    const base = blendedDrinkPrice(c);
    if (!spiritsServed) return base;
    const share = c.spiritsShare;
    return (1 - share) * base + share * consumptionPrices.cocktail.glass;
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
    rate: number,
    fromHour: number,
    toHour: number,
): number {
    const pop = population(scenario);
    const perDrinker = drinksInWindow(
        scenario.drinks.consumption.profile,
        rate,
        scenario.partyHours,
        fromHour,
        toHour,
    );
    return pop.drinkers * perDrinker;
}

function softDrinkCost(guests: number, hours: number, c: ConsumptionConfig): number {
    return guests * hours * c.softDrinksPerHour * consumptionPrices.soda.glass;
}

/** Full "efter forbrug" bill: everyone settles per glass/bottle. */
export function consumptionCost(scenario: Scenario, ratePerHourOverride?: number): DrinkCostBreakdown {
    const c = scenario.drinks.consumption;
    const rate = ratePerHourOverride ?? c.drinksPerHour;
    const hours = scenario.partyHours;
    const pop = population(scenario);
    const spiritsServed = scenario.drinks.spiritsServed;

    const alcoholUnits = alcoholUnitsInWindow(scenario, rate, 0, hours);
    const spiritUnits = spiritsServed ? alcoholUnits * c.spiritsShare : 0;
    const beerWineUnits = alcoholUnits - spiritUnits;

    const beerWineCost = beerWineUnits * blendedDrinkPrice(c);
    const spiritCost = spiritUnits * consumptionPrices.cocktail.glass;

    const softGuests = pop.soberAdults + pop.children;
    const soft = softDrinkCost(softGuests, hours, c);

    const lines: CostLine[] = [];
    if (beerWineCost > 0) {
        lines.push({
            id: "alcohol",
            label: "Øl og vin",
            detail: `${formatNumber(beerWineUnits, 0)} genstande à ${formatDKK(blendedDrinkPrice(c))}`,
            amount: beerWineCost,
        });
    }
    if (spiritCost > 0) {
        lines.push({
            id: "spirits",
            label: "Drinks og spiritus",
            detail: `${formatNumber(spiritUnits, 0)} drinks à ${formatDKK(consumptionPrices.cocktail.glass)}`,
            amount: spiritCost,
        });
    }
    if (soft > 0) {
        lines.push({
            id: "soft",
            label: "Sodavand til ikke-drikkende",
            detail: `${formatNumber(softGuests, 0)} gæster × ${formatNumber(c.softDrinksPerHour)} /time × ${hours} t à ${formatDKK(consumptionPrices.soda.glass)}`,
            amount: soft,
        });
    }

    const total = beerWineCost + spiritCost + soft;
    return {
        total,
        lines,
        alcoholUnits,
        pricePerDrink: alcoholUnits > 0 ? (beerWineCost + spiritCost) / alcoholUnits : null,
    };
}

/**
 * Ad libitum bill. If the package is shorter than the party, the remaining
 * hours fall back to consumption pricing — which is what actually happens.
 */
export function adLibitumCost(scenario: Scenario, ratePerHourOverride?: number): DrinkCostBreakdown {
    const { adLib, consumption: c, spiritsServed } = scenario.drinks;
    const rate = ratePerHourOverride ?? c.drinksPerHour;
    const option = adLibitumOptions.find((o) => o.hours === adLib.hours) ?? adLibitumOptions[0];
    const pop = population(scenario);

    const packageHours = Math.min(option.hours, scenario.partyHours);
    const overflowHours = Math.max(0, scenario.partyHours - option.hours);

    const coveredAdults = adLib.coverage === "all" ? scenario.guests.adults : pop.drinkers;
    const coveredChildren = adLib.coverage === "all" ? pop.children : 0;
    const packageHeads = coveredAdults + coveredChildren * rules.childDiscount;

    const lines: CostLine[] = [];

    const packageCost = packageHeads * option.price;
    lines.push({
        id: "package",
        label: `Ad libitum i ${option.hours} timer`,
        detail: `${formatNumber(packageHeads, 1)} betalende × ${formatDKK(option.price)}${adLib.coverage === "drinkers_only" ? " (kun drikkende)" : ""}`,
        amount: packageCost,
    });

    let spiritsCost = 0;
    if (spiritsServed) {
        spiritsCost = packageHeads * option.hours * SPIRITS_SURCHARGE_PER_HOUR;
        lines.push({
            id: "spirits",
            label: "Tillæg for spiritus",
            detail: `${formatNumber(packageHeads, 1)} × ${option.hours} t × ${formatDKK(SPIRITS_SURCHARGE_PER_HOUR)}/t`,
            amount: spiritsCost,
        });
    }

    // Guests left off the package still drink soft drinks all evening.
    const uncoveredSoftGuests = adLib.coverage === "all" ? 0 : pop.soberAdults + pop.children;
    const uncoveredSoft = softDrinkCost(uncoveredSoftGuests, scenario.partyHours, c);
    if (uncoveredSoft > 0) {
        lines.push({
            id: "uncovered_soft",
            label: "Sodavand til gæster uden pakke",
            detail: `${formatNumber(uncoveredSoftGuests, 0)} gæster × ${formatNumber(c.softDrinksPerHour)} /time × ${scenario.partyHours} t`,
            amount: uncoveredSoft,
        });
    }

    // Hours past the end of the package are billed per drink. Because the
    // profile front-loads drinking, these late hours are cheaper than the
    // average rate would imply.
    let overflow = 0;
    if (overflowHours > 0) {
        const overflowUnits = alcoholUnitsInWindow(scenario, rate, packageHours, scenario.partyHours);
        const overflowAlcohol = overflowUnits * averageAlcoholPrice(c, spiritsServed);
        const overflowSoft = softDrinkCost(
            adLib.coverage === "all" ? pop.soberAdults + pop.children : 0,
            overflowHours,
            c,
        );
        overflow = overflowAlcohol + overflowSoft;
        lines.push({
            id: "overflow",
            label: `De sidste ${formatNumber(overflowHours, 0)} time(r)`,
            detail: `Pakken er udløbet — ${formatNumber(overflowUnits, 0)} genstande afregnes efter forbrug`,
            amount: overflow,
        });
    }

    const alcoholUnits = alcoholUnitsInWindow(scenario, rate, 0, scenario.partyHours);
    const total = packageCost + spiritsCost + uncoveredSoft + overflow;

    return {
        total,
        lines,
        alcoholUnits,
        pricePerDrink: alcoholUnits > 0 ? total / alcoholUnits : null,
    };
}

/**
 * The drinks-per-drinker-per-hour rate where both models cost the same.
 *
 * Both cost functions are affine in the rate, so we sample each at two points
 * and solve the resulting linear equation. Sampling (rather than deriving the
 * coefficients by hand) keeps this exactly consistent with the functions above.
 */
export function breakEvenRate(scenario: Scenario): number | null {
    const c0 = consumptionCost(scenario, 0).total;
    const c1 = consumptionCost(scenario, 1).total;
    const a0 = adLibitumCost(scenario, 0).total;
    const a1 = adLibitumCost(scenario, 1).total;

    const denominator = c1 - c0 - (a1 - a0);
    if (Math.abs(denominator) < 1e-9) return null;

    const rate = (a0 - c0) / denominator;
    return rate > 0 && Number.isFinite(rate) ? rate : null;
}
