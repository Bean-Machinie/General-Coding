import { useEffect, useMemo, useState } from "react";
import { Copy01, Moon01, Plus, Sun, Trash01 } from "@untitledui/icons";
import { venueInfo } from "@/data/catalog";
import { createDefaultScenario, loadState, saveState } from "@/domain/defaults";
import { billableGuests, estimate as computeEstimate, formatDKK, headcount } from "@/domain/pricing";
import type { Scenario } from "@/domain/types";
import { Button } from "@/components/base/buttons/button";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Input } from "@/components/base/input/input";
import { cx } from "@/utils/cx";
import { Comparison } from "@/app/comparison";
import { DrinksSection } from "@/app/drinks-section";
import { FoodSection } from "@/app/food-section";
import { PartySection } from "@/app/party-section";
import { Summary } from "@/app/summary";

export default function App() {
    const [scenarios, setScenarios] = useState<Scenario[]>(() => {
        const saved = loadState();
        return saved?.scenarios ?? [createDefaultScenario()];
    });
    const [activeId, setActiveId] = useState<string>(() => {
        const saved = loadState();
        return saved?.activeId ?? scenarios[0].id;
    });
    const [darkMode, setDarkMode] = useState(false);

    const active = scenarios.find((s) => s.id === activeId) ?? scenarios[0];

    useEffect(() => {
        saveState({ scenarios, activeId });
    }, [scenarios, activeId]);

    useEffect(() => {
        document.documentElement.classList.toggle("dark-mode", darkMode);
    }, [darkMode]);

    const update = (patch: Partial<Scenario>) =>
        setScenarios((prev) => prev.map((s) => (s.id === active.id ? { ...s, ...patch } : s)));

    const addScenario = () => {
        const copy: Scenario = {
            ...structuredClone(active),
            id: crypto.randomUUID(),
            name: `${active.name} (kopi)`,
        };
        setScenarios((prev) => [...prev, copy]);
        setActiveId(copy.id);
    };

    const removeScenario = (id: string) => {
        setScenarios((prev) => {
            const next = prev.filter((s) => s.id !== id);
            const remaining = next.length > 0 ? next : [createDefaultScenario()];
            if (id === activeId) setActiveId(remaining[0].id);
            return remaining;
        });
    };

    const estimate = useMemo(() => computeEstimate(active), [active]);
    const heads = headcount(active.guests);
    const billable = billableGuests(active.guests);

    /** Totals for every saved scenario, for the side-by-side strip. */
    const allTotals = useMemo(
        () => scenarios.map((s) => ({ id: s.id, name: s.name, total: computeEstimate(s).total })),
        [scenarios],
    );
    const cheapestId = allTotals.slice().sort((a, b) => a.total - b.total)[0]?.id;

    return (
        <div className="min-h-screen bg-secondary pb-16">
            <header className="sticky top-0 z-20 border-b border-secondary bg-primary/95 backdrop-blur">
                <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-lg font-semibold text-primary">
                            Bryllupsbudget — {venueInfo.name}
                        </h1>
                        <p className="truncate text-xs text-tertiary">
                            Selskabsprisliste {venueInfo.priceListDate} · {venueInfo.address}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden text-right sm:block">
                            <p className="text-xs text-tertiary">Samlet</p>
                            <p className="text-lg font-semibold text-primary tabular-nums">
                                {formatDKK(estimate.total)}
                            </p>
                        </div>
                        <Button
                            size="md"
                            color="tertiary"
                            aria-label="Skift mellem lyst og mørkt tema"
                            iconLeading={darkMode ? Sun : Moon01}
                            onClick={() => setDarkMode((v) => !v)}
                        />
                    </div>
                </div>

                {/* Scenario switcher */}
                <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 px-4 pb-3 sm:px-6">
                    <ButtonGroup
                        selectedKeys={[activeId]}
                        selectionMode="single"
                        onSelectionChange={(keys) => {
                            const next = [...keys][0];
                            if (typeof next === "string") setActiveId(next);
                        }}
                    >
                        {allTotals.map((s) => (
                            <ButtonGroupItem key={s.id} id={s.id}>
                                <span className="flex items-center gap-2">
                                    <span>{s.name}</span>
                                    <span
                                        className={cx(
                                            "tabular-nums",
                                            s.id === cheapestId && allTotals.length > 1
                                                ? "text-success-primary"
                                                : "text-tertiary",
                                        )}
                                    >
                                        {formatDKK(s.total)}
                                    </span>
                                </span>
                            </ButtonGroupItem>
                        ))}
                    </ButtonGroup>

                    <Button size="sm" color="secondary" iconLeading={Copy01} onClick={addScenario}>
                        Dupliker
                    </Button>
                    <Button
                        size="sm"
                        color="secondary"
                        iconLeading={Plus}
                        onClick={() => {
                            const fresh = createDefaultScenario({ name: `Scenarie ${scenarios.length + 1}` });
                            setScenarios((prev) => [...prev, fresh]);
                            setActiveId(fresh.id);
                        }}
                    >
                        Nyt
                    </Button>
                    {scenarios.length > 1 && (
                        <Button
                            size="sm"
                            color="tertiary"
                            iconLeading={Trash01}
                            onClick={() => removeScenario(active.id)}
                        >
                            Slet
                        </Button>
                    )}
                </div>
            </header>

            <main className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px]">
                <div className="flex flex-col gap-6">
                    <div className="rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary">
                        <Input
                            label="Navn på scenarie"
                            hint="Fx «100 gæster, 4 t ad libitum» — så kan du sammenligne flere ad gangen."
                            value={active.name}
                            onChange={(value) => update({ name: value })}
                        />
                    </div>

                    <PartySection scenario={active} headcount={heads} onChange={update} />
                    <DrinksSection
                        scenario={active}
                        estimate={estimate}
                        billableGuests={billable}
                        onChange={update}
                    />
                    <Comparison scenario={active} estimate={estimate} onChange={update} />
                    <FoodSection scenario={active} billableGuests={billable} onChange={update} />

                    <p className="px-1 text-xs text-tertiary">{venueInfo.disclaimer}</p>
                </div>

                <div className="lg:sticky lg:top-36 lg:self-start">
                    <Summary scenario={active} estimate={estimate} onChange={update} />
                </div>
            </main>
        </div>
    );
}
