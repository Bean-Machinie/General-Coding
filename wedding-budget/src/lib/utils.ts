import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn-registry compatible class merger (used by DiceUI components). */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
