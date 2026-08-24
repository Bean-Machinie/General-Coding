/**
 * Section accent colours. The budget breakdown reuses these for its slices, so
 * a section header and its share of the budget read as the same thing.
 */
export const ACCENTS = {
    venue: "var(--color-utility-blue-500)",
    drinks: "var(--color-utility-emerald-500)",
    food: "var(--color-utility-orange-500)",
    compare: "var(--color-brand-600)",
} as const;

export type AccentKey = keyof typeof ACCENTS;
