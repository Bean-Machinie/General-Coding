import {
    CORKAGE_PER_BOTTLE,
    SPIRITS_SURCHARGE_PER_HOUR,
    adLibitumOptions,
    consumptionPrices,
    extrasGroup,
    foodGroups,
    itemsById,
    rules,
    softConflicts,
    venueOptions,
    welcomeDrinksGroup,
} from "@/data/catalog";
import type {
    ConsumptionConfig,
    CostCategory,
    CostLine,
    DrinkCostBreakdown,
    Estimate,
    GuestCounts,
    Scenario,
} from "./types";

/** Heads that pay: adults at full rate, 2–12 at half, under-2 free. */
export function billableGuests(g: GuestCounts): number {
    return g.adults + g.children * rules.childDiscount;
}

export function headcount(g: GuestCounts): number {
    return g.adults + g.children + g.toddlers;
}

export function formatDKK(value: number): string {
    return new Intl.NumberFormat("da-DK", {
        style: "currency",
        currency: "DKK",
        maximumFractionDigits: 0,
    }).format(Math.round(value));
}

export function formatNumber(value: number, digits = 1): string {
    return new Intl.NumberFormat("da-DK", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(value);
}

function priceOf(itemId: string, scenario: Scenario): number {
    const item = itemsById[itemId];
    if (!item) return 0;
    return scenario.useAltPrice[itemId] && item.altPrice ? item.altPrice : item.price;
}

// ---------------------------------------------------------------------------
// Drinks
// ---------------------------------------------------------------------------

/** Price of one alcoholic drink, blended across the chosen beer/wine split. */
export function blendedDrinkPrice(c: ConsumptionConfig): number {
    const beer = consumptionPrices.beer;
    const wine = consumptionPrices[c.wineType];

    const beerUnit = c.priceBasis === "glass" ? beer.glass : beer.bottle / Math.max(1, c.glassesPerBottleBeer);
    const wineUnit = c.priceBasis === "glass" ? wine.glass : wine.bottle / Math.max(1, c.glassesPerBottleWine);

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

function population(scenario: Scenario): DrinkPopulation {
    const { adults, children } = scenario.guests;
    const drinkers = adults * scenario.drinks.consumption.drinkerShare;
    return { drinkers, soberAdults: adults - drinkers, children };
}

/**
 * Cost of settling alcohol by consumption for a given group over a number of
 * hours, at a given drinks-per-hour rate.
 */
function alcoholCost(drinkers: number, hours: number, ratePerHour: number, c: ConsumptionConfig): number {
    return drinkers * hours * ratePerHour * blendedDrinkPrice(c);
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

    const alcoholUnits = pop.drinkers * hours * rate;
    const alcohol = alcoholCost(pop.drinkers, hours, rate, c);
    const softGuests = pop.soberAdults + pop.children;
    const soft = softDrinkCost(softGuests, hours, c);

    const lines: CostLine[] = [];
    if (alcohol > 0) {
        lines.push({
            id: "alcohol",
            label: "Øl og vin efter forbrug",
            detail: `${formatNumber(pop.drinkers, 0)} drikkende × ${formatNumber(rate)} genstand/time × ${hours} t = ${formatNumber(alcoholUnits, 0)} genstande à ${formatDKK(blendedDrinkPrice(c))}`,
            amount: alcohol,
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

    const total = alcohol + soft;
    return {
        total,
        lines,
        alcoholUnits,
        pricePerDrink: alcoholUnits > 0 ? alcohol / alcoholUnits : null,
    };
}

/**
 * Ad libitum bill. If the package is shorter than the party, the remaining
 * hours fall back to consumption pricing — which is what actually happens.
 */
export function adLibitumCost(scenario: Scenario, ratePerHourOverride?: number): DrinkCostBreakdown {
    const { adLib, consumption: c } = scenario.drinks;
    const rate = ratePerHourOverride ?? c.drinksPerHour;
    const option = adLibitumOptions.find((o) => o.hours === adLib.hours) ?? adLibitumOptions[0];
    const pop = population(scenario);

    const overflowHours = Math.max(0, scenario.partyHours - option.hours);

    // Who is on the package.
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
    if (adLib.spirits) {
        spiritsCost = packageHeads * option.hours * SPIRITS_SURCHARGE_PER_HOUR;
        lines.push({
            id: "spirits",
            label: "Tillæg for spiritus",
            detail: `${formatNumber(packageHeads, 1)} × ${option.hours} t × ${formatDKK(SPIRITS_SURCHARGE_PER_HOUR)}/t`,
            amount: spiritsCost,
        });
    }

    // Guests left off the package still drink soft drinks all evening.
    const uncoveredSoftGuests =
        adLib.coverage === "all" ? 0 : pop.soberAdults + pop.children;
    const uncoveredSoft = softDrinkCost(uncoveredSoftGuests, scenario.partyHours, c);
    if (uncoveredSoft > 0) {
        lines.push({
            id: "uncovered_soft",
            label: "Sodavand til gæster uden pakke",
            detail: `${formatNumber(uncoveredSoftGuests, 0)} gæster × ${formatNumber(c.softDrinksPerHour)} /time × ${scenario.partyHours} t`,
            amount: uncoveredSoft,
        });
    }

    // Hours past the end of the package are billed per drink.
    let overflow = 0;
    if (overflowHours > 0) {
        const overflowAlcohol = alcoholCost(pop.drinkers, overflowHours, rate, c);
        const overflowSoft = softDrinkCost(
            adLib.coverage === "all" ? pop.soberAdults + pop.children : 0,
            overflowHours,
            c,
        );
        overflow = overflowAlcohol + overflowSoft;
        lines.push({
            id: "overflow",
            label: `${formatNumber(overflowHours, 0)} time(r) efter pakkens udløb`,
            detail: "Pakken dækker ikke hele festen — resten afregnes efter forbrug",
            amount: overflow,
        });
    }

    const alcoholUnits = pop.drinkers * scenario.partyHours * rate;
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
    const cAt = (r: number) => consumptionCost(scenario, r).total;
    const aAt = (r: number) => adLibitumCost(scenario, r).total;

    const c0 = cAt(0);
    const c1 = cAt(1);
    const a0 = aAt(0);
    const a1 = aAt(1);

    const consumptionSlope = c1 - c0;
    const adLibSlope = a1 - a0;
    const denominator = consumptionSlope - adLibSlope;

    // Parallel lines (nobody drinks, or the package covers no hours) never cross.
    if (Math.abs(denominator) < 1e-9) return null;

    const rate = (a0 - c0) / denominator;
    return rate > 0 && Number.isFinite(rate) ? rate : null;
}

// ---------------------------------------------------------------------------
// Full estimate
// ---------------------------------------------------------------------------

export function estimate(scenario: Scenario): Estimate {
    const billable = billableGuests(scenario.guests);
    const heads = headcount(scenario.guests);
    const warnings: string[] = [];
    const categories: CostCategory[] = [];

    // --- Venue -------------------------------------------------------------
    const venue = venueOptions.find((v) => v.id === scenario.venueId) ?? null;
    const venueLines: CostLine[] = [];
    const setupIncluded = Boolean(venue?.includesSetup && scenario.trustIncludedSetup);

    if (venue) {
        venueLines.push({
            id: venue.id,
            label: `Lokaleleje — ${venue.name}`,
            detail: setupIncluded
                ? "Inkl. opdækning, blomster, postevand, levende lys, rengøring og servering"
                : `${venue.minGuests}–${venue.maxGuests ?? "∞"} personer`,
            amount: venue.price,
        });

        if (heads < venue.minGuests) {
            warnings.push(`${venue.name} kræver mindst ${venue.minGuests} personer — I er ${heads}.`);
        }
        if (venue.maxGuests !== null && heads > venue.maxGuests) {
            warnings.push(`${venue.name} har plads til højst ${venue.maxGuests} personer — I er ${heads}.`);
        }
    } else {
        warnings.push("Vælg et lokale for at få lokalelejen med i budgettet.");
    }

    if (scenario.guests.adults < rules.minAdults) {
        warnings.push(
            `Der skal være mindst ${rules.minAdults} voksne for at leje lokale og bestille fra selskabsmenuen.`,
        );
    }

    // Table setting and flowers, unless the room rental covers them.
    const opdaekningItem = extrasGroup.items.find((i) => i.id === "opdaekning")!;
    if (scenario.opdaekning && !setupIncluded) {
        venueLines.push({
            id: "opdaekning",
            label: opdaekningItem.name,
            detail: `${formatNumber(billable, 1)} betalende × ${formatDKK(opdaekningItem.price)}`,
            amount: billable * opdaekningItem.price,
        });
    }

    const flowerItem = extrasGroup.items.find((i) => i.id === "blomsterbuketter")!;
    const flowerCount = scenario.quantities.blomsterbuketter ?? 0;
    if (flowerCount > 0 && !setupIncluded) {
        venueLines.push({
            id: "blomsterbuketter",
            label: flowerItem.name,
            detail: `${flowerCount} buket(ter) × ${formatDKK(flowerItem.price)}`,
            amount: flowerCount * flowerItem.price,
        });
    }

    categories.push({
        id: "venue",
        label: "Lokale og opdækning",
        amount: venueLines.reduce((sum, l) => sum + l.amount, 0),
        lines: venueLines,
    });

    // --- Food --------------------------------------------------------------
    for (const group of foodGroups) {
        const lines: CostLine[] = [];

        if (group.selection === "single") {
            if (scenario.mainMealId) {
                const item = group.items.find((i) => i.id === scenario.mainMealId);
                if (item) {
                    const unitPrice = priceOf(item.id, scenario);
                    lines.push({
                        id: item.id,
                        label: item.name,
                        detail: `${formatNumber(billable, 1)} betalende × ${formatDKK(unitPrice)}`,
                        amount: billable * unitPrice,
                    });
                }
            }
        } else {
            for (const item of group.items) {
                if (!scenario.selected.includes(item.id)) continue;
                const unitPrice = priceOf(item.id, scenario);
                lines.push({
                    id: item.id,
                    label: item.name,
                    detail: `${formatNumber(billable, 1)} betalende × ${formatDKK(unitPrice)}`,
                    amount: billable * unitPrice,
                });
            }
        }

        if (lines.length > 0) {
            categories.push({
                id: group.id,
                label: group.title,
                amount: lines.reduce((sum, l) => sum + l.amount, 0),
                lines,
            });
        }
    }

    if (!scenario.mainMealId && !scenario.selected.includes("reception_5")) {
        warnings.push("Der er ikke valgt noget hovedmåltid endnu.");
    }

    for (const conflict of softConflicts) {
        if (conflict.items.every((id) => scenario.selected.includes(id))) {
            warnings.push(conflict.message);
        }
    }

    // --- Drinks ------------------------------------------------------------
    const adLib = adLibitumCost(scenario);
    const consumption = consumptionCost(scenario);
    const chosen = scenario.drinks.mode === "adlibitum" ? adLib : consumption;

    const drinkLines: CostLine[] = [...chosen.lines];

    for (const item of welcomeDrinksGroup.items) {
        const glassesPerGuest = scenario.quantities[item.id] ?? 0;
        if (glassesPerGuest <= 0) continue;
        // Welcome drinks are served to adults; children get them at half price.
        const servings = glassesPerGuest * billable;
        drinkLines.push({
            id: item.id,
            label: item.name,
            detail: `${formatNumber(glassesPerGuest, 1)} glas/gæst × ${formatNumber(billable, 1)} betalende × ${formatDKK(item.price)}`,
            amount: servings * item.price,
        });
    }

    if (scenario.drinks.ownWineBottles > 0) {
        drinkLines.push({
            id: "corkage",
            label: "Proppenge for medbragt vin",
            detail: `${scenario.drinks.ownWineBottles} flasker × ${formatDKK(CORKAGE_PER_BOTTLE)}`,
            amount: scenario.drinks.ownWineBottles * CORKAGE_PER_BOTTLE,
        });
    }

    categories.push({
        id: "drinks",
        label: scenario.drinks.mode === "adlibitum" ? "Drikkevarer (ad libitum)" : "Drikkevarer (efter forbrug)",
        amount: drinkLines.reduce((sum, l) => sum + l.amount, 0),
        lines: drinkLines,
    });

    if (scenario.drinks.mode === "adlibitum" && scenario.drinks.adLib.hours < scenario.partyHours) {
        warnings.push(
            `Ad libitum-pakken dækker ${scenario.drinks.adLib.hours} af festens ${scenario.partyHours} timer — resten er lagt ind efter forbrug.`,
        );
    }

    const total = categories.reduce((sum, c) => sum + c.amount, 0);

    return {
        categories: categories.filter((c) => c.lines.length > 0),
        total,
        perGuest: heads > 0 ? total / heads : 0,
        perBillableGuest: billable > 0 ? total / billable : 0,
        billableGuests: billable,
        headcount: heads,
        adLib,
        consumption,
        adLibSaving: consumption.total - adLib.total,
        breakEvenDrinksPerHour: breakEvenRate(scenario),
        warnings,
    };
}
