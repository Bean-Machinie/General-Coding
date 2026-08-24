import { Fragment } from "react";
import {
    mainMealGroup,
    natmadGroup,
    receptionGroup,
    snacksGroup,
    softConflicts,
    sweetsGroup,
} from "@/data/catalog";
import type { CatalogGroup, CatalogItem } from "@/data/catalog";
import type { Scenario } from "@/domain/types";
import { formatDKK } from "@/domain/pricing";
import { Badge } from "@/components/base/badges/badges";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { Toggle } from "@/components/base/toggle/toggle";
import { Section } from "./section";

interface Props {
    scenario: Scenario;
    billableGuests: number;
    onChange: (patch: Partial<Scenario>) => void;
}

const StarredBadge = () => (
    <Badge type="pill-color" color="brand" size="sm">
        Markeret
    </Badge>
);

const ItemLabel = ({ item, lineTotal }: { item: CatalogItem; lineTotal: number }) => (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>{item.name}</span>
        <span className="text-sm text-tertiary">{formatDKK(item.price)}/pers.</span>
        {item.highlighted && <StarredBadge />}
        <span className="text-sm font-medium text-brand-secondary">= {formatDKK(lineTotal)}</span>
    </span>
);

export const FoodSection = ({ scenario, billableGuests, onChange }: Props) => {
    const toggleItem = (id: string, on: boolean) => {
        const selected = on
            ? [...scenario.selected, id]
            : scenario.selected.filter((existing) => existing !== id);
        onChange({ selected });
    };

    const activeConflicts = softConflicts.filter((c) =>
        c.items.every((id) => scenario.selected.includes(id)),
    );

    const multiGroup = (group: CatalogGroup) => (
        <div key={group.id} className="mt-6 first:mt-0">
            <p className="text-sm font-semibold text-primary">{group.title}</p>
            {group.note && <p className="mb-2 text-xs text-tertiary">{group.note}</p>}
            <div className="mt-2 flex flex-col gap-2.5">
                {group.items.map((item) => {
                    const useAlt = Boolean(scenario.useAltPrice[item.id]);
                    const price = useAlt && item.altPrice ? item.altPrice : item.price;
                    return (
                        <Fragment key={item.id}>
                            <Checkbox
                                size="md"
                                isSelected={scenario.selected.includes(item.id)}
                                onChange={(on) => toggleItem(item.id, on)}
                                label={
                                    <ItemLabel
                                        item={{ ...item, price }}
                                        lineTotal={price * billableGuests}
                                    />
                                }
                                hint={item.note}
                            />
                            {item.altPrice && scenario.selected.includes(item.id) && (
                                <div className="ml-7 -mt-1">
                                    <Toggle
                                        size="sm"
                                        isSelected={useAlt}
                                        onChange={(on) =>
                                            onChange({
                                                useAltPrice: { ...scenario.useAltPrice, [item.id]: on },
                                            })
                                        }
                                        label={`${item.altLabel} i stedet (${formatDKK(item.altPrice)})`}
                                    />
                                </div>
                            )}
                        </Fragment>
                    );
                })}
            </div>
        </div>
    );

    return (
        <Section
            title="Mad"
            description="Priserne er pr. betalende gæst — børn 2–12 år tæller som en halv."
        >
            <div>
                <p className="text-sm font-semibold text-primary">{mainMealGroup.title}</p>
                <p className="mb-3 text-xs text-tertiary">{mainMealGroup.note}</p>
                <RadioGroup
                    value={scenario.mainMealId ?? ""}
                    onChange={(value) => onChange({ mainMealId: value || null })}
                    className="gap-2.5"
                >
                    {mainMealGroup.items.map((item) => (
                        <RadioButton
                            key={item.id}
                            value={item.id}
                            size="md"
                            label={<ItemLabel item={item} lineTotal={item.price * billableGuests} />}
                        />
                    ))}
                </RadioGroup>
                {scenario.mainMealId && (
                    <button
                        type="button"
                        onClick={() => onChange({ mainMealId: null })}
                        className="mt-3 text-sm font-medium text-brand-secondary hover:underline"
                    >
                        Ryd valg af hovedmåltid
                    </button>
                )}
            </div>

            {[receptionGroup, snacksGroup, sweetsGroup, natmadGroup].map(multiGroup)}

            {activeConflicts.length > 0 && (
                <div className="mt-6 rounded-lg bg-warning-primary px-4 py-3">
                    <p className="text-sm font-semibold text-warning-primary">Dobbelt op?</p>
                    <ul className="mt-1 list-disc pl-5 text-sm text-warning-primary">
                        {activeConflicts.map((c) => (
                            <li key={c.message}>{c.message}</li>
                        ))}
                    </ul>
                </div>
            )}
        </Section>
    );
};
