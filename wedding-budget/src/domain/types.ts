import type { ItemId } from "@/data/catalog";
import type { ConsumptionProfile } from "@/data/consumption-presets";

export type DrinkMode = "adlibitum" | "consumption";

export type WineType = "houseWhite" | "houseRose" | "houseRed";

export type PriceBasis = "glass" | "bottle";

/** Who the ad libitum package is bought for. */
export type AdLibCoverage = "all" | "drinkers_only";

export interface GuestCounts {
    /** 13 and up — full price. */
    adults: number;
    /** 2–12 years — half price. */
    children: number;
    /** Under 2 — free, as long as no place is set at the table. */
    toddlers: number;
}

export interface AdLibConfig {
    /** Package length in hours, matching one of `adLibitumOptions`. */
    hours: number;
    coverage: AdLibCoverage;
}

export interface ConsumptionConfig {
    /** Share of adults who drink alcohol, 0–1. */
    drinkerShare: number;
    /** Average alcoholic drinks per drinking adult per hour. */
    drinksPerHour: number;
    /** Share of those drinks that are beer, 0–1. The rest is wine. */
    beerShare: number;
    wineType: WineType;
    /** Soft drinks per non-drinking guest per hour. */
    softDrinksPerHour: number;
    /** How the drinking is spread across the evening. */
    profile: ConsumptionProfile;
    /** Of the alcoholic drinks, the share that are spirits/cocktails. */
    spiritsShare: number;
    /** Settle by the glass or by the bottle. */
    priceBasis: PriceBasis;
    glassesPerBottleWine: number;
    glassesPerBottleBeer: number;
}

export interface DrinksConfig {
    mode: DrinkMode;
    /**
     * Whether spirits are served at all. A party-level decision, priced
     * differently by each model: ad libitum charges a per-person-per-hour
     * surcharge, efter forbrug charges per drink poured.
     */
    spiritsServed: boolean;
    adLib: AdLibConfig;
    consumption: ConsumptionConfig;
    /** Bottles brought from home, charged corkage. */
    ownWineBottles: number;
}

export interface Scenario {
    id: string;
    name: string;
    guests: GuestCounts;
    /** How long the party runs, in hours. Drives consumption and package fit. */
    partyHours: number;
    venueId: string | null;
    mainMealId: ItemId | null;
    /** Multi-select food items (snacks, sweets, natmad, reception). */
    selected: ItemId[];
    /** Use the more expensive alternative price where an item has one. */
    useAltPrice: Record<ItemId, boolean>;
    /** Glasses per guest for welcome drinks; buket count for flowers. */
    quantities: Record<ItemId, number>;
    /** Table setting — auto-included with some rooms. */
    opdaekning: boolean;
    /** Optional budget ceiling to measure the estimate against. */
    budgetTarget: number;
    /** Trust the "lokaleleje includes opdækning and flowers" note on the price list. */
    trustIncludedSetup: boolean;
    drinks: DrinksConfig;
}

export interface CostLine {
    id: string;
    label: string;
    detail: string;
    amount: number;
}

export interface CostCategory {
    id: string;
    label: string;
    amount: number;
    lines: CostLine[];
}

export interface DrinkCostBreakdown {
    total: number;
    lines: CostLine[];
    /** Total alcoholic drinks poured across the whole party. */
    alcoholUnits: number;
    /** Effective price paid per alcoholic drink. */
    pricePerDrink: number | null;
}

export interface Estimate {
    categories: CostCategory[];
    total: number;
    /** Total divided by every head, toddlers included. */
    perGuest: number;
    /** Total divided by paying (billable) heads. */
    perBillableGuest: number;
    billableGuests: number;
    headcount: number;
    adLib: DrinkCostBreakdown;
    consumption: DrinkCostBreakdown;
    /** Positive = ad libitum is the cheaper option, by this many kroner. */
    adLibSaving: number;
    /**
     * Drinks per drinker per hour at which both models cost the same.
     * `null` when they never cross (e.g. nobody drinks).
     */
    breakEvenDrinksPerHour: number | null;
    warnings: string[];
}
