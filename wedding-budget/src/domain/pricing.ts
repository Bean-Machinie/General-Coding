import {
    CORKAGE_PER_BOTTLE,
    extrasGroup,
    foodGroups,
    itemsById,
    rules,
    softConflicts,
    venueOptions,
    welcomeDrinksGroup,
} from "@/data/catalog";
import type { CostCategory, CostLine, Estimate, GuestCounts, Scenario } from "./types";
import { adLibitumCost, breakEvenRate, consumptionCost } from "./drinks";
import { formatDKK, formatNumber } from "./format";

export { formatDKK, formatNumber } from "./format";
export {
    adLibitumCost,
    averageAlcoholPrice,
    blendedDrinkPrice,
    breakEvenRate,
    consumptionCost,
    population,
} from "./drinks";

/** Heads that pay: adults at full rate, 2–12 at half, under-2 free. */
export function billableGuests(g: GuestCounts): number {
    return g.adults + g.children * rules.childDiscount;
}

export function headcount(g: GuestCounts): number {
    return g.adults + g.children + g.toddlers;
}

function priceOf(itemId: string, scenario: Scenario): number {
    const item = itemsById[itemId];
    if (!item) return 0;
    return scenario.useAltPrice[itemId] && item.altPrice ? item.altPrice : item.price;
}

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
        const servings = glassesPerGuest * billable;
        drinkLines.push({
            id: item.id,
            label: item.name,
            detail: `${formatNumber(glassesPerGuest, 1)} glas/gæst × ${formatNumber(billable, 1)} betalende × ${formatDKK(item.price)}`,
            amount: servings * item.price,
        });

        // Ordering plain beer/wine/soft on top of an ad libitum package pays twice.
        if (scenario.drinks.mode === "adlibitum" && item.coveredByAdLibitum) {
            warnings.push(
                `«${item.name}» er øl/vin/læske, som ad libitum-pakken allerede dækker — I betaler for den to gange.`,
            );
        }
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
