import { Check, InfoCircle } from "@untitledui/icons";
import {
    CORKAGE_PER_BOTTLE,
    SPIRITS_SURCHARGE_PER_HOUR,
    adLibitumOptions,
    consumptionPrices,
    welcomeDrinksGroup,
} from "@/data/catalog";
import { consumptionPresets, consumptionProfiles } from "@/data/consumption-presets";
import type { ConsumptionProfile } from "@/data/consumption-presets";
import type { DrinkCostBreakdown, Estimate, Scenario, WineType } from "@/domain/types";
import { averageAlcoholPrice, formatDKK, formatNumber } from "@/domain/pricing";
import { Badge } from "@/components/base/badges/badges";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { InputNumber } from "@/components/base/input/input-number";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { Select } from "@/components/base/select/select";
import { Slider } from "@/components/base/slider/slider";
import { Toggle } from "@/components/base/toggle/toggle";
import { cx } from "@/utils/cx";
import { FieldRow, Section } from "./section";

interface Props {
    scenario: Scenario;
    estimate: Estimate;
    billableGuests: number;
    onChange: (patch: Partial<Scenario>) => void;
}

const wineOptions: { id: WineType; label: string }[] = [
    { id: "houseWhite", label: `${consumptionPrices.houseWhite.name} — ${consumptionPrices.houseWhite.glass} kr./glas` },
    { id: "houseRose", label: `${consumptionPrices.houseRose.name} — ${consumptionPrices.houseRose.glass} kr./glas` },
    { id: "houseRed", label: `${consumptionPrices.houseRed.name} — ${consumptionPrices.houseRed.glass} kr./glas` },
];

const StepHeading = ({
    step,
    title,
    description,
}: {
    step: number;
    title: string;
    description: string;
}) => (
    <div className="mb-3 flex items-start gap-3">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-solid text-xs font-semibold text-white">
            {step}
        </span>
        <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-primary">{title}</p>
            <p className="text-xs text-tertiary">{description}</p>
        </div>
    </div>
);

const LabelledSlider = ({
    label,
    hint,
    value,
    display,
    min,
    max,
    step,
    onChange,
}: {
    label: string;
    hint?: string;
    value: number;
    display: string;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
}) => (
    <div className="py-2">
        <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-secondary">{label}</p>
            <span className="text-sm font-semibold text-primary tabular-nums">{display}</span>
        </div>
        {hint && <p className="mb-1 text-xs text-tertiary">{hint}</p>}
        <Slider
            minValue={min}
            maxValue={max}
            step={step}
            value={value}
            onChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
            formatOptions={{ style: "decimal" }}
        />
    </div>
);

const CostLines = ({ cost }: { cost: DrinkCostBreakdown }) => (
    <ul className="space-y-1.5">
        {cost.lines.map((line) => (
            <li key={line.id}>
                <div className="flex justify-between gap-3 text-sm">
                    <span className="text-secondary">{line.label}</span>
                    <span className="shrink-0 font-medium text-primary tabular-nums">
                        {formatDKK(line.amount)}
                    </span>
                </div>
                <p className="text-xs text-tertiary">{line.detail}</p>
            </li>
        ))}
    </ul>
);

/** Declared at module scope so the radio inside isn't remounted on every render. */
const ModelHeader = ({
    id,
    title,
    subtitle,
    cost,
    chosen,
    isCheapest,
}: {
    id: "adlibitum" | "consumption";
    title: string;
    subtitle: string;
    cost: DrinkCostBreakdown;
    chosen: boolean;
    isCheapest: boolean;
}) => (
    <div className={cx("border-b border-secondary px-4 py-3", chosen && "bg-brand-primary")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
            <RadioButton value={id} size="md" label={title} />
            {chosen ? (
                <Badge type="pill-color" color="brand" size="sm">
                    Med i budgettet
                </Badge>
            ) : (
                <Badge type="pill-color" color="gray" size="sm">
                    Sammenligning
                </Badge>
            )}
        </div>
        <p className="mt-1 text-xs text-tertiary">{subtitle}</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-3xl font-semibold text-primary tabular-nums">{formatDKK(cost.total)}</p>
            {isCheapest && (
                <Badge type="pill-color" color="success" size="sm">
                    Billigst
                </Badge>
            )}
        </div>
        {cost.pricePerDrink !== null && (
            <p className="mt-0.5 text-sm text-tertiary">
                {formatDKK(cost.pricePerDrink)} pr. genstand · {formatNumber(cost.alcoholUnits, 0)}{" "}
                genstande i alt
            </p>
        )}
    </div>
);

export const DrinksSection = ({ scenario, estimate, billableGuests, onChange }: Props) => {
    const { drinks } = scenario;
    const { consumption: c, adLib } = drinks;

    const patchDrinks = (patch: Partial<typeof drinks>) =>
        onChange({ drinks: { ...drinks, ...patch } });
    const patchConsumption = (patch: Partial<typeof c>) =>
        patchDrinks({ consumption: { ...c, ...patch } });
    const patchAdLib = (patch: Partial<typeof adLib>) => patchDrinks({ adLib: { ...adLib, ...patch } });

    const drinkers = Math.round(scenario.guests.adults * c.drinkerShare);
    const unitPrice = averageAlcoholPrice(c, drinks.spiritsServed);
    const cheaper = estimate.adLibSaving > 0 ? "adlibitum" : "consumption";
    const drinksPerGuest = c.drinksPerHour * scenario.partyHours;

    const activePreset = consumptionPresets.find(
        (p) =>
            Math.abs(p.drinksPerHour - c.drinksPerHour) < 0.01 &&
            Math.abs(p.drinkerShare - c.drinkerShare) < 0.01 &&
            Math.abs(p.beerShare - c.beerShare) < 0.01,
    );

    return (
        <Section
            accent="drinks"
            title="Drikkevarer"
            description="Vælg hvordan I betaler for øl og vin. Begge modeller regnes ud hele tiden, så I kan se forskellen."
        >
            {/* ============ Trin 1: fælles antagelser ============ */}
            <div className="rounded-xl bg-secondary p-4">
                <StepHeading
                    step={1}
                    title="Hvor meget drikker gæsterne?"
                    description="Start med et udgangspunkt, og finjustér bagefter. Gælder begge modeller."
                />

                <div className="flex flex-wrap gap-2">
                    {consumptionPresets.map((preset) => {
                        const isActive = activePreset?.id === preset.id;
                        return (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() =>
                                    patchConsumption({
                                        drinksPerHour: preset.drinksPerHour,
                                        drinkerShare: preset.drinkerShare,
                                        beerShare: preset.beerShare,
                                    })
                                }
                                title={preset.hint}
                                className={cx(
                                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition-colors",
                                    isActive
                                        ? "bg-brand-solid text-white ring-transparent"
                                        : "bg-primary text-secondary ring-secondary hover:bg-secondary",
                                )}
                            >
                                {isActive && <Check className="size-3.5" />}
                                {preset.label}
                                <span className={cx("tabular-nums", isActive ? "text-white" : "text-tertiary")}>
                                    {formatNumber(preset.drinksPerHour)}/t
                                </span>
                            </button>
                        );
                    })}
                </div>

                <p className="mt-2 flex items-start gap-1.5 text-xs text-tertiary">
                    <InfoCircle className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                        {activePreset
                            ? activePreset.hint
                            : "Egne indstillinger — tryk på et udgangspunkt for at nulstille."}
                    </span>
                </p>

                <div className="mt-4 border-t border-secondary pt-2">
                    <LabelledSlider
                        label="Genstande pr. drikkende gæst pr. time"
                        hint={`Svarer til ${formatNumber(drinksPerGuest, 1)} genstande hver over ${scenario.partyHours} timer.`}
                        display={`${formatNumber(c.drinksPerHour)} /time`}
                        value={c.drinksPerHour}
                        min={0}
                        max={4}
                        step={0.1}
                        onChange={(v) => patchConsumption({ drinksPerHour: v })}
                    />

                    <LabelledSlider
                        label="Andel af voksne der drikker alkohol"
                        hint="Resten får sodavand — gravide, chauffører og afholdende."
                        display={`${Math.round(c.drinkerShare * 100)} % · ${drinkers} pers.`}
                        value={Math.round(c.drinkerShare * 100)}
                        min={0}
                        max={100}
                        step={5}
                        onChange={(v) => patchConsumption({ drinkerShare: v / 100 })}
                    />

                    <LabelledSlider
                        label="Fordeling øl / vin"
                        display={`${Math.round(c.beerShare * 100)} % øl · ${100 - Math.round(c.beerShare * 100)} % vin`}
                        value={Math.round(c.beerShare * 100)}
                        min={0}
                        max={100}
                        step={5}
                        onChange={(v) => patchConsumption({ beerShare: v / 100 })}
                    />

                    <LabelledSlider
                        label="Sodavand pr. ikke-drikkende gæst pr. time"
                        hint={`${formatDKK(consumptionPrices.soda.glass)} pr. sodavand. Postevand er gratis med lokalelejen.`}
                        display={`${formatNumber(c.softDrinksPerHour)} /time`}
                        value={c.softDrinksPerHour}
                        min={0}
                        max={4}
                        step={0.25}
                        onChange={(v) => patchConsumption({ softDrinksPerHour: v })}
                    />
                </div>

                <div className="mt-4 border-t border-secondary pt-3">
                    <p className="mb-1.5 text-sm font-medium text-secondary">Tempo hen over aftenen</p>
                    <ButtonGroup
                        selectedKeys={[c.profile]}
                        selectionMode="single"
                        onSelectionChange={(keys) => {
                            const next = [...keys][0];
                            if (next === "even" || next === "frontloaded")
                                patchConsumption({ profile: next as ConsumptionProfile });
                        }}
                        className="w-full"
                    >
                        {consumptionProfiles.map((p) => (
                            <ButtonGroupItem key={p.id} id={p.id} className="flex-1 justify-center">
                                {p.label}
                            </ButtonGroupItem>
                        ))}
                    </ButtonGroup>
                    <p className="mt-1.5 text-xs text-tertiary">
                        {consumptionProfiles.find((p) => p.id === c.profile)?.hint} Ændrer ikke det
                        samlede antal genstande — kun hvornår de drikkes, hvilket betyder noget når
                        ad libitum-pakken udløber før festen.
                    </p>
                </div>

                {/* Spirits: one party-level decision, priced differently by each model. */}
                <div className="mt-4 border-t border-secondary pt-2">
                    <FieldRow
                        label="Serveres der spiritus og drinks?"
                        hint={`Vælges én gang. Ad libitum: ${formatDKK(SPIRITS_SURCHARGE_PER_HOUR)}/person/time. Efter forbrug: ${formatDKK(consumptionPrices.cocktail.glass)} pr. drink.`}
                    >
                        <Toggle
                            isSelected={drinks.spiritsServed}
                            onChange={(v) => patchDrinks({ spiritsServed: v })}
                            size="md"
                        />
                    </FieldRow>
                    {drinks.spiritsServed && (
                        <LabelledSlider
                            label="Hvor stor en del af genstandene er drinks?"
                            hint={`Gennemsnitsprisen pr. genstand bliver ${formatDKK(unitPrice)}.`}
                            display={`${Math.round(c.spiritsShare * 100)} %`}
                            value={Math.round(c.spiritsShare * 100)}
                            min={0}
                            max={60}
                            step={5}
                            onChange={(v) => patchConsumption({ spiritsShare: v / 100 })}
                        />
                    )}
                </div>

                <div className="mt-4 grid gap-4 border-t border-secondary pt-3 sm:grid-cols-2">
                    <Select
                        label="Hvilken husvin?"
                        selectedKey={c.wineType}
                        onSelectionChange={(key) => patchConsumption({ wineType: key as WineType })}
                        items={wineOptions}
                    >
                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                    </Select>

                    <div>
                        <p className="mb-1.5 text-sm font-medium text-secondary">
                            Pris pr. genstand regnes efter
                        </p>
                        <ButtonGroup
                            selectedKeys={[c.priceBasis]}
                            selectionMode="single"
                            onSelectionChange={(keys) => {
                                const next = [...keys][0];
                                if (next === "glass" || next === "bottle")
                                    patchConsumption({ priceBasis: next });
                            }}
                            className="w-full"
                        >
                            <ButtonGroupItem id="glass" className="flex-1 justify-center">
                                Glaspris
                            </ButtonGroupItem>
                            <ButtonGroupItem id="bottle" className="flex-1 justify-center">
                                Flaskepris
                            </ButtonGroupItem>
                        </ButtonGroup>
                    </div>
                </div>

                {c.priceBasis === "bottle" && (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <InputNumber
                            label="Glas pr. flaske vin"
                            hint={`Flaske ${formatDKK(consumptionPrices.houseWhite.bottle)}`}
                            minValue={1}
                            maxValue={12}
                            value={c.glassesPerBottleWine}
                            onChange={(v) => patchConsumption({ glassesPerBottleWine: Number.isNaN(v) ? 5 : v })}
                        />
                        <InputNumber
                            label="Glas pr. flaske øl"
                            hint={`Flaske ${formatDKK(consumptionPrices.beer.bottle)}`}
                            minValue={1}
                            maxValue={12}
                            value={c.glassesPerBottleBeer}
                            onChange={(v) => patchConsumption({ glassesPerBottleBeer: Number.isNaN(v) ? 4 : v })}
                        />
                    </div>
                )}
            </div>

            {/* ============ Trin 2: vælg model ============ */}
            <div className="mt-6">
                <StepHeading
                    step={2}
                    title="Vælg betalingsmodel"
                    description="Prik den model af, der skal tælle med i budgettet. Den anden bliver stående til sammenligning."
                />

                <RadioGroup
                    aria-label="Betalingsmodel for drikkevarer"
                    value={drinks.mode}
                    onChange={(value) => {
                        if (value === "adlibitum" || value === "consumption")
                            patchDrinks({ mode: value });
                    }}
                >
                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* ---------------- Ad libitum ---------------- */}
                        <div
                            className={cx(
                                "overflow-hidden rounded-xl",
                                drinks.mode === "adlibitum"
                                    ? "bg-primary ring-2 ring-brand"
                                    : "bg-secondary ring-1 ring-secondary",
                            )}
                        >
                            <ModelHeader
                                id="adlibitum"
                                title="Ad libitum"
                                subtitle="Fast pris pr. person — fri bar i et antal timer"
                                cost={estimate.adLib}
                                chosen={drinks.mode === "adlibitum"}
                                isCheapest={cheaper === "adlibitum"}
                            />

                            <div className="space-y-4 px-4 py-3">
                                <CostLines cost={estimate.adLib} />

                                <div className="border-t border-secondary pt-3">
                                    <p className="text-sm font-medium text-secondary">Pakkens længde</p>
                                    <p className="mb-2 text-xs text-tertiary">
                                        Er pakken kortere end festen, betales de sidste timer efter
                                        forbrug oveni.
                                    </p>
                                    <RadioGroup
                                        aria-label="Pakkens længde"
                                        value={String(adLib.hours)}
                                        onChange={(value) => patchAdLib({ hours: Number(value) })}
                                        className="gap-2"
                                    >
                                        {adLibitumOptions.map((option) => {
                                            const heads =
                                                adLib.coverage === "all"
                                                    ? billableGuests
                                                    : scenario.guests.adults * c.drinkerShare;
                                            const covers = option.hours >= scenario.partyHours;
                                            return (
                                                <RadioButton
                                                    key={option.hours}
                                                    value={String(option.hours)}
                                                    size="md"
                                                    label={
                                                        <span className="flex flex-wrap items-center gap-x-2">
                                                            <span>{option.hours} timer</span>
                                                            <span className="text-sm text-tertiary">
                                                                {formatDKK(option.price)}/pers.
                                                            </span>
                                                            <span className="text-sm font-medium text-brand-secondary">
                                                                = {formatDKK(option.price * heads)}
                                                            </span>
                                                        </span>
                                                    }
                                                    hint={
                                                        covers
                                                            ? "Dækker hele festen"
                                                            : `Dækker kun ${option.hours} af ${scenario.partyHours} timer`
                                                    }
                                                />
                                            );
                                        })}
                                    </RadioGroup>
                                </div>

                                <div className="border-t border-secondary pt-3">
                                    <p className="mb-1.5 text-sm font-medium text-secondary">
                                        Hvem køber pakken?
                                    </p>
                                    <RadioGroup
                                        aria-label="Hvem køber pakken"
                                        value={adLib.coverage}
                                        onChange={(value) =>
                                            patchAdLib({ coverage: value as "all" | "drinkers_only" })
                                        }
                                        className="gap-2"
                                    >
                                        <RadioButton
                                            value="all"
                                            size="md"
                                            label="Alle gæster"
                                            hint="Voksne fuld pris, børn 2–12 halv. Sådan sælges den normalt."
                                        />
                                        <RadioButton
                                            value="drinkers_only"
                                            size="md"
                                            label="Kun dem der drikker"
                                            hint="Resten får sodavand efter forbrug. Kræver stedets ja."
                                        />
                                    </RadioGroup>
                                </div>
                            </div>
                        </div>

                        {/* ---------------- Efter forbrug ---------------- */}
                        <div
                            className={cx(
                                "overflow-hidden rounded-xl",
                                drinks.mode === "consumption"
                                    ? "bg-primary ring-2 ring-brand"
                                    : "bg-secondary ring-1 ring-secondary",
                            )}
                        >
                            <ModelHeader
                                id="consumption"
                                title="Efter forbrug"
                                subtitle="I betaler kun for det der faktisk bliver drukket"
                                cost={estimate.consumption}
                                chosen={drinks.mode === "consumption"}
                                isCheapest={cheaper === "consumption"}
                            />

                            <div className="space-y-4 px-4 py-3">
                                <CostLines cost={estimate.consumption} />

                                <div className="border-t border-secondary pt-3">
                                    <p className="text-sm font-medium text-secondary">
                                        Ingen ekstra indstillinger
                                    </p>
                                    <p className="mt-1 text-xs text-tertiary">
                                        Prisen kommer direkte fra trin 1 og festens længde (
                                        {scenario.partyHours} timer). Skru på skyderne ovenfor for at
                                        se den ændre sig.
                                    </p>
                                </div>

                                <div className="rounded-lg bg-secondary p-3">
                                    <p className="text-xs font-medium text-secondary">Sådan regnes den</p>
                                    <ul className="mt-1 space-y-1 text-xs text-tertiary">
                                        <li>
                                            {drinkers} drikkende × {formatNumber(drinksPerGuest, 1)}{" "}
                                            genstande hver ={" "}
                                            {formatNumber(estimate.consumption.alcoholUnits, 0)} genstande
                                        </li>
                                        <li>
                                            + sodavand til de{" "}
                                            {Math.round(
                                                scenario.guests.adults * (1 - c.drinkerShare) +
                                                    scenario.guests.children,
                                            )}{" "}
                                            der ikke drikker alkohol
                                        </li>
                                        <li>Ingen fast pakkepris — intet spild hvis der drikkes lidt.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </RadioGroup>
            </div>

            {/* ============ Trin 3: uanset model ============ */}
            <div className="mt-6">
                <StepHeading
                    step={3}
                    title="Lægges oveni uanset model"
                    description="Angiv antal glas pr. gæst. 1 betyder ét glas til hver."
                />

                <div className="flex flex-col divide-y divide-secondary overflow-hidden rounded-xl bg-secondary">
                    {welcomeDrinksGroup.items.map((item) => {
                        const qty = scenario.quantities[item.id] ?? 0;
                        // Ordering plain beer/wine/soft alongside ad libitum double-pays.
                        const overlaps =
                            drinks.mode === "adlibitum" && Boolean(item.coveredByAdLibitum) && qty > 0;
                        return (
                            <div key={item.id} className={cx("px-4", overlaps && "bg-warning-primary")}>
                                <FieldRow
                                    label={item.name}
                                    hint={
                                        overlaps
                                            ? "Øl/vin/læske — ad libitum-pakken dækker den allerede. I betaler dobbelt."
                                            : `${formatDKK(item.price)} pr. glas${qty > 0 ? ` · i alt ${formatDKK(qty * billableGuests * item.price)}` : ""}${item.highlighted ? " · markeret på prislisten" : ""}`
                                    }
                                >
                                    <InputNumber
                                        aria-label={`Glas pr. gæst af ${item.name}`}
                                        minValue={0}
                                        maxValue={10}
                                        step={0.5}
                                        value={qty}
                                        onChange={(v) =>
                                            onChange({
                                                quantities: {
                                                    ...scenario.quantities,
                                                    [item.id]: Number.isNaN(v) ? 0 : v,
                                                },
                                            })
                                        }
                                        className="w-32"
                                    />
                                </FieldRow>
                            </div>
                        );
                    })}

                    <div className="px-4">
                        <FieldRow
                            label="Medbragt vin"
                            hint={`Proppenge ${formatDKK(CORKAGE_PER_BOTTLE)} pr. flaske`}
                        >
                            <InputNumber
                                aria-label="Antal medbragte flasker"
                                minValue={0}
                                value={drinks.ownWineBottles}
                                onChange={(v) => patchDrinks({ ownWineBottles: Number.isNaN(v) ? 0 : v })}
                                className="w-32"
                            />
                        </FieldRow>
                    </div>
                </div>
            </div>
        </Section>
    );
};
