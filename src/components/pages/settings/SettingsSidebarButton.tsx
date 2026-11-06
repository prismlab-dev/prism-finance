import type { LucideIcon } from "lucide-react";

type SettingsSidebarButtonProps = {
    active: boolean;
    icon: LucideIcon;
    label: string;
    onClick: () => void;
};

export function SettingsSidebarButton({ active, icon: Icon, label, onClick }: SettingsSidebarButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-current={active ? "page" : undefined}
            className={`group relative flex min-w-max items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 lg:w-full lg:min-w-0 ${
                active ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"
            }`}
        >
            <span
                aria-hidden
                className={`absolute inset-y-2.5 left-0 hidden w-0.5 rounded-full transition-colors lg:block ${active ? "bg-white" : "bg-transparent"}`}
            />
            <Icon size={17} aria-hidden className={`shrink-0 ${active ? "text-white" : "text-white/45 group-hover:text-white/70"}`} />
            <span className="min-w-0">
                <span className={`block text-sm ${active ? "font-medium text-white" : "text-white/70"}`}>{label}</span>
            </span>
        </button>
    );
}
