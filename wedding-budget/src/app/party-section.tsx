import { rules, venueOptions } from "@/data/catalog";
import type { Scenario } from "@/domain/types";
import { formatDKK } from "@/domain/pricing";
import { Badge } from "@/components/base/badges/badges";
import { InputNumber } from "@/components/base/input/input-number";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { Slider } from "@/components/base/slider/slider";
import { Toggle } from "@/components/base/toggle/toggle";
import { FieldRow, Section } from "./section";

interface Props {
    scenario: Scenario;
    headcount: number;
    onChange: (patch: Partial<Scenario>) => void;
}

export const PartySection = ({ scenario, headcount, onChange }: Props) => {
    const { guests } = scenario;

    const selectedVenue = venueOptions.find((v) => v.id === scenario.venueId) ?? null;

    return (
        <Section
            title="Selskabet"
            description={`${headcount} personer i alt · ${scenario.partyHours} timers fest`}
        >
            <div className="grid gap-4 sm:grid-cols-3">
                <InputNumber
                    label="Voksne"
                    minValue={0}
                    value={guests.adults}
                    onChange={(v) => onChange({ guests: { ...guests, adults: Number.isNaN(v) ? 0 : v } })}
                    hint={`Min. ${rules.minAdults} for at leje lokale`}
                />
                <InputNumber
                    label="Børn 2–12 år"
                    minValue={0}
                    value={guests.children}
                    onChange={(v) => onChange({ guests: { ...guests, children: Number.isNaN(v) ? 0 : v } })}
                    hint="Halv pris"
                />
                <InputNumber
                    label="Børn under 2 år"
                    minValue={0}
                    value={guests.toddlers}
                    onChange={(v) => onChange({ guests: { ...guests, toddlers: Number.isNaN(v) ? 0 : v } })}
                    hint="Gratis uden opdækning"
                />
            </div>

            <div className="mt-6">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-secondary">Festens længde</p>
                    <Badge type="pill-color" color="gray" size="sm">
                        {scenario.partyHours} timer
                    </Badge>
                </div>
                <p className="mb-2 text-xs text-tertiary">
                    Bruges til at beregne forbrug og til at se om ad libitum-pakken dækker hele festen.
                </p>
                <Slider
                    minValue={3}
                    maxValue={12}
                    step={1}
                    value={scenario.partyHours}
                    onChange={(v) => onChange({ partyHours: Array.isArray(v) ? v[0] : v })}
                    formatOptions={{ style: "decimal" }}
                />
            </div>

            <div className="mt-8">
                <p className="text-sm font-medium text-secondary">Lokale</p>
                <p className="mb-3 text-xs text-tertiary">
                    Lokalelejen er en fast pris uanset antal gæster.
                </p>
                <RadioGroup
                    value={scenario.venueId ?? ""}
                    onChange={(value) => onChange({ venueId: value || null })}
                    className="gap-3"
                >
                    {venueOptions.map((venue) => {
                        const tooSmall = headcount < venue.minGuests;
                        const tooBig = venue.maxGuests !== null && headcount > venue.maxGuests;
                        const range = `${venue.minGuests}–${venue.maxGuests ?? "∞"} personer`;
                        return (
                            <RadioButton
                                key={venue.id}
                                value={venue.id}
                                size="md"
                                label={`${venue.name} — ${formatDKK(venue.price)}`}
                                hint={
                                    tooSmall
                                        ? `${range} · for få gæster (${headcount})`
                                        : tooBig
                                          ? `${range} · for mange gæster (${headcount})`
                                          : venue.includesSetup
                                            ? `${range} · inkl. opdækning, blomster, levende lys og servering`
                                            : range
                                }
                            />
                        );
                    })}
                </RadioGroup>
            </div>

            <div className="mt-6 border-t border-secondary pt-2">
                <FieldRow
                    label="Opdækning med hvide duge og stofservietter"
                    hint={
                        selectedVenue?.includesSetup && scenario.trustIncludedSetup
                            ? "Inkluderet i lokalelejen — koster ikke ekstra"
                            : "25 kr. pr. betalende gæst"
                    }
                >
                    <Toggle
                        isSelected={scenario.opdaekning}
                        onChange={(v) => onChange({ opdaekning: v })}
                        size="md"
                    />
                </FieldRow>

                <FieldRow
                    label="Blomsterbuketter"
                    hint={
                        selectedVenue?.includesSetup && scenario.trustIncludedSetup
                            ? "Inkluderet i lokalelejen"
                            : "175 kr. pr. buket"
                    }
                >
                    <InputNumber
                        aria-label="Antal blomsterbuketter"
                        minValue={0}
                        value={scenario.quantities.blomsterbuketter ?? 0}
                        onChange={(v) =>
                            onChange({
                                quantities: {
                                    ...scenario.quantities,
                                    blomsterbuketter: Number.isNaN(v) ? 0 : v,
                                },
                            })
                        }
                        className="w-32"
                    />
                </FieldRow>

                {selectedVenue?.includesSetup && (
                    <FieldRow
                        label="Regn opdækning og blomster som inkluderet"
                        hint="Prislisten siger at lokalelejen for Elver- og Troldestuen dækker opdækning, blomster, postevand, levende lys, rengøring og servering. Slå fra for at prissætte dem separat."
                    >
                        <Toggle
                            isSelected={scenario.trustIncludedSetup}
                            onChange={(v) => onChange({ trustIncludedSetup: v })}
                            size="md"
                        />
                    </FieldRow>
                )}
            </div>
        </Section>
    );
};
