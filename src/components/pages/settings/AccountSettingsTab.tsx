import { LogOut } from "lucide-react";
import { useState } from "react";
import { useFinanceSession } from "../../../context/FinanceContext";
import { isDemoModeEnabled, setDemoModeEnabled } from "../../../lib/demoMode";
import { resolveUserDisplayName } from "../../../lib/userProfile";
import { ToggleSwitch } from "../../common/ToggleSwitch";
import { AccountIdentityHeader } from "./account/AccountIdentityHeader";
import { DeleteAccountSection } from "./account/DeleteAccountSection";
import { EmailSection } from "./account/EmailSection";
import { PasswordSection } from "./account/PasswordSection";
import { ProfileSection } from "./account/ProfileSection";
import { SignInMethodsSection } from "./account/SignInMethodsSection";
import { useLinkedIdentities } from "./account/useLinkedIdentities";
import { SETTINGS_DANGER_BUTTON_CLASS, SettingsSection } from "./SettingsSection";

type AccountSettingsTabProps = {
    onSignOut: () => void | Promise<void>;
};

export function AccountSettingsTab({ onSignOut }: AccountSettingsTabProps) {
    const { user, profile } = useFinanceSession();
    const { identities, loading: identitiesLoading, redirectError, reload } = useLinkedIdentities(user?.uid);
    const [demoModeEnabled, setDemoModeEnabledState] = useState(isDemoModeEnabled);

    if (!user) {
        return null;
    }

    const userName = profile?.displayName ?? resolveUserDisplayName(user);
    const userPhotoUrl = profile ? profile.photoURL : user.photoURL?.trim() ? user.photoURL : null;
    // Antes das identidades carregarem, usa os provedores da sessão.
    const hasProvider = (provider: "email" | "google") =>
        identitiesLoading
            ? user.providerData.some((entry) => entry.providerId === (provider === "email" ? "password" : provider))
            : identities.some((identity) => identity.provider === provider);

    return (
        <div className="space-y-6">
            <AccountIdentityHeader
                userName={userName}
                email={user.email}
                photoUrl={userPhotoUrl}
                createdAt={user.metadata.creationTime}
                hasEmailLogin={hasProvider("email")}
                hasGoogleLogin={hasProvider("google")}
            />

            <div className="px-1 sm:px-2">
                <ProfileSection user={user} userName={userName} userPhotoUrl={userPhotoUrl} />
                <EmailSection email={user.email} />
                <SignInMethodsSection email={user.email} identities={identities} loading={identitiesLoading} redirectError={redirectError} onChanged={reload} />
                <PasswordSection user={user} supportsPassword={hasProvider("email")} />

                <SettingsSection title="Modo demonstração" description="Embaralha os valores na tela para mostrar o app sem expor seus números. Nada muda nos dados.">
                    <div className="flex items-center gap-3">
                        <ToggleSwitch
                            checked={demoModeEnabled}
                            label="Modo demonstração"
                            onChange={(enabled) => {
                                setDemoModeEnabled(enabled);
                                setDemoModeEnabledState(enabled);
                            }}
                        />
                        <span className="text-sm text-white/60">{demoModeEnabled ? "Ativado" : "Desativado"}</span>
                    </div>
                </SettingsSection>

                <SettingsSection title="Sessão" description="Sai deste dispositivo. Seus dados ficam salvos na conta.">
                    <button type="button" onClick={() => void onSignOut()} className={SETTINGS_DANGER_BUTTON_CLASS}>
                        <LogOut size={16} aria-hidden />
                        Sair da conta
                    </button>
                </SettingsSection>

                <DeleteAccountSection />
            </div>
        </div>
    );
}
