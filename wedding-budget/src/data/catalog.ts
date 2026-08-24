/**
 * Bryggeri Skovlyst — selskabsprisliste pr. 1/1-2026.
 * Transcribed verbatim from the printed price list (first half of 2026).
 *
 * `highlighted: true` marks the lines that were crossed off by hand (X) on the
 * printed sheet, i.e. the current favourites.
 */

export type ItemId = string;

/** How a line item's price scales. */
export type PriceUnit =
    | "per_person" // multiplied by billable guests (children at half price)
    | "per_unit" // multiplied by an explicit quantity the user picks
    | "flat" // charged once, regardless of headcount
    | "per_person_per_hour"; // multiplied by billable guests AND party hours

export interface CatalogItem {
    id: ItemId;
    name: string;
    price: number;
    unit: PriceUnit;
    /** Secondary price, e.g. bottle price when `price` is the glass price. */
    altPrice?: number;
    altLabel?: string;
    note?: string;
    highlighted?: boolean;
}

export interface CatalogGroup {
    id: string;
    title: string;
    /** `single` = mutually exclusive (radio), `multi` = checkboxes, `quantity` = numeric. */
    selection: "single" | "multi" | "quantity";
    note?: string;
    items: CatalogItem[];
}

// ---------------------------------------------------------------------------
// Page 1 — Brunch / Frokost / Aften
// ---------------------------------------------------------------------------

/**
 * One main meal per party — these are the alternatives to each other on the
 * printed list, so the app treats them as mutually exclusive.
 *
 * "Reception (5 små retter)" is deliberately NOT in this group: at a wedding it
 * is normally served *before* the main meal, so it lives in `receptionGroup`
 * as an optional add-on. Set it as the only food choice if you want the
 * reception to *be* the meal.
 */
export const mainMealGroup: CatalogGroup = {
    id: "main_meal",
    title: "Hovedmåltid",
    selection: "single",
    note: "Vælg ét — disse er alternativer til hinanden.",
    items: [
        { id: "brunch", name: "Brunch", price: 355, unit: "per_person" },
        { id: "frokostbord_1", name: "Frokostbord I", price: 395, unit: "per_person" },
        { id: "frokostbord_2", name: "Frokostbord II", price: 410, unit: "per_person" },
        { id: "buffet_1", name: "Buffet I", price: 435, unit: "per_person" },
        { id: "buffet_2", name: "Buffet II", price: 475, unit: "per_person" },
        { id: "buffet_3", name: "Buffet III (elegantbuffet)", price: 585, unit: "per_person" },
        { id: "menu_3", name: "Tre retters menu", price: 430, unit: "per_person" },
        { id: "menu_4", name: "Fire retters menu", price: 475, unit: "per_person", highlighted: true },
        { id: "menu_5", name: "Fem retters menu", price: 525, unit: "per_person" },
    ],
};

export const receptionGroup: CatalogGroup = {
    id: "reception",
    title: "Reception",
    selection: "multi",
    note: "Serveres typisk før hovedmåltidet — kan vælges sammen med en menu eller alene.",
    items: [{ id: "reception_5", name: "Reception (5 små retter)", price: 285, unit: "per_person" }],
};

export const snacksGroup: CatalogGroup = {
    id: "snacks",
    title: "Snacks før eller efter maden",
    selection: "multi",
    items: [
        { id: "maltstaenger", name: "Maltstænger med dip", price: 15, unit: "per_person" },
        { id: "skaaret_frugt", name: "Skåret frugt", price: 25, unit: "per_person", highlighted: true },
        { id: "peanuts", name: "Peanuts eller saltmandler", price: 15, unit: "per_person" },
        { id: "oelpoelser", name: "Små ølpølser", price: 20, unit: "per_person" },
        { id: "flaeskesvaer", name: "Flæskesvær", price: 20, unit: "per_person" },
        { id: "rodfrugtchips", name: "Rodfrugtchips", price: 20, unit: "per_person" },
        {
            id: "blandede_snacks",
            name: "Blandede snacks (peanuts, mandler og rodfrugtchips)",
            price: 30,
            unit: "per_person",
            highlighted: true,
            note: "Indeholder allerede peanuts/mandler og rodfrugtchips.",
        },
    ],
};

/**
 * Overlaps the app warns about (not hard blocks — the venue will happily sell
 * you both, it is just almost certainly not what you want).
 */
export const softConflicts: { items: ItemId[]; message: string }[] = [
    {
        items: ["blandede_snacks", "peanuts"],
        message: "«Blandede snacks» indeholder allerede peanuts/mandler.",
    },
    {
        items: ["blandede_snacks", "rodfrugtchips"],
        message: "«Blandede snacks» indeholder allerede rodfrugtchips.",
    },
    {
        items: ["skaaret_frugt", "natmad_frisk_frugt"],
        message: "«Skåret frugt» (snacks) og «Frisk frugt» (natmad) er stort set det samme.",
    },
];

// ---------------------------------------------------------------------------
// Page 3 — Sødt og Kaffe / Natmad
// ---------------------------------------------------------------------------

export const sweetsGroup: CatalogGroup = {
    id: "sweets",
    title: "Sødt og kaffe",
    selection: "multi",
    items: [
        { id: "kaffe_the", name: "Kaffe/the ad libitum", price: 45, unit: "per_person" },
        { id: "fyldte_chokolader", name: "Fyldte chokolader (3 stk.)", price: 75, unit: "per_person" },
        { id: "hjemmelavet_soedt", name: "Hjemmelavet sødt til kaffen, 2 slags", price: 40, unit: "per_person" },
        { id: "kagebuffet", name: "Kagebuffet, 6-8 slags sødt, kage og tærte", price: 145, unit: "per_person" },
        {
            id: "lagkage",
            name: "Lagkage med flødeskum",
            price: 65,
            unit: "per_person",
            altPrice: 85,
            altLabel: "i marcipan",
        },
        { id: "medbragt_soedt", name: "Medbragt sødt/snacks", price: 15, unit: "per_person", note: "Serveringsgebyr." },
        { id: "medbragt_kage", name: "Medbragt kage", price: 25, unit: "per_person", note: "Serveringsgebyr." },
        { id: "appelsinkage", name: "Appelsin/mandel kage med marengs", price: 45, unit: "per_person" },
        { id: "aebletaerte", name: "Æbletærte med cremefraiche", price: 45, unit: "per_person" },
    ],
};

export const natmadGroup: CatalogGroup = {
    id: "natmad",
    title: "Natmad",
    selection: "multi",
    items: [
        { id: "natmad_poelsebord", name: "Pølsebord m/paté, surt, brød og smør", price: 85, unit: "per_person" },
        { id: "natmad_sandwich", name: "Tre slags sandwich", price: 75, unit: "per_person" },
        { id: "natmad_taerter", name: "Lune tærter med bacon, skinke og grønt, med salat", price: 65, unit: "per_person" },
        { id: "natmad_suppe", name: "Kartoffelsuppe med porrer", price: 65, unit: "per_person" },
        { id: "natmad_grillpoelser", name: "Grill pølser med brioche pølsebrød og tilbehør", price: 80, unit: "per_person" },
        { id: "natmad_frisk_frugt", name: "Frisk frugt", price: 25, unit: "per_person" },
        { id: "natmad_frikadeller", name: "Frikadeller med kartoffelsalat", price: 75, unit: "per_person" },
        { id: "natmad_tarteletter", name: "Tarteletter med kylling og sæsonens grønt", price: 85, unit: "per_person" },
    ],
};

// ---------------------------------------------------------------------------
// Page 2 — Drikkevarer
// ---------------------------------------------------------------------------

/** Welcome / dessert drinks, priced per glass and ordered per guest. */
export const welcomeDrinksGroup: CatalogGroup = {
    id: "welcome_drinks",
    title: "Velkomst- og dessertdrikke (pr. glas)",
    selection: "quantity",
    note: "Angiv hvor mange glas pr. gæst der skal serveres.",
    items: [
        { id: "hvidvin_hyldeblomst", name: "Hvidvin med hyldeblomst", price: 75, unit: "per_unit" },
        {
            id: "moscato",
            name: "La Spinetta, Moscato d'Asti (velkomst eller dessert)",
            price: 85,
            unit: "per_unit",
            highlighted: true,
        },
        { id: "cremant", name: "Cremant / cremant rosé", price: 85, unit: "per_unit" },
        {
            id: "brachetto",
            name: "Birbet Negro, Brachetto, rød let mousserende (velkomst eller dessert)",
            price: 85,
            unit: "per_unit",
        },
        { id: "cider_alkoholfri", name: "Cider alkoholfri — hindbær, fersken eller granatæble", price: 70, unit: "per_unit" },
        { id: "hejren", name: "Hejren (hvedeøl med hyldeblomst)", price: 70, unit: "per_unit" },
    ],
};

/** Ad libitum packages — mutually exclusive, priced per person for the whole block. */
export interface AdLibitumOption {
    hours: number;
    price: number;
    highlighted?: boolean;
}

export const adLibitumOptions: AdLibitumOption[] = [
    { hours: 3, price: 325 },
    { hours: 4, price: 415, highlighted: true },
    { hours: 5, price: 495 },
    { hours: 6, price: 560 },
    { hours: 7, price: 625 },
    { hours: 8, price: 685 },
];

/** Add-on to an ad libitum package: spirits, charged per person per hour. */
export const SPIRITS_SURCHARGE_PER_HOUR = 95;

/**
 * "Efter forbrug" unit prices — what you pay when you settle by consumption
 * instead of buying a package. Glass price first, bottle price second where
 * the list gives both.
 */
export const consumptionPrices = {
    beer: { name: "Håndbrygget øl", glass: 65, bottle: 275 },
    houseWhite: { name: "Husets hvidvin", glass: 85, bottle: 325 },
    houseRose: { name: "Husets rosévin", glass: 85, bottle: 325 },
    houseRed: { name: "Husets rødvin", glass: 90, bottle: 325 },
    housePort: { name: "Husets portvin", glass: 85, bottle: 495 },
    soda: { name: "Alle sodavand", glass: 40, bottle: null },
    juice: { name: "Øko. rabarber eller æblemost", glass: 45, bottle: null },
    rokkedysse: { name: "Rokkedyssegårdsaft", glass: 48, bottle: null },
    avec: { name: "Avec til kaffen (rum cream, cognac v.s., rom, whisky)", glass: 75, bottle: null },
    cocktail: { name: "Drinks: gin & tonic, rom & cola, vodka & juice", glass: 95, bottle: null },
} as const;

export type ConsumptionKey = keyof typeof consumptionPrices;

/** Corkage if you bring your own wine. */
export const CORKAGE_PER_BOTTLE = 250;

// ---------------------------------------------------------------------------
// Page 4 — Lokaleleje / andet
// ---------------------------------------------------------------------------

export interface VenueOption {
    id: string;
    name: string;
    price: number;
    minGuests: number;
    maxGuests: number | null;
    /**
     * The list states that lokaleleje for Elver- og Troldestuen covers
     * opdækning, blomster, postevand ad libitum, levende lys, rengøring og
     * servering.
     */
    includesSetup: boolean;
}

export const venueOptions: VenueOption[] = [
    { id: "brygstuen", name: "Brygstuen", price: 1500, minGuests: 25, maxGuests: 40, includesSetup: false },
    { id: "elverstuen", name: "Elverstuen", price: 2500, minGuests: 25, maxGuests: 45, includesSetup: true },
    { id: "troldestuen", name: "Troldestuen", price: 4000, minGuests: 25, maxGuests: 60, includesSetup: true },
    {
        id: "elver_trolde",
        name: "Elver- og Troldestuen",
        price: 6000,
        minGuests: 70,
        maxGuests: null,
        includesSetup: true,
    },
];

export const extrasGroup: CatalogGroup = {
    id: "extras",
    title: "Opdækning og pynt",
    selection: "quantity",
    items: [
        {
            id: "opdaekning",
            name: "Opdækning med hvide duge og stofservietter",
            price: 25,
            unit: "per_person",
            note: "Inkluderet i lokalelejen for Elver- og Troldestuen.",
        },
        { id: "blomsterbuketter", name: "Blomsterbuketter", price: 175, unit: "per_unit" },
    ],
};

// ---------------------------------------------------------------------------
// House rules from the bottom of page 4
// ---------------------------------------------------------------------------

export const rules = {
    /** Minimum adults required to rent a room and order from the party menu. */
    minAdults: 25,
    /** Children 2–12 are half price. */
    childDiscount: 0.5,
    /** Children under 2 are free if no place is set for them. */
    toddlerPrice: 0,
} as const;

export const venueInfo = {
    name: "Bryggeri Skovlyst",
    address: "Skovlystvej 2, 3500 Værløse",
    phone: "+45 44 98 65 45",
    email: "info@bryggeriskovlyst.dk",
    priceListDate: "Pr. 1/1-2026",
    disclaimer:
        "Der tages forbehold for menu- og prisændringer samt udsolgte varer. Priserne er gældende for første halvår 2026.",
} as const;

export const foodGroups: CatalogGroup[] = [
    mainMealGroup,
    receptionGroup,
    snacksGroup,
    sweetsGroup,
    natmadGroup,
];

/** Flat lookup of every per-person/per-unit food item by id. */
export const itemsById: Record<ItemId, CatalogItem> = Object.fromEntries(
    [...foodGroups, welcomeDrinksGroup, extrasGroup].flatMap((g) => g.items).map((i) => [i.id, i]),
);
