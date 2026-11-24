import type { LucideIcon } from "lucide-react";

export type SettingsTabId = "account" | "appearance" | "family" | "team" | "data";

export type SettingsTab = {
    id: SettingsTabId;
    label: string;
    icon: LucideIcon;
};
