import { useMemo } from "react";
import {
    CartesianGrid,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { adLibitumOptions } from "@/data/catalog";
import type { Estimate, Scenario } from "@/domain/types";
import { adLibitumCost, consumptionCost, formatDKK, formatNumber } from "@/domain/pricing";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Section } from "./section";

const AD_LIB_COLOR = "var(--color-brand-600)";
const CONSUMPTION_COLOR = "var(--color-utility-blue-600)";

interface Props {
    scenario: Scenario;
    estimate: Estimate;
    onChange: (patch: Partial<Scenario>) => void;
}

interface ChartPoint {
    rate: number;
    adLib: number;
    consumption: number;
}

const CurveTooltip = ({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: { dataKey: string; value: number }[];
    label?: number;
}) => {
    if (!active || !payload?.length) return null;
    const adLib = payload.find((p) => p.dataKey === "adLib")?.value ?? 0;
    const consumption = payload.find((p) => p.dataKey === "consumption")?.value ?? 0;
    return (
        <div className="rounded-lg bg-primary px-3 py-2 text-sm shadow-lg ring-1 ring-secondary">
            <p className="font-semibold text-primary">
                {formatNumber(Number(label))} genstande/time
            </p>
            <p className="mt-1 flex items-center justify-between gap-4">
                <span className="text-tertiary">Ad libitum</span>
                <span className="font-medium text-primary tabular-nums">{formatDKK(adLib)}</span>
            </p>
            <p className="flex items-center justify-between gap-4">
                <span className="text-tertiary">Efter forbrug</span>
                <span className="font-medium text-primary tabular-nums">{formatDKK(consumption)}</span>
            </p>
            <p className="mt-1 border-t border-secondary pt-1 text-xs text-tertiary">
                {adLib <= consumption
                    ? `Ad libitum sparer ${formatDKK(consumption - adLib)}`
                    : `Efter forbrug sparer ${formatDKK(adLib - consumption)}`}
            </p>
        </div>
    );
};

export const Comparison = ({ scenario, estimate, onChange }: Props) => {
    const { adLib, consumption, adLibSaving, breakEvenDrinksPerHour } = estimate;

    const data = useMemo<ChartPoint[]>(() => {
        const points: ChartPoint[] = [];
        for (let rate = 0; rate <= 4.0001; rate += 0.1) {
            const r = Math.round(rate * 10) / 10;
            points.push({
                rate: r,
                adLib: adLibitumCost(scenario, r).total,
                consumption: consumptionCost(scenario, r).total,
            });
        }
        return points;
    }, [scenario]);

    /** Cheapest ad libitum package length for the current assumptions. */
    const bestPackage = useMemo(() => {
        return adLibitumOptions
            .map((option) => ({
                hours: option.hours,
                total: adLibitumCost({
                    ...scenario,
                    drinks: { ...scenario.drinks, adLib: { ...scenario.drinks.adLib, hours: option.hours } },
                }).total,
            }))
            .sort((a, b) => a.total - b.total)[0];
    }, [scenario]);

    const adLibWins = adLibSaving > 0;
    const cheapest = adLibWins ? adLib : consumption;
    const currentRate = scenario.drinks.consumption.drinksPerHour;

    return (
        <Section
            title="Ad libitum vs. efter forbrug"
            description="Samme fest, to måder at betale for øl og vin på."
            action={
                <Badge type="pill-color" color={adLibWins ? "success" : "blue"} size="lg">
                    {adLibWins ? "Ad libitum er billigst" : "Efter forbrug er billigst"}
                </Badge>
            }
        >
            <div className="grid gap-4 sm:grid-cols-2">
                {[
                    {
                        key: "adlibitum" as const,
                        title: "Ad libitum",
                        subtitle: `${scenario.drinks.adLib.hours} timers pakke`,
                        cost: adLib,
                        color: AD_LIB_COLOR,
                    },
                    {
                        key: "consumption" as const,
                        title: "Efter forbrug",
                        subtitle: `${formatNumber(currentRate)} genstande/time i ${scenario.partyHours} t`,
                        cost: consumption,
                        color: CONSUMPTION_COLOR,
                    },
                ].map((model) => {
                    const isActive = scenario.drinks.mode === model.key;
                    const isCheapest = model.cost.total === cheapest.total;
                    return (
                        <div
                            key={model.key}
                            className={
                                "rounded-xl p-4 ring-1 " +
                                (isActive ? "bg-brand-primary ring-brand" : "bg-secondary ring-secondary")
                            }
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                                        <span
                                            className="size-2.5 rounded-full"
                                            style={{ backgroundColor: model.color }}
                                        />
                                        {model.title}
                                    </p>
                                    <p className="text-xs text-tertiary">{model.subtitle}</p>
                                </div>
                                {isCheapest && (
                                    <Badge type="pill-color" color="success" size="sm">
                                        Billigst
                                    </Badge>
                                )}
                            </div>
                            <p className="mt-3 text-3xl font-semibold text-primary tabular-nums">
                                {formatDKK(model.cost.total)}
                            </p>
                            {model.cost.pricePerDrink !== null && (
                                <p className="mt-1 text-sm text-tertiary">
                                    {formatDKK(model.cost.pricePerDrink)} pr. genstand ·{" "}
                                    {formatNumber(model.cost.alcoholUnits, 0)} genstande i alt
                                </p>
                            )}
                            <ul className="mt-3 space-y-1 border-t border-secondary pt-3">
                                {model.cost.lines.map((line) => (
                                    <li key={line.id} className="text-xs">
                                        <div className="flex justify-between gap-3">
                                            <span className="text-secondary">{line.label}</span>
                                            <span className="shrink-0 font-medium text-primary tabular-nums">
                                                {formatDKK(line.amount)}
                                            </span>
                                        </div>
                                        <p className="text-tertiary">{line.detail}</p>
                                    </li>
                                ))}
                            </ul>
                            {!isActive && (
                                <Button
                                    size="sm"
                                    color="secondary"
                                    className="mt-3 w-full"
                                    onClick={() =>
                                        onChange({ drinks: { ...scenario.drinks, mode: model.key } })
                                    }
                                >
                                    Brug denne i budgettet
                                </Button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* --------------------------- Verdict --------------------------- */}
            <div className="mt-6 rounded-xl bg-secondary p-4">
                <p className="text-sm text-secondary">
                    {breakEvenDrinksPerHour === null ? (
                        <>
                            De to modeller krydser ikke hinanden med de nuværende antagelser — ad
                            libitum-pakken er{" "}
                            <strong className="text-primary">
                                {adLibWins ? "billigst uanset" : "dyrest uanset"}
                            </strong>{" "}
                            hvor meget der drikkes.
                        </>
                    ) : (
                        <>
                            Ad libitum begynder at betale sig fra{" "}
                            <strong className="text-primary">
                                {formatNumber(breakEvenDrinksPerHour, 2)} genstande
                            </strong>{" "}
                            pr. drikkende gæst pr. time. I regner lige nu med{" "}
                            <strong className="text-primary">{formatNumber(currentRate)}</strong> —
                            altså{" "}
                            <strong className={adLibWins ? "text-success-primary" : "text-primary"}>
                                {adLibWins ? "over" : "under"} grænsen
                            </strong>
                            .
                        </>
                    )}
                </p>
                <p className="mt-2 text-sm text-secondary">
                    Forskellen er{" "}
                    <strong className="text-primary">{formatDKK(Math.abs(adLibSaving))}</strong> — det
                    svarer til{" "}
                    <strong className="text-primary">
                        {formatDKK(Math.abs(adLibSaving) / Math.max(1, estimate.headcount))}
                    </strong>{" "}
                    pr. gæst.
                </p>
                {bestPackage && bestPackage.hours !== scenario.drinks.adLib.hours && (
                    <p className="mt-2 text-sm text-secondary">
                        Den billigste pakkelængde med jeres antagelser er{" "}
                        <strong className="text-primary">{bestPackage.hours} timer</strong> (
                        {formatDKK(bestPackage.total)}).{" "}
                        <button
                            type="button"
                            className="font-medium text-brand-secondary hover:underline"
                            onClick={() =>
                                onChange({
                                    drinks: {
                                        ...scenario.drinks,
                                        adLib: { ...scenario.drinks.adLib, hours: bestPackage.hours },
                                    },
                                })
                            }
                        >
                            Skift til den
                        </button>
                    </p>
                )}
            </div>

            {/* ---------------------------- Chart ---------------------------- */}
            <div className="mt-6">
                <p className="text-sm font-semibold text-primary">
                    Pris for drikkevarer efter hvor meget der drikkes
                </p>
                <p className="mb-3 text-xs text-tertiary">
                    Vandret akse: genstande pr. drikkende gæst pr. time. Der hvor linjerne krydser,
                    er de to modeller lige dyre.
                </p>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 24, left: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-secondary)" />
                            <XAxis
                                dataKey="rate"
                                type="number"
                                domain={[0, 4]}
                                ticks={[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4]}
                                tickFormatter={(v: number) => formatNumber(v)}
                                stroke="var(--color-text-tertiary)"
                                fontSize={12}
                                label={{
                                    value: "Genstande pr. drikkende gæst pr. time",
                                    position: "insideBottom",
                                    offset: -14,
                                    fill: "var(--color-text-tertiary)",
                                    fontSize: 12,
                                }}
                            />
                            <YAxis
                                stroke="var(--color-text-tertiary)"
                                fontSize={12}
                                width={72}
                                tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                            />
                            <Tooltip content={<CurveTooltip />} />
                            {breakEvenDrinksPerHour !== null && breakEvenDrinksPerHour <= 4 && (
                                <ReferenceLine
                                    x={breakEvenDrinksPerHour}
                                    stroke="var(--color-text-tertiary)"
                                    strokeDasharray="4 4"
                                    label={{
                                        value: `Balancepunkt ${formatNumber(breakEvenDrinksPerHour, 2)}`,
                                        position: "insideTopLeft",
                                        fill: "var(--color-text-tertiary)",
                                        fontSize: 11,
                                    }}
                                />
                            )}
                            <ReferenceLine
                                x={Math.min(4, currentRate)}
                                stroke="var(--color-text-primary)"
                                strokeWidth={1.5}
                                label={{
                                    value: "Jeres skøn",
                                    position: "insideTopRight",
                                    fill: "var(--color-text-primary)",
                                    fontSize: 11,
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="adLib"
                                name="Ad libitum"
                                stroke={AD_LIB_COLOR}
                                strokeWidth={2.5}
                                dot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="consumption"
                                name="Efter forbrug"
                                stroke={CONSUMPTION_COLOR}
                                strokeWidth={2.5}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-2 flex flex-wrap gap-4">
                    {[
                        { label: "Ad libitum", color: AD_LIB_COLOR },
                        { label: "Efter forbrug", color: CONSUMPTION_COLOR },
                    ].map((entry) => (
                        <span key={entry.label} className="flex items-center gap-2 text-sm text-secondary">
                            <span
                                className="h-0.5 w-5 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            {entry.label}
                        </span>
                    ))}
                </div>
            </div>
        </Section>
    );
};
