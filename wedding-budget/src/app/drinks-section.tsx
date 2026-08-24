import {
    CORKAGE_PER_BOTTLE,
    SPIRITS_SURCHARGE_PER_HOUR,
    adLibitumOptions,
    consumptionPrices,
    welcomeDrinksGroup,
} from "@/data/catalog";
import type { Scenario, WineType } from "@/domain/types";
import { blendedDrinkPrice, formatDKK, formatNumber } from "@/domain/pricing";
import { Badge } from "@/components/base/badges/badges";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { InputNumber } from "@/components/base/input/input-number";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { Select } from "@/components/base/select/select";
import { Slider } from "@/components/base/slider/slider";
import { Toggle } from "@/components/base/toggle/toggle";
import { FieldRow, Section } from "./section";

interface Props {
    scenario: Scenario;
    billableGuests: number;
    onChange: (patch: Partial<Scenario>) => void;
}

const wineOptions: { id: WineType; label: string }[] = [
    { id: "houseWhite", label: `${consumptionPrices.houseWhite.name} — ${consumptionPrices.houseWhite.glass} kr./glas` },
    { id: "houseRose", label: `${consumptionPrices.houseRose.name} — ${consumptionPrices.houseRose.glass} kr./glas` },
    { id: "houseRed", label: `${consumptionPrices.houseRed.name} — ${consumptionPrices.houseRed.glass} kr./glas` },
];

/** A labelled slider showing its current value on the right. */
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

export const DrinksSection = ({ scenario, billableGuests, onChange }: Props) => {
    const { drinks } = scenario;
    const { consumption: c, adLib } = drinks;

    const patchDrinks = (patch: Partial<typeof drinks>) =>
        onChange({ drinks: { ...drinks, ...patch } });

    const patchConsumption = (patch: Partial<typeof c>) =>
        patchDrinks({ consumption: { ...c, ...patch } });

    const patchAdLib = (patch: Partial<typeof adLib>) => patchDrinks({ adLib: { ...adLib, ...patch } });

    const drinkers = Math.round(scenario.guests.adults * c.drinkerShare);
    const unitPrice = blendedDrinkPrice(c);

    return (
        <Section
            title="Drikkevarer"
            description="Sammenlign ad libitum-pakken mod at betale efter forbrug."
        >
            <ButtonGroup
                selectedKeys={[drinks.mode]}
                selectionMode="single"
                onSelectionChange={(keys) => {
                    const next = [...keys][0];
                    if (next === "adlibitum" || next === "consumption") patchDrinks({ mode: next });
                }}
                className="w-full"
            >
                <ButtonGroupItem id="adlibitum" className="flex-1 justify-center">
                    Ad libitum
                </ButtonGroupItem>
                <ButtonGroupItem id="consumption" className="flex-1 justify-center">
                    Efter forbrug
                </ButtonGroupItem>
            </ButtonGroup>
            <p className="mt-2 text-xs text-tertiary">
                Skift mellem de to for at se hvad der ryger i totalen. Sammenligningen nedenfor
                regnes altid på begge modeller.
            </p>

            {/* ---------------- Forbrugsantagelser ---------------- */}
            <div className="mt-6 rounded-lg bg-secondary p-4">
                <p className="text-sm font-semibold text-primary">Hvor meget drikker gæsterne?</p>
                <p className="mb-2 text-xs text-tertiary">
                    Disse antagelser driver både «efter forbrug»-prisen og sammenligningen — og de
                    timer en for kort ad libitum-pakke ikke dækker.
                </p>

                <LabelledSlider
                    label="Andel af voksne der drikker alkohol"
                    display={`${Math.round(c.drinkerShare * 100)} % · ${drinkers} pers.`}
                    value={Math.round(c.drinkerShare * 100)}
                    min={0}
                    max={100}
                    step={5}
                    onChange={(v) => patchConsumption({ drinkerShare: v / 100 })}
                />

                <LabelledSlider
                    label="Genstande pr. drikkende gæst pr. time"
                    hint="1,5 er et normalt bryllupsgennemsnit over hele aftenen."
                    display={`${formatNumber(c.drinksPerHour)} /time`}
                    value={c.drinksPerHour}
                    min={0}
                    max={5}
                    step={0.1}
                    onChange={(v) => patchConsumption({ drinksPerHour: v })}
                />

                <LabelledSlider
                    label="Fordeling øl / vin"
                    hint={`Blandet enhedspris: ${formatDKK(unitPrice)} pr. genstand`}
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

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Select
                        label="Hvilken husvin?"
                        selectedKey={c.wineType}
                        onSelectionChange={(key) => patchConsumption({ wineType: key as WineType })}
                        items={wineOptions}
                    >
                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                    </Select>

                    <div>
                        <p className="mb-1.5 text-sm font-medium text-secondary">Afregnes efter</p>
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
                                Glas
                            </ButtonGroupItem>
                            <ButtonGroupItem id="bottle" className="flex-1 justify-center">
                                Flaske
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

            {/* ---------------- Ad libitum-pakken ---------------- */}
            <div className="mt-6">
                <p className="text-sm font-semibold text-primary">Ad libitum-pakke</p>
                <p className="mb-3 text-xs text-tertiary">
                    Øl, vin og læske ad libitum. Pakken vælges for et fast antal timer — dækker den
                    ikke hele festen, lægges de resterende timer på efter forbrug.
                </p>
                <RadioGroup
                    value={String(adLib.hours)}
                    onChange={(value) => patchAdLib({ hours: Number(value) })}
                    className="gap-2.5"
                >
                    {adLibitumOptions.map((option) => {
                        const heads =
                            adLib.coverage === "all"
                                ? billableGuests
                                : scenario.guests.adults * c.drinkerShare;
                        return (
                            <RadioButton
                                key={option.hours}
                                value={String(option.hours)}
                                size="md"
                                label={
                                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <span>{option.hours} timer</span>
                                        <span className="text-sm text-tertiary">
                                            {formatDKK(option.price)}/pers.
                                        </span>
                                        {option.highlighted && (
                                            <Badge type="pill-color" color="brand" size="sm">
                                                Markeret
                                            </Badge>
                                        )}
                                        <span className="text-sm font-medium text-brand-secondary">
                                            = {formatDKK(option.price * heads)}
                                        </span>
                                    </span>
                                }
                                hint={
                                    option.hours < scenario.partyHours
                                        ? `Dækker ${option.hours} af ${scenario.partyHours} timer`
                                        : undefined
                                }
                            />
                        );
                    })}
                </RadioGroup>

                <div className="mt-4 border-t border-secondary pt-2">
                    <FieldRow
                        label="Tillæg for spiritus (vodka, gin, rom)"
                        hint={`${formatDKK(SPIRITS_SURCHARGE_PER_HOUR)} pr. person pr. time i hele pakkens længde`}
                    >
                        <Toggle
                            isSelected={adLib.spirits}
                            onChange={(v) => patchAdLib({ spirits: v })}
                            size="md"
                        />
                    </FieldRow>
                </div>

                <div className="mt-2">
                    <p className="mb-1.5 text-sm font-medium text-secondary">Hvem køber pakken?</p>
                    <RadioGroup
                        value={adLib.coverage}
                        onChange={(value) =>
                            patchAdLib({ coverage: value as "all" | "drinkers_only" })
                        }
                        className="gap-2.5"
                    >
                        <RadioButton
                            value="all"
                            size="md"
                            label="Alle gæster"
                            hint="Voksne til fuld pris, børn 2–12 til halv. Det er sådan stedet normalt sælger den."
                        />
                        <RadioButton
                            value="drinkers_only"
                            size="md"
                            label="Kun dem der drikker"
                            hint="Resten får sodavand efter forbrug. Kræver at stedet siger ja."
                        />
                    </RadioGroup>
                </div>
            </div>

            {/* ---------------- Velkomstdrinks ---------------- */}
            <div className="mt-6 border-t border-secondary pt-4">
                <p className="text-sm font-semibold text-primary">{welcomeDrinksGroup.title}</p>
                <p className="mb-2 text-xs text-tertiary">
                    Serveres separat og indgår ikke i ad libitum. Angiv antal glas pr. gæst.
                </p>
                <div className="flex flex-col divide-y divide-secondary">
                    {welcomeDrinksGroup.items.map((item) => {
                        const qty = scenario.quantities[item.id] ?? 0;
                        return (
                            <FieldRow
                                key={item.id}
                                label={item.name}
                                hint={`${formatDKK(item.price)} pr. glas${qty > 0 ? ` · ${formatDKK(qty * billableGuests * item.price)}` : ""}${item.highlighted ? " · markeret" : ""}`}
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
                        );
                    })}
                </div>
            </div>

            <div className="mt-4 border-t border-secondary pt-2">
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
        </Section>
    );
};
