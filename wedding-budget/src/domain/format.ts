export function formatDKK(value: number): string {
    return new Intl.NumberFormat("da-DK", {
        style: "currency",
        currency: "DKK",
        maximumFractionDigits: 0,
    }).format(Math.round(value));
}

export function formatNumber(value: number, digits = 1): string {
    return new Intl.NumberFormat("da-DK", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(value);
}
