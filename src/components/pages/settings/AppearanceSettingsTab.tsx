import { useState, type ReactNode } from "react";
import { getAppearance, LAYOUTS, setAppearance, THEMES, type Appearance } from "../../../lib/appearance";
import { AppearancePreview } from "./AppearancePreview";
import { SettingsSection } from "./SettingsSection";

type Option<T extends string> = { id: T; label: string; available: boolean; description?: string };

type OptionGroupProps<T extends string> = {
    label: string;
    options: readonly Option<T>[];
    value: T;
    onChange: (value: T) => void;
    renderPreview: (id: T) => ReactNode;
};

function OptionGroup<T extends string>({ label, options, value, onChange, renderPreview }: OptionGroupProps<T>) {
    return (
        <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
            {options.map((option) => {
                const selected = option.id === value;
                return (
                    <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={!option.available}
                        onClick={() => onChange(option.id)}
                        className={`w-[214px] rounded-xl border p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:cursor-not-allowed disabled:opacity-50 ${
                            selected ? "border-white/40 bg-white/[0.06]" : "border-white/[0.08] hover:bg-white/[0.03]"
                        }`}
                    >
                        {renderPreview(option.id)}
                        <span className="mt-2.5 flex items-center justify-between gap-2 px-1 text-sm font-medium text-white">
                            {option.label}
                            {!option.available && <span className="text-xs font-normal text-white/45">Em breve</span>}
                        </span>
                        {option.description && <span className="mt-1 block px-1 text-xs text-white/45">{option.description}</span>}
                    </button>
                );
            })}
        </div>
    );
}

export function AppearanceSettingsTab() {
    const [appearance, setAppearanceState] = useState(getAppearance);

    function update(next: Partial<Appearance>) {
        const value = { ...appearance, ...next };
        setAppearance(value);
        setAppearanceState(value);
    }

    return (
        <div className="px-1 sm:px-2">
            <SettingsSection title="Layout" description="Como a interface se organiza: navegação, cabeçalho e disposição das páginas. Vale só para este dispositivo.">
                <OptionGroup
                    label="Layout"
                    options={LAYOUTS}
                    value={appearance.layout}
                    onChange={(layout) => update({ layout })}
                    renderPreview={(layout) => <AppearancePreview layout={layout} theme={appearance.theme} />}
                />
            </SettingsSection>
            <SettingsSection title="Tema" description="As cores do app. Vale só para este dispositivo.">
                <div role="radiogroup" aria-label="Tema" className="flex flex-wrap gap-2">
                    {THEMES.map((theme) => {
                        const selected = theme.id === appearance.theme;
                        return (
                            <button
                                key={theme.id}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => update({ theme: theme.id })}
                                className={`flex items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-4 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                                    selected ? "border-white/40 bg-white/[0.06]" : "border-white/[0.08] hover:bg-white/[0.03]"
                                }`}
                            >
                                {/* A amostra usa as variáveis do próprio tema: fundo do app com o tom dos cards em volta. */}
                                <span data-theme={theme.id} aria-hidden className="h-6 w-6 rounded-full border-[5px] border-surface bg-canvas ring-1 ring-white/15" />
                                {theme.label}
                            </button>
                        );
                    })}
                </div>
            </SettingsSection>
        </div>
    );
}
