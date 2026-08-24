import type { ReactNode } from "react";
import { cx } from "@/utils/cx";
import { ACCENTS } from "./accents";
import type { AccentKey } from "./accents";


interface SectionProps {
    title: string;
    description?: string;
    action?: ReactNode;
    accent?: AccentKey;
    icon?: ReactNode;
    children: ReactNode;
    className?: string;
}

export const Section = ({
    title,
    description,
    action,
    accent,
    icon,
    children,
    className,
}: SectionProps) => {
    const color = accent ? ACCENTS[accent] : undefined;
    return (
        <section
            className={cx(
                "overflow-hidden rounded-xl bg-primary shadow-xs ring-1 ring-secondary",
                className,
            )}
        >
            {color && <div className="h-1 w-full" style={{ backgroundColor: color }} />}
            <header className="flex items-start justify-between gap-4 border-b border-secondary px-5 py-4">
                <div className="flex min-w-0 items-start gap-3">
                    {icon && color && (
                        <span
                            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
                        >
                            {icon}
                        </span>
                    )}
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-primary">{title}</h2>
                        {description && <p className="mt-0.5 text-sm text-tertiary">{description}</p>}
                    </div>
                </div>
                {action}
            </header>
            <div className="px-5 py-4">{children}</div>
        </section>
    );
};

interface FieldRowProps {
    label: string;
    hint?: string;
    children: ReactNode;
}

export const FieldRow = ({ label, hint, children }: FieldRowProps) => (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2">
        <div className="min-w-0">
            <p className="text-sm font-medium text-secondary">{label}</p>
            {hint && <p className="text-xs text-tertiary">{hint}</p>}
        </div>
        <div className="shrink-0">{children}</div>
    </div>
);
