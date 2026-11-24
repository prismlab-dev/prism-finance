import type { Meta, StoryObj } from "@storybook/react-vite";
import { Palette, UserRound } from "lucide-react";
import { fn } from "storybook/test";
import { SAMPLE_USER } from "../../../stories/mocks/sampleFinance";
import { THEMES } from "../../../lib/appearance";
import { AccountSettingsTab } from "./AccountSettingsTab";
import { AppearancePreview } from "./AppearancePreview";
import { AppearanceSettingsTab } from "./AppearanceSettingsTab";
import { CreditCardInvoiceCsvImportCard } from "./CreditCardInvoiceCsvImportCard";
import { CsvTransactionImportCard } from "./CsvTransactionImportCard";
import { DataSettingsTab } from "./DataSettingsTab";
import { FamilySettingsTab } from "./FamilySettingsTab";
import { HomeLayoutEditor } from "./HomeLayoutEditor";
import { SettingsFeedback, SettingsSection } from "./SettingsSection";
import { SettingsSidebarButton } from "./SettingsSidebarButton";
import { AccountIdentityHeader } from "./account/AccountIdentityHeader";
import { DeleteAccountSection } from "./account/DeleteAccountSection";
import { EmailSection } from "./account/EmailSection";
import { PasswordSection } from "./account/PasswordSection";
import { ProfileSection } from "./account/ProfileSection";
import { SignInMethodsSection } from "./account/SignInMethodsSection";

const meta = { title: "Componentes/Configurações/Abas e seções", parameters: { layout: "padded", route: "/settings" } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const AbaConta: Story = { name: "AccountSettingsTab", render: () => <AccountSettingsTab onSignOut={fn()} /> };
export const AbaAparencia: Story = { name: "AppearanceSettingsTab", render: () => <AppearanceSettingsTab /> };
export const AbaDados: Story = { name: "DataSettingsTab", render: () => <DataSettingsTab /> };
export const AbaFamilia: Story = { name: "FamilySettingsTab", render: () => <FamilySettingsTab /> };
export const ImportarCsv: Story = { name: "CsvTransactionImportCard", render: () => <CsvTransactionImportCard /> };
export const ImportarFaturaCsv: Story = { name: "CreditCardInvoiceCsvImportCard", render: () => <CreditCardInvoiceCsvImportCard /> };
export const EditorDoInicio: Story = { name: "HomeLayoutEditor", render: () => <HomeLayoutEditor /> };

export const PreviaDeTema: Story = {
    name: "AppearancePreview",
    render: () => (
        <div className="grid grid-cols-2 gap-4 laptop:grid-cols-3">
            {THEMES.map((theme) => (
                <div key={theme.id} className="space-y-1">
                    <div className="relative h-28 w-48 overflow-hidden rounded-xl border border-white/[0.12]"><AppearancePreview layout="classic" theme={theme.id} /></div>
                    <p className="text-xs text-white/60">{theme.label}</p>
                </div>
            ))}
        </div>
    ),
};

export const SecaoGenerica: Story = {
    name: "SettingsSection e SettingsFeedback",
    render: () => (
        <div className="w-[560px] space-y-3">
            <SettingsSection title="Perfil" description="Como seu nome aparece no app."><p className="text-sm text-white/70">Conteúdo da seção.</p></SettingsSection>
            <SettingsFeedback feedback={{ type: "success", message: "Alterações salvas." }} />
            <SettingsFeedback feedback={{ type: "error", message: "Não foi possível salvar." }} />
            <SettingsFeedback feedback={{ type: "info", message: "Enviamos um e-mail de confirmação." }} />
        </div>
    ),
};
export const BotaoDaBarraLateral: Story = {
    name: "SettingsSidebarButton",
    render: () => <div className="w-56 space-y-1"><SettingsSidebarButton active icon={UserRound} label="Conta" onClick={fn()} /><SettingsSidebarButton active={false} icon={Palette} label="Aparência" onClick={fn()} /></div>,
};

export const Identidade: Story = {
    name: "AccountIdentityHeader",
    render: () => <AccountIdentityHeader userName="Marina Souza" email="marina@exemplo.com" photoUrl={null} createdAt={SAMPLE_USER.metadata.creationTime} hasEmailLogin hasGoogleLogin />,
};
export const Perfil: Story = { name: "ProfileSection", render: () => <ProfileSection user={SAMPLE_USER} userName="Marina Souza" userPhotoUrl={null} /> };
export const Email: Story = { name: "EmailSection", render: () => <EmailSection email="marina@exemplo.com" /> };
export const Senha: Story = { name: "PasswordSection", render: () => <PasswordSection user={SAMPLE_USER} supportsPassword /> };
export const MetodosDeLogin: Story = {
    name: "SignInMethodsSection",
    render: () => <SignInMethodsSection email="marina@exemplo.com" identities={[]} loading={false} redirectError={null} onChanged={async () => undefined} />,
};
export const ExcluirConta: Story = { name: "DeleteAccountSection", render: () => <DeleteAccountSection /> };
