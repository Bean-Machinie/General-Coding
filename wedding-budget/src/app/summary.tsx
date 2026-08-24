import { useState } from "react";
import { AlertTriangle, ChevronDown } from "@untitledui/icons";
import type { Estimate, Scenario } from "@/domain/types";
import { formatDKK, formatNumber } from "@/domain/pricing";
import { Gauge, GaugeIndicator, GaugeRange, GaugeTrack, GaugeValueText } from "@/components/ui/gauge";
import { Stat, StatDescription, StatLabel, StatValue } from "@/components/ui/stat";
import { InputNumber } from "@/components/base/input/input-number";
import { cx } from "@/utils/cx";
import { ACCENTS } from "./accents";

interface Props {
    scenario: Scenario;
    estimate: Estimate;
    onChange: (patch: Partial<Scenario>) => void;
}

/** Budget-slice colours. Venue/drinks/food reuse the section accents so a
    section header and its slice of the budget read as the same thing. */
const CATEGORY_COLORS: Record<string, string> = {
    venue: ACCENTS.venue,
    drinks: ACCENTS.drinks,
    main_meal: ACCENTS.food,
    reception: "var(--color-utility-amber-500)",
    snacks: "var(--color-utility-yellow-500)",
    sweets: "var(--color-utility-pink-500)",
    natmad: "var(--color-utility-purple-500)",
};

const colorFor = (id: string) => CATEGORY_COLORS[id] ?? "var(--color-utility-neutral-500)";

export const Summary = ({ scenario, estimate, onChange }: Props) => {
    const [expanded, setExpanded] = useState<string | null>(null);

    const budgetUsed =
        scenario.budgetTarget > 0 ? (estimate.total / scenario.budgetTarget) * 100 : 0;
    const overBudget = estimate.total > scenario.budgetTarget && scenario.budgetTarget > 0;

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
                <Stat className="col-span-2">
                    <StatLabel>Samlet pris</StatLabel>
                    <StatValue className="text-4xl">{formatDKK(estimate.total)}</StatValue>
                    <StatDescription>
                        {estimate.headcount} gæster ·{" "}
                        {formatNumber(estimate.billableGuests, 1)} betalende
                    </StatDescription>
                </Stat>

                <Stat>
                    <StatLabel>Pr. gæst</StatLabel>
                    <StatValue>{formatDKK(estimate.perGuest)}</StatValue>
                </Stat>

                <Stat>
                    <StatLabel>Pr. betalende</StatLabel>
                    <StatValue>{formatDKK(estimate.perBillableGuest)}</StatValue>
                </Stat>
            </div>

            {/* --------------------------- Budget --------------------------- */}
            <div className="rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary">
                <p className="text-sm font-semibold text-primary">Budget</p>
                <div className="mt-3 flex items-center gap-5">
                    <Gauge
                        value={Math.min(100, budgetUsed)}
                        max={100}
                        size={116}
                        thickness={10}
                    >
                        <GaugeIndicator>
                            <GaugeTrack />
                            {/* GaugeRange sets its own `text-primary`, so the accent colour
                                has to be applied here. Untitled UI's semantic brand *text*
                                tokens go neutral in dark mode, so drive the stroke off the
                                solid tokens instead — they stay branded in both themes. */}
                            <GaugeRange
                                style={{
                                    color: overBudget
                                        ? "var(--color-bg-error-solid)"
                                        : "var(--color-bg-brand-solid)",
                                }}
                            />
                        </GaugeIndicator>
                        <GaugeValueText className="text-lg font-semibold text-primary">
                            {`${Math.round(budgetUsed)}%`}
                        </GaugeValueText>
                    </Gauge>
                    <div className="min-w-0 flex-1">
                        <InputNumber
                            label="Jeres loft"
                            minValue={0}
                            step={5000}
                            value={scenario.budgetTarget}
                            onChange={(v) => onChange({ budgetTarget: Number.isNaN(v) ? 0 : v })}
                            formatOptions={{ style: "currency", currency: "DKK", maximumFractionDigits: 0 }}
                        />
                        <p
                            className={cx(
                                "mt-2 text-sm font-medium",
                                overBudget ? "text-error-primary" : "text-success-primary",
                            )}
                        >
                            {overBudget
                                ? `${formatDKK(estimate.total - scenario.budgetTarget)} over`
                                : `${formatDKK(scenario.budgetTarget - estimate.total)} tilbage`}
                        </p>
                    </div>
                </div>
            </div>

            {/* ------------------------- Warnings --------------------------- */}
            {estimate.warnings.length > 0 && (
                <div className="rounded-xl bg-warning-primary p-4 ring-1 ring-secondary">
                    <p className="flex items-center gap-2 text-sm font-semibold text-warning-primary">
                        <AlertTriangle className="size-4 shrink-0" />
                        Ting at være opmærksom på
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-warning-primary">
                        {estimate.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ------------------------ Breakdown --------------------------- */}
            <div className="rounded-xl bg-primary shadow-xs ring-1 ring-secondary">
                <div className="border-b border-secondary px-5 py-4">
                    <p className="text-sm font-semibold text-primary">Fordeling</p>
                    <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-quaternary">
                        {estimate.categories.map((category) => (
                            <span
                                key={category.id}
                                title={`${category.label}: ${formatDKK(category.amount)}`}
                                style={{
                                    width: `${estimate.total > 0 ? (category.amount / estimate.total) * 100 : 0}%`,
                                    backgroundColor: colorFor(category.id),
                                }}
                            />
                        ))}
                    </div>
                </div>

                <ul className="divide-y divide-secondary">
                    {estimate.categories.map((category) => {
                        const isOpen = expanded === category.id;
                        const share = estimate.total > 0 ? (category.amount / estimate.total) * 100 : 0;
                        return (
                            <li key={category.id}>
                                <button
                                    type="button"
                                    onClick={() => setExpanded(isOpen ? null : category.id)}
                                    className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-secondary"
                                >
                                    <span
                                        className="size-2.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: colorFor(category.id) }}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-primary">
                                            {category.label}
                                        </span>
                                        <span className="text-xs text-tertiary">
                                            {Math.round(share)} % af budgettet ·{" "}
                                            {formatDKK(category.amount / Math.max(1, estimate.headcount))} pr. gæst
                                        </span>
                                    </span>
                                    <span className="shrink-0 text-sm font-semibold text-primary tabular-nums">
                                        {formatDKK(category.amount)}
                                    </span>
                                    <ChevronDown
                                        className={cx(
                                            "size-4 shrink-0 text-fg-quaternary transition-transform",
                                            isOpen && "rotate-180",
                                        )}
                                    />
                                </button>

                                {isOpen && (
                                    <ul className="space-y-2 bg-secondary px-5 py-3">
                                        {category.lines.map((line) => (
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
                                )}
                            </li>
                        );
                    })}
                </ul>

                <div className="flex items-center justify-between border-t border-secondary px-5 py-4">
                    <span className="text-sm font-semibold text-primary">I alt</span>
                    <span className="text-lg font-semibold text-primary tabular-nums">
                        {formatDKK(estimate.total)}
                    </span>
                </div>
            </div>
        </div>
    );
};
