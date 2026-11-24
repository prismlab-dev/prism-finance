import type { ReactNode } from "react";
import { Surface } from "../ui/Surface";

interface SkeletonBlockProps {
    className?: string;
}

interface SkeletonPanelProps {
    children: ReactNode;
    className?: string;
}

export function SkeletonBlock({ className = "" }: SkeletonBlockProps) {
    return <div className={`animate-pulse rounded-lg bg-white/[0.07] ${className}`} />;
}

export function SkeletonLine({ className = "" }: SkeletonBlockProps) {
    return <SkeletonBlock className={`h-3 ${className}`} />;
}

export function SkeletonPanel({ children, className = "" }: SkeletonPanelProps) {
    return (
        <Surface as="section" className={`p-4 ${className}`.trim()}>
            {children}
        </Surface>
    );
}
