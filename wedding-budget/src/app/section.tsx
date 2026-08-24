import type { ReactNode } from "react";
import { cx } from "@/utils/cx";

interface SectionProps {
    title: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}

export const Section = ({ title, description, action, children, className }: SectionProps) => (
    <section className={cx("rounded-xl bg-primary shadow-xs ring-1 ring-secondary", className)}>
        <header className="flex items-start justify-between gap-4 border-b border-secondary px-5 py-4">
            <div>
                <h2 className="text-lg font-semibold text-primary">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-tertiary">{description}</p>}
            </div>
            {action}
        </header>
        <div className="px-5 py-4">{children}</div>
    </section>
);

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
