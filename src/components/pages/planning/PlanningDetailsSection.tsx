import { Children, type ReactNode } from "react";
import type { ItemIconTone } from "./planningTimelineTypes";

interface PlanningDetailsSectionProps {
    children: ReactNode;
    title: string;
    tone: ItemIconTone;
}

const SECTION_TITLE_CLASS_NAMES: Record<ItemIconTone, string> = {
    income: "text-emerald-100/90",
    expense: "text-orange-300/90",
    wishlist: "text-rose-400/90",
    neutral: "text-white/58",
};

const SECTION_LINE_CLASS_NAMES: Record<ItemIconTone, string> = {
    income: "bg-emerald-100/90",
    expense: "bg-orange-300/90",
    wishlist: "bg-rose-400/90",
    neutral: "bg-white/[0.12]",
};

export function PlanningDetailsSection({ children, title, tone }: PlanningDetailsSectionProps) {
    return (
        <section className="mt-2 first:mt-0">
            <div className="mb-1 flex w-full items-center gap-2 px-1">
                <span className={`h-3 w-0.5 rounded-full ${SECTION_LINE_CLASS_NAMES[tone]}`} aria-hidden />
                <h3 className={`text-xs font-medium ${SECTION_TITLE_CLASS_NAMES[tone]}`}>{title}</h3>
                <span className="text-xs tabular-nums text-white/35">{Children.count(children)}</span>
            </div>
            <div className="flex flex-col gap-1">{children}</div>
        </section>
    );
}
