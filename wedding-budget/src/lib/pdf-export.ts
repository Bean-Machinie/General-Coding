import { jsPDF } from "jspdf";
import { adLibitumOptions, venueInfo, venueOptions } from "@/data/catalog";
import { adLibitumCost, consumptionCost } from "@/domain/pricing";
import type { CostCategory, Estimate, Scenario } from "@/domain/types";

type ScenarioTotal = { id: string; name: string; total: number };

interface ExportBudgetPdfOptions {
    scenario: Scenario;
    estimate: Estimate;
    comparisons: ScenarioTotal[];
}

type PdfColor = readonly [number, number, number];

const PAGE = { width: 210, height: 297, margin: 14 } as const;

/** Matches the light theme and section accents used by the web app. */
const COLORS = {
    background: [249, 250, 251] as PdfColor,
    card: [255, 255, 255] as PdfColor,
    primary: [24, 29, 39] as PdfColor,
    secondary: [65, 70, 81] as PdfColor,
    tertiary: [113, 118, 128] as PdfColor,
    border: [228, 231, 236] as PdfColor,
    muted: [242, 244, 247] as PdfColor,
    brand: [127, 86, 217] as PdfColor,
    brandSoft: [249, 245, 255] as PdfColor,
    blue: [46, 144, 250] as PdfColor,
    comparisonBlue: [21, 94, 239] as PdfColor,
    emerald: [18, 183, 106] as PdfColor,
    orange: [247, 144, 9] as PdfColor,
    amber: [247, 184, 45] as PdfColor,
    pink: [238, 70, 188] as PdfColor,
    purple: [155, 138, 251] as PdfColor,
    yellow: [247, 200, 0] as PdfColor,
    success: [7, 148, 85] as PdfColor,
    successSoft: [236, 253, 243] as PdfColor,
    warning: [181, 71, 8] as PdfColor,
    warningSoft: [255, 250, 235] as PdfColor,
    error: [217, 45, 32] as PdfColor,
} as const;

const CATEGORY_COLORS: Record<string, PdfColor> = {
    venue: COLORS.blue,
    drinks: COLORS.emerald,
    main_meal: COLORS.orange,
    reception: COLORS.amber,
    snacks: COLORS.yellow,
    sweets: COLORS.pink,
    natmad: COLORS.purple,
};

const sanitizePdfText = (value: string) => value.replace(/[\u2010-\u2015]/g, "-");

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("da-DK", {
        style: "currency",
        currency: "DKK",
        maximumFractionDigits: 0,
    }).format(Math.round(value));

const formatNumber = (value: number, maximumFractionDigits = 1) =>
    new Intl.NumberFormat("da-DK", { maximumFractionDigits }).format(value);

const formatPercent = (value: number) =>
    new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 }).format(value) + " %";

const setFill = (doc: jsPDF, color: PdfColor) => doc.setFillColor(color[0], color[1], color[2]);
const setDraw = (doc: jsPDF, color: PdfColor) => doc.setDrawColor(color[0], color[1], color[2]);
const setText = (doc: jsPDF, color: PdfColor) => doc.setTextColor(color[0], color[1], color[2]);

function text(
    doc: jsPDF,
    value: string,
    x: number,
    y: number,
    options: {
        size?: number;
        color?: PdfColor;
        weight?: "normal" | "bold";
        align?: "left" | "center" | "right";
        maxWidth?: number;
    } = {},
) {
    const {
        size = 9,
        color = COLORS.secondary,
        weight = "normal",
        align = "left",
        maxWidth,
    } = options;
    doc.setFont("helvetica", weight);
    doc.setFontSize(size);
    setText(doc, color);
    doc.text(sanitizePdfText(value), x, y, { align, maxWidth });
}

function wrap(doc: jsPDF, value: string, width: number) {
    return doc.splitTextToSize(sanitizePdfText(value), width) as string[];
}

function inlineText(
    doc: jsPDF,
    segments: { value: string; weight?: "normal" | "bold"; color?: PdfColor }[],
    x: number,
    y: number,
    size = 6.8,
) {
    let cursor = x;
    let previousHadTrailingSpace = false;
    segments.forEach((segment, index) => {
        const rawValue = sanitizePdfText(segment.value);
        const hasLeadingSpace = /^\s/.test(rawValue);
        if (index > 0 && (previousHadTrailingSpace || hasLeadingSpace)) cursor += 0.75;
        const value = rawValue.trim();
        doc.setFont("helvetica", segment.weight ?? "normal");
        doc.setFontSize(size);
        setText(doc, segment.color ?? COLORS.secondary);
        doc.text(value, cursor, y);
        cursor += doc.getTextWidth(value);
        previousHadTrailingSpace = /\s$/.test(rawValue);
    });
}

function card(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    options: { fill?: PdfColor; border?: PdfColor; radius?: number; accent?: PdfColor } = {},
) {
    const {
        fill = COLORS.card,
        border = COLORS.border,
        radius = 2.8,
        accent,
    } = options;
    setFill(doc, [235, 237, 240]);
    doc.roundedRect(x, y + 0.7, width, height, radius, radius, "F");
    setFill(doc, fill);
    setDraw(doc, border);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, width, height, radius, radius, "FD");
    if (accent) {
        setFill(doc, accent);
        doc.roundedRect(x, y, width, 1.7, radius, radius, "F");
        doc.rect(x, y + 0.8, width, 1, "F");
    }
}

function badge(doc: jsPDF, label: string, x: number, y: number, fill: PdfColor, color: PdfColor) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.7);
    const width = doc.getTextWidth(label) + 6;
    setFill(doc, fill);
    setDraw(doc, fill);
    doc.roundedRect(x, y, width, 6.5, 2.3, 2.3, "FD");
    text(doc, label, x + width / 2, y + 4.5, { size: 6.7, color, weight: "bold", align: "center" });
    return width;
}

function appHeader(doc: jsPDF, estimate: Estimate) {
    setFill(doc, COLORS.background);
    doc.rect(0, 0, PAGE.width, PAGE.height, "F");
    setFill(doc, COLORS.card);
    doc.rect(0, 0, PAGE.width, 28, "F");
    setDraw(doc, COLORS.border);
    doc.setLineWidth(0.25);
    doc.line(0, 28, PAGE.width, 28);

    text(doc, `Bryllupsbudget - ${venueInfo.name}`, PAGE.margin, 10, {
        size: 11,
        color: COLORS.primary,
        weight: "bold",
    });
    text(doc, `Selskabsprisliste ${venueInfo.priceListDate} · ${venueInfo.address}`, PAGE.margin, 16, {
        size: 6.8,
        color: COLORS.tertiary,
    });

    text(doc, "Samlet", PAGE.width - PAGE.margin, 8.5, {
        size: 6.5,
        color: COLORS.tertiary,
        align: "right",
    });
    text(doc, formatCurrency(estimate.total), PAGE.width - PAGE.margin, 17, {
        size: 14,
        color: COLORS.primary,
        weight: "bold",
        align: "right",
    });
}

function pageTitle(doc: jsPDF, title: string, subtitle: string) {
    text(doc, title, PAGE.margin, 42, { size: 16, color: COLORS.primary, weight: "bold" });
    text(doc, subtitle, PAGE.margin, 48.5, { size: 7.5, color: COLORS.tertiary });
}

function drawSegmentedBar(doc: jsPDF, estimate: Estimate, x: number, y: number, width: number, height: number) {
    const visible = estimate.categories.filter((category) => category.amount > 0);
    setFill(doc, COLORS.muted);
    doc.roundedRect(x, y, width, height, height / 2, height / 2, "F");
    if (visible.length === 0 || estimate.total <= 0) return;

    doc.saveGraphicsState();
    doc.roundedRect(x, y, width, height, height / 2, height / 2, null);
    doc.clip();
    doc.discardPath();
    let offset = 0;
    visible.forEach((category) => {
        const segmentWidth = (category.amount / estimate.total) * width;
        setFill(doc, CATEGORY_COLORS[category.id] ?? COLORS.tertiary);
        doc.rect(x + offset, y, segmentWidth + 0.05, height, "F");
        offset += segmentWidth;
    });
    doc.restoreGraphicsState();
}

function drawComparisonChart(
    doc: jsPDF,
    scenario: Scenario,
    estimate: Estimate,
    x: number,
    y: number,
    width: number,
    height: number,
) {
    const points = Array.from({ length: 41 }, (_, index) => {
        const drinks = index / 2;
        return {
            drinks,
            adLib: adLibitumCost(scenario, drinks).total,
            consumption: consumptionCost(scenario, drinks).total,
        };
    });
    const maxCost = Math.max(
        30000,
        Math.ceil(Math.max(...points.flatMap((point) => [point.adLib, point.consumption]), 1) / 30000) * 30000,
    );
    const toX = (drinks: number) => x + (drinks / 20) * width;
    const toY = (cost: number) => y + height - (cost / maxCost) * height;
    const xTicks = [0, 2, 4, 6, 8, 9, 10, 12, 14, 16, 18, 20];

    doc.setLineDashPattern([0.7, 0.8], 0);
    for (let index = 0; index <= 4; index += 1) {
        const cost = (maxCost / 4) * index;
        const gridY = toY(cost);
        setDraw(doc, COLORS.border);
        doc.setLineWidth(0.18);
        doc.line(x, gridY, x + width, gridY);
        text(doc, `${Math.round(cost / 1000)}k`, x - 1.5, gridY + 1.3, {
            size: 5.5,
            color: COLORS.tertiary,
            align: "right",
        });
    }

    xTicks.forEach((drinks) => {
        setDraw(doc, COLORS.border);
        doc.setLineWidth(0.18);
        doc.line(toX(drinks), y, toX(drinks), y + height);
        text(doc, String(drinks), toX(drinks), y + height + 5, {
            size: 5.5,
            color: COLORS.tertiary,
            align: "center",
        });
    });
    doc.setLineDashPattern([], 0);

    setDraw(doc, COLORS.tertiary);
    doc.setLineWidth(0.3);
    doc.line(x, y, x, y + height);
    doc.line(x, y + height, x + width, y + height);

    const drawLine = (key: "adLib" | "consumption", color: PdfColor) => {
        setDraw(doc, color);
        doc.setLineWidth(0.65);
        for (let index = 1; index < points.length; index += 1) {
            doc.line(
                toX(points[index - 1].drinks),
                toY(points[index - 1][key]),
                toX(points[index].drinks),
                toY(points[index][key]),
            );
        }
    };
    drawLine("adLib", COLORS.brand);
    drawLine("consumption", COLORS.comparisonBlue);

    const current = Math.min(20, scenario.drinks.consumption.drinksPerGuest);
    setDraw(doc, COLORS.primary);
    doc.setLineWidth(0.35);
    doc.line(toX(current), y, toX(current), y + height);
    text(doc, "Jeres skøn", toX(current) - 1, y + 3, {
        size: 5.3,
        color: COLORS.primary,
        align: "right",
    });

    if (estimate.breakEvenDrinksPerGuest !== null && estimate.breakEvenDrinksPerGuest <= 20) {
        const breakEven = Math.min(20, estimate.breakEvenDrinksPerGuest);
        setDraw(doc, COLORS.tertiary);
        doc.setLineWidth(0.28);
        doc.setLineDashPattern([1, 1], 0);
        doc.line(toX(breakEven), y, toX(breakEven), y + height);
        doc.setLineDashPattern([], 0);
        text(doc, `Balancepunkt ${formatNumber(breakEven)}`, toX(breakEven) + 1, y + 3, {
            size: 5.3,
            color: COLORS.secondary,
        });
    }
}

function drawBreakEvenPage(doc: jsPDF, scenario: Scenario, estimate: Estimate) {
    appHeader(doc, estimate);
    const width = PAGE.width - PAGE.margin * 2;
    const current = scenario.drinks.consumption.drinksPerGuest;
    const breakEven = estimate.breakEvenDrinksPerGuest;
    const saving = Math.abs(estimate.adLibSaving);
    const adLibWins = estimate.adLibSaving > 0;
    const cheapest = adLibWins ? "Ad libitum" : "Efter forbrug";
    const perGuestDifference = saving / Math.max(1, estimate.headcount);
    const bestPackage = adLibitumOptions
        .map((option) => ({
            hours: option.hours,
            total: adLibitumCost({
                ...scenario,
                drinks: { ...scenario.drinks, adLib: { ...scenario.drinks.adLib, hours: option.hours } },
            }).total,
        }))
        .sort((a, b) => a.total - b.total)[0];
    const beerShare = formatPercent(scenario.drinks.consumption.beerShare * 100);
    const wineShare = formatPercent((1 - scenario.drinks.consumption.beerShare) * 100);
    const priceBasisDescription = scenario.drinks.consumption.priceBasis === "bottle"
        ? `øl købt på 1,5 l kander og vin på 0,75 l flasker, vægtet ${beerShare} / ${wineShare}`
        : `priser pr. glas, vægtet efter øl/vin-fordelingen ${beerShare} / ${wineShare}`;
    const cardY = 39;

    card(doc, PAGE.margin, cardY, width, 219, { accent: COLORS.brand });
    text(doc, "Hvornår betaler ad libitum sig?", PAGE.margin + 4, cardY + 10, {
        size: 10,
        color: COLORS.primary,
        weight: "bold",
    });
    text(doc, "Samme fest, to måder at betale for øl og vin på.", PAGE.margin + 4, cardY + 16, {
        size: 6.8,
        color: COLORS.secondary,
    });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.7);
    const badgeLabel = `${cheapest} er billigst`;
    const badgeWidth = doc.getTextWidth(badgeLabel) + 6;
    badge(
        doc,
        badgeLabel,
        PAGE.width - PAGE.margin - 4 - badgeWidth,
        cardY + 5,
        adLibWins ? COLORS.successSoft : [239, 248, 255],
        adLibWins ? COLORS.success : COLORS.comparisonBlue,
    );
    setDraw(doc, COLORS.border);
    doc.setLineWidth(0.25);
    doc.line(PAGE.margin, cardY + 22, PAGE.width - PAGE.margin, cardY + 22);

    const boxX = PAGE.margin + 4;
    const boxY = cardY + 28;
    const boxWidth = width - 8;
    setFill(doc, [250, 250, 250]);
    doc.roundedRect(boxX, boxY, boxWidth, 46, 2.5, 2.5, "F");
    if (breakEven === null) {
        text(
            doc,
            "De to modeller krydser ikke hinanden med de nuværende antagelser.",
            boxX + 3,
            boxY + 9,
            { size: 6.8, color: COLORS.secondary },
        );
        inlineText(doc, [
            { value: "Ad libitum er " },
            { value: adLibWins ? "billigst uanset" : "dyrest uanset", weight: "bold", color: COLORS.primary },
            { value: " hvor meget der drikkes." },
        ], boxX + 3, boxY + 16);
    } else {
        inlineText(doc, [
            { value: "Ad libitum begynder at betale sig når hver drikkende gæst når op på " },
            { value: `${formatNumber(breakEven)} genstande`, weight: "bold", color: COLORS.primary },
            { value: " hen over festen." },
        ], boxX + 3, boxY + 8);
        inlineText(doc, [
            { value: "I regner lige nu med " },
            { value: `${formatNumber(current)} genstande`, weight: "bold", color: COLORS.primary },
            { value: ` hver - altså ${current < breakEven ? "under" : current > breakEven ? "over" : "på"} grænsen. Til sammenligning er dansk branchestandard 9.` },
        ], boxX + 3, boxY + 15);
    }
    inlineText(doc, [
        { value: "Forskellen er " },
        { value: formatCurrency(saving), weight: "bold", color: COLORS.primary },
        { value: " - svarende til " },
        { value: formatCurrency(perGuestDifference), weight: "bold", color: COLORS.primary },
        { value: " pr. gæst." },
    ], boxX + 3, boxY + 23);
    if (bestPackage && bestPackage.hours !== scenario.drinks.adLib.hours) {
        inlineText(doc, [
            { value: "Den billigste pakkelængde med jeres antagelser er " },
            { value: `${bestPackage.hours} timer`, weight: "bold", color: COLORS.primary },
            { value: ` (${formatCurrency(bestPackage.total)}).` },
        ], boxX + 3, boxY + 31);
    }
    inlineText(doc, [
        { value: "Pris pr. genstand regnes efter", weight: "bold", color: COLORS.primary },
        { value: `: ${priceBasisDescription}.` },
    ], boxX + 3, boxY + 39, 6.5);

    text(
        doc,
        "Vandret akse: genstande pr. drikkende gæst hen over hele festen. Der hvor linjerne krydser, er de to modeller lige dyre.",
        boxX,
        cardY + 83,
        { size: 6, color: COLORS.tertiary },
    );

    const chartX = PAGE.margin + 18;
    const chartY = cardY + 93;
    const chartWidth = width - 24;
    const chartHeight = 80;
    drawComparisonChart(doc, scenario, estimate, chartX, chartY, chartWidth, chartHeight);
    text(doc, "Genstande pr. drikkende gæst (hele festen)", chartX + chartWidth / 2, chartY + chartHeight + 11, {
        size: 5.8,
        color: COLORS.secondary,
        align: "center",
    });

    const legendY = chartY + chartHeight + 22;
    setDraw(doc, COLORS.brand);
    doc.setLineWidth(0.65);
    doc.line(boxX, legendY, boxX + 6, legendY);
    text(doc, "Ad libitum", boxX + 8, legendY + 1.5, { size: 6.5, color: COLORS.secondary });
    setDraw(doc, COLORS.comparisonBlue);
    doc.line(boxX + 27, legendY, boxX + 33, legendY);
    text(doc, "Efter forbrug", boxX + 35, legendY + 1.5, { size: 6.5, color: COLORS.secondary });
}

function drawDashboard(doc: jsPDF, estimate: Estimate) {
    const fullWidth = PAGE.width - PAGE.margin * 2;

    card(doc, PAGE.margin, 55, fullWidth, 26);
    text(doc, "Samlet pris", PAGE.margin + 5, 65, { size: 8, color: COLORS.secondary, weight: "bold" });
    text(doc, `${estimate.headcount} gæster · ${formatNumber(estimate.billableGuests)} betalende`, PAGE.margin + 5, 75, {
        size: 7,
        color: COLORS.tertiary,
    });
    text(doc, formatCurrency(estimate.total), PAGE.width - PAGE.margin - 5, 71, {
        size: 22,
        color: COLORS.primary,
        weight: "bold",
        align: "right",
    });

    card(doc, PAGE.margin, 87, fullWidth, 21);
    text(doc, "Pr. gæst", PAGE.margin + 5, 99.5, { size: 8, color: COLORS.secondary, weight: "bold" });
    text(doc, formatCurrency(estimate.perGuest), PAGE.width - PAGE.margin - 5, 100, {
        size: 14,
        color: COLORS.primary,
        weight: "bold",
        align: "right",
    });

    const distributionY = 114;
    card(doc, PAGE.margin, distributionY, fullWidth, 59);
    text(doc, "Fordeling", PAGE.margin + 5, distributionY + 10, { size: 8.5, color: COLORS.primary, weight: "bold" });
    const barX = PAGE.margin + 5;
    const barY = distributionY + 15;
    const barWidth = fullWidth - 10;
    drawSegmentedBar(doc, estimate, barX, barY, barWidth, 4);

    const list = [...estimate.categories].sort((a, b) => b.amount - a.amount).slice(0, 6);
    const colWidth = (barWidth - 6) / 2;
    list.forEach((category, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x = barX + column * (colWidth + 6);
        const listY = barY + 11 + row * 8;
        setFill(doc, CATEGORY_COLORS[category.id] ?? COLORS.tertiary);
        doc.circle(x + 1.2, listY - 1, 1.1, "F");
        text(doc, category.label, x + 5, listY, { size: 7, color: COLORS.secondary, maxWidth: colWidth - 31 });
        text(doc, formatCurrency(category.amount), x + colWidth, listY, {
            size: 7,
            color: COLORS.primary,
            weight: "bold",
            align: "right",
        });
    });

}

function categoryHeight(doc: jsPDF, category: CostCategory) {
    return 19 + category.lines.reduce((height, line) => {
        const labelLines = wrap(doc, line.label, 86).length;
        const detailLines = wrap(doc, line.detail, 118).length;
        return height + Math.max(11, 6 + labelLines * 3.8 + detailLines * 3.4);
    }, 0);
}

function drawCategoryCard(doc: jsPDF, category: CostCategory, estimate: Estimate, y: number) {
    const width = PAGE.width - PAGE.margin * 2;
    const height = categoryHeight(doc, category);
    const accent = CATEGORY_COLORS[category.id] ?? COLORS.brand;
    const share = estimate.total > 0 ? (category.amount / estimate.total) * 100 : 0;
    card(doc, PAGE.margin, y, width, height, { accent });
    text(doc, category.label, PAGE.margin + 6, y + 10.5, { size: 9, color: COLORS.primary, weight: "bold" });
    text(doc, `${formatPercent(share)} af budgettet`, PAGE.margin + 6, y + 16, {
        size: 6.5,
        color: COLORS.tertiary,
    });
    text(doc, formatCurrency(category.amount), PAGE.width - PAGE.margin - 6, y + 12, {
        size: 11,
        color: COLORS.primary,
        weight: "bold",
        align: "right",
    });

    let cursor = y + 19;
    category.lines.forEach((line, index) => {
        const labelLines = wrap(doc, line.label, 86);
        const detailLines = wrap(doc, line.detail, 118);
        const rowHeight = Math.max(11, 6 + labelLines.length * 3.8 + detailLines.length * 3.4);
        if (index > 0) {
            setDraw(doc, COLORS.border);
            doc.setLineWidth(0.2);
            doc.line(PAGE.margin + 6, cursor, PAGE.width - PAGE.margin - 6, cursor);
        }
        text(doc, labelLines.join("\n"), PAGE.margin + 6, cursor + 5, {
            size: 7.5,
            color: COLORS.secondary,
            weight: "bold",
        });
        text(doc, detailLines.join("\n"), PAGE.margin + 6, cursor + 5 + labelLines.length * 3.8, {
            size: 6.5,
            color: COLORS.tertiary,
        });
        text(doc, formatCurrency(line.amount), PAGE.width - PAGE.margin - 6, cursor + 6, {
            size: 7.8,
            color: COLORS.primary,
            weight: "bold",
            align: "right",
        });
        cursor += rowHeight;
    });
    return height;
}

function drawCostDetails(doc: jsPDF, estimate: Estimate) {
    appHeader(doc, estimate);
    pageTitle(
        doc,
        "Prisposter",
        `${estimate.categories.length} kategorier · ${estimate.categories.reduce((sum, category) => sum + category.lines.length, 0)} valgte poster`,
    );

    let cursor = 55;
    estimate.categories.forEach((category) => {
        const height = categoryHeight(doc, category);
        if (cursor + height > 278) {
            doc.addPage();
            appHeader(doc, estimate);
            pageTitle(doc, "Prisposter - fortsat", "Alle beløb følger det aktive scenarie");
            cursor = 55;
        }
        cursor += drawCategoryCard(doc, category, estimate, cursor) + 5;
    });

    // The app header already carries the scenario total on every page, which
    // avoids a sparse total-only continuation page for compact scenarios.
}

function drawGuestCard(doc: jsPDF, scenario: Scenario, estimate: Estimate, y: number) {
    const width = PAGE.width - PAGE.margin * 2;
    card(doc, PAGE.margin, y, width, 46, { accent: COLORS.blue });
    text(doc, "Selskabet", PAGE.margin + 5, y + 11, { size: 9.5, color: COLORS.primary, weight: "bold" });
    text(doc, `${estimate.headcount} personer i alt · ${formatNumber(scenario.partyHours)} timers fest`, PAGE.margin + 5, y + 17, {
        size: 6.8,
        color: COLORS.tertiary,
    });

    const values = [
        ["Voksne", scenario.guests.adults, "Fuld pris"],
        ["Børn 2-12 år", scenario.guests.children, "Halv pris"],
        ["Børn under 2 år", scenario.guests.toddlers, "Gratis uden opdækning"],
    ] as const;
    const fieldWidth = (width - 20) / 3;
    values.forEach(([label, value, hint], index) => {
        const x = PAGE.margin + 5 + index * (fieldWidth + 5);
        text(doc, label, x, y + 25, { size: 6.8, color: COLORS.secondary, weight: "bold" });
        setFill(doc, COLORS.card);
        setDraw(doc, COLORS.border);
        doc.roundedRect(x, y + 28, fieldWidth, 9, 1.5, 1.5, "FD");
        text(doc, String(value), x + 3, y + 34, { size: 8, color: COLORS.primary });
        text(doc, hint, x, y + 42, { size: 6.2, color: COLORS.tertiary });
    });
}

function drawDrinkComparison(doc: jsPDF, scenario: Scenario, estimate: Estimate, y: number) {
    const width = PAGE.width - PAGE.margin * 2;
    card(doc, PAGE.margin, y, width, 76, { accent: COLORS.emerald });
    text(doc, "Drikkevarer", PAGE.margin + 5, y + 11, { size: 9.5, color: COLORS.primary, weight: "bold" });
    text(doc, "Samme fest, to måder at betale for øl og vin på.", PAGE.margin + 5, y + 17, {
        size: 6.8,
        color: COLORS.tertiary,
    });

    const gap = 5;
    const innerWidth = (width - 15) / 2;
    const models = [
        {
            mode: "adlibitum",
            title: "Ad libitum",
            amount: estimate.adLib.total,
            detail: `${formatNumber(scenario.drinks.adLib.hours)} timers pakke`,
        },
        {
            mode: "consumption",
            title: "Efter forbrug",
            amount: estimate.consumption.total,
            detail: `${formatNumber(scenario.drinks.consumption.drinksPerGuest)} genstande pr. drikkende`,
        },
    ];
    models.forEach((model, index) => {
        const selected = scenario.drinks.mode === model.mode;
        const x = PAGE.margin + 5 + index * (innerWidth + gap);
        card(doc, x, y + 22, innerWidth, 38, {
            fill: selected ? COLORS.brandSoft : COLORS.card,
            border: selected ? [214, 187, 251] : COLORS.border,
            radius: 2.3,
        });
        text(doc, model.title, x + 4, y + 31, { size: 8.2, color: COLORS.primary, weight: "bold" });
        badge(
            doc,
            selected ? "MED I BUDGETTET" : "SAMMENLIGNING",
            x + innerWidth - (selected ? 31 : 29),
            y + 26,
            selected ? [233, 215, 254] : COLORS.muted,
            selected ? COLORS.brand : COLORS.tertiary,
        );
        text(doc, formatCurrency(model.amount), x + 4, y + 43, {
            size: 13,
            color: COLORS.primary,
            weight: "bold",
        });
        text(doc, `${formatCurrency(model.amount / Math.max(1, estimate.billableGuests))} pr. betalende`, x + 4, y + 50, {
            size: 6.5,
            color: COLORS.tertiary,
        });
        text(doc, model.detail, x + 4, y + 56, { size: 6.5, color: COLORS.tertiary });
    });

    const saving = Math.abs(estimate.adLibSaving);
    const cheapest = estimate.adLibSaving >= 0 ? "Ad libitum" : "Efter forbrug";
    text(doc, `${cheapest} er billigst med ${formatCurrency(saving)}`, PAGE.margin + 5, y + 69, {
        size: 7.5,
        color: COLORS.success,
        weight: "bold",
    });
    text(
        doc,
        estimate.breakEvenDrinksPerGuest === null
            ? "Intet relevant balancepunkt"
            : `Balancepunkt ${formatNumber(estimate.breakEvenDrinksPerGuest)} genstande pr. drikkende`,
        PAGE.width - PAGE.margin - 5,
        y + 69,
        { size: 6.8, color: COLORS.tertiary, align: "right" },
    );
}

function drawNotes(doc: jsPDF, estimate: Estimate, y: number) {
    const width = PAGE.width - PAGE.margin * 2;
    const shown = estimate.warnings.slice(0, 3);
    if (shown.length === 0) return 0;

    const height = 17 + shown.length * 6.5;
    card(doc, PAGE.margin, y, width, height, { fill: COLORS.warningSoft, border: [254, 223, 137] });
    text(doc, "Ting at være opmærksom på", PAGE.margin + 5, y + 9, {
        size: 8,
        color: COLORS.warning,
        weight: "bold",
    });
    shown.forEach((warning, index) => {
        text(doc, `•  ${wrap(doc, warning, width - 15).slice(0, 1).join("")}`, PAGE.margin + 6, y + 16 + index * 6.5, {
            size: 6.6,
            color: COLORS.warning,
        });
    });
    return height;
}

function drawAssumptionsPage(doc: jsPDF, scenario: Scenario, estimate: Estimate) {
    appHeader(doc, estimate);
    pageTitle(doc, "Forudsætninger & sammenligning", "Det aktive scenarie samlet i en beslutningsklar oversigt");
    drawGuestCard(doc, scenario, estimate, 55);
    drawDrinkComparison(doc, scenario, estimate, 107);
    const notesHeight = drawNotes(doc, estimate, 189);
    const infoY = notesHeight > 0 ? 195 + notesHeight : 189;
    const width = PAGE.width - PAGE.margin * 2;
    card(doc, PAGE.margin, infoY, width, 38);
    text(doc, "Om estimatet", PAGE.margin + 5, infoY + 10, {
        size: 8.5,
        color: COLORS.primary,
        weight: "bold",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    text(
        doc,
        wrap(
            doc,
            "Beløbene følger gæstetal, menuvalg og drikkeantagelser i det aktive scenarie. Dokumentet er et planlægningsværktøj og ikke et bindende tilbud.",
            width - 10,
        ).join("\n"),
        PAGE.margin + 5,
        infoY + 18,
        { size: 6.8, color: COLORS.secondary },
    );
    text(doc, venueInfo.disclaimer, PAGE.margin + 5, infoY + 32, {
        size: 6.2,
        color: COLORS.tertiary,
        maxWidth: width - 10,
    });
}

function addFooters(doc: jsPDF, generatedAt: Date) {
    const pages = doc.getNumberOfPages();
    const date = new Intl.DateTimeFormat("da-DK", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(generatedAt);
    for (let page = 1; page <= pages; page += 1) {
        doc.setPage(page);
        setDraw(doc, COLORS.border);
        doc.setLineWidth(0.25);
        doc.line(PAGE.margin, 285, PAGE.width - PAGE.margin, 285);
        text(doc, `Genereret ${date} · Estimat, ikke bindende tilbud`, PAGE.margin, 291, {
            size: 6,
            color: COLORS.tertiary,
        });
        text(doc, `${page} / ${pages}`, PAGE.width - PAGE.margin, 291, {
            size: 6,
            color: COLORS.tertiary,
            weight: "bold",
            align: "right",
        });
    }
}

function slugify(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();
}

export function buildWeddingBudgetPdf({ scenario, estimate }: ExportBudgetPdfOptions) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const selectedVenue = venueOptions.find((venue) => venue.id === scenario.venueId)?.name ?? "Lokale ikke valgt";
    doc.setProperties({
        title: `Bryllupsbudget - ${scenario.name}`,
        subject: `Budgetoverblik for ${scenario.name} · ${selectedVenue}`,
        author: "Bryllupsbudget",
        creator: "Bryllupsbudget",
        keywords: "bryllup, budget, Skovlyst, estimat",
    });

    appHeader(doc, estimate);
    pageTitle(doc, "Budgetoverblik", "Det vigtigste fra jeres aktive scenarie - samlet som i appen");
    drawDashboard(doc, estimate);

    doc.addPage();
    drawCostDetails(doc, estimate);

    doc.addPage();
    drawAssumptionsPage(doc, scenario, estimate);

    doc.addPage();
    drawBreakEvenPage(doc, scenario, estimate);

    addFooters(doc, new Date());
    return doc;
}

export function exportWeddingBudgetPdf(options: ExportBudgetPdfOptions) {
    buildWeddingBudgetPdf(options).save(`bryllupsbudget-${slugify(options.scenario.name) || "scenarie"}.pdf`);
}
