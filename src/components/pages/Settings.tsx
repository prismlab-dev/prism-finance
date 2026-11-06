import { Database, UserRound, Users } from "lucide-react";
import { useFinanceSession } from "../../context/FinanceContext";
import { useLocalPreferenceSection } from "../../lib/localPreferences";
import { signOutSupabase } from "../../supabase/auth/authService";
import { AccountSettingsTab } from "./settings/AccountSettingsTab";
import { DataSettingsTab } from "./settings/DataSettingsTab";
import { FamilySettingsTab } from "./settings/FamilySettingsTab";
import { SettingsSidebarButton } from "./settings/SettingsSidebarButton";
import type { SettingsTab, SettingsTabId } from "./settings/types";

interface SettingsPagePreferences {
    activeTab: SettingsTabId;
}

const SETTINGS_PAGE_PREFERENCES_SECTION = "settings";
const DEFAULT_SETTINGS_PAGE_PREFERENCES: SettingsPagePreferences = { activeTab: "account" };

const TABS: SettingsTab[] = [
    { id: "account", label: "Conta", icon: UserRound },
    { id: "family", label: "Família", icon: Users },
    { id: "data", label: "Dados", icon: Database },
];

function normalizeSettingsPagePreferences(value: unknown): SettingsPagePreferences {
    const activeTab = typeof value === "object" && value !== null && "activeTab" in value ? value.activeTab : null;
    const tab = TABS.find((entry) => entry.id === activeTab);
    return { activeTab: tab?.id ?? DEFAULT_SETTINGS_PAGE_PREFERENCES.activeTab };
}

export function SettingsPage() {
    const { user } = useFinanceSession();
    const [preferences, setPreferences] = useLocalPreferenceSection(user?.uid, SETTINGS_PAGE_PREFERENCES_SECTION, DEFAULT_SETTINGS_PAGE_PREFERENCES, normalizeSettingsPagePreferences);
    const { activeTab } = preferences;

    async function handleSignOut() {
        try {
            await signOutSupabase();
        } catch (error) {
            console.error("Falha ao sair da conta:", error);
        }
    }

    return (
        <div className="flex min-h-[calc(100vh-8rem)] w-full flex-col gap-6 pb-10 lg:flex-row lg:gap-10">
            <aside className="lg:sticky lg:top-[calc(var(--app-header-offset,5.5rem)+0.5rem)] lg:w-60 lg:shrink-0 lg:self-start">
                <nav aria-label="Seções das configurações" className="-mx-3 flex gap-1 overflow-x-auto px-3 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
                    {TABS.map((tab) => (
                        <SettingsSidebarButton
                            key={tab.id}
                            active={activeTab === tab.id}
                            icon={tab.icon}
                            label={tab.label}
                            onClick={() => setPreferences((current) => ({ ...current, activeTab: tab.id }))}
                        />
                    ))}
                </nav>
            </aside>

            <div className="min-w-0 flex-1">
                {activeTab === "account" ? <AccountSettingsTab onSignOut={handleSignOut} /> : activeTab === "data" ? <DataSettingsTab /> : <FamilySettingsTab />}
            </div>
        </div>
    );
}
