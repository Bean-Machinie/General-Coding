import type { Scenario } from "./types";

/**
 * Starting point matches the items marked with an X on the printed price list:
 * fire retters menu, skåret frugt, blandede snacks, Moscato d'Asti as welcome
 * drink, and the 4-timers ad libitum package.
 */
export function createDefaultScenario(overrides: Partial<Scenario> = {}): Scenario {
    return {
        id: crypto.randomUUID(),
        name: "Bryllup",
        guests: { adults: 100, children: 0, toddlers: 0 },
        partyHours: 6,
        venueId: "elver_trolde",
        mainMealId: "menu_4",
        selected: ["skaaret_frugt", "blandede_snacks", "kaffe_the"],
        useAltPrice: {},
        quantities: { moscato: 1, blomsterbuketter: 0 },
        opdaekning: true,
        budgetTarget: 150000,
        trustIncludedSetup: true,
        drinks: {
            mode: "adlibitum",
            spiritsServed: false,
            adLib: { hours: 4, coverage: "all" },
            consumption: {
                drinkerShare: 0.85,
                drinksPerGuest: 9,
                beerShare: 0.45,
                spiritsShare: 0.15,
                wineType: "houseWhite",
                softDrinksPerGuest: 3,
                priceBasis: "glass",
                glassesPerBottleWine: 6,
                glassesPerBottleBeer: 4,
            },
            ownWineBottles: 0,
        },
        ...overrides,
    };
}

const STORAGE_KEY = "skovlyst-budget:v4";

interface PersistedState {
    scenarios: Scenario[];
    activeId: string;
}

export function loadState(): PersistedState | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as PersistedState;
        if (!Array.isArray(parsed.scenarios) || parsed.scenarios.length === 0) return null;
        // Merge onto defaults so scenarios saved by an older version still load.
        const scenarios = parsed.scenarios.map((s) => ({
            ...createDefaultScenario(),
            ...s,
            guests: { ...createDefaultScenario().guests, ...s.guests },
            drinks: {
                ...createDefaultScenario().drinks,
                ...s.drinks,
                adLib: { ...createDefaultScenario().drinks.adLib, ...s.drinks?.adLib },
                consumption: { ...createDefaultScenario().drinks.consumption, ...s.drinks?.consumption },
            },
        }));
        return { scenarios, activeId: parsed.activeId ?? scenarios[0].id };
    } catch {
        return null;
    }
}

export function saveState(state: PersistedState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Storage full or blocked — the app still works, it just won't remember.
    }
}
