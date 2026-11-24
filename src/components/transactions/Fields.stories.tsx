import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarDays, Landmark } from "lucide-react";
import { useRef, useState } from "react";
import { fn } from "storybook/test";
import { SAMPLE_SNAPSHOT, SAMPLE_TRANSACTIONS } from "../../stories/mocks/sampleFinance";
import { AnchoredOverlay } from "./AnchoredOverlay";
import { CardCommitmentField } from "./CardCommitmentField";
import { DateField } from "./DateField";
import { DayOfMonthField } from "./DayOfMonthField";
import { DescriptionAutocomplete } from "./DescriptionAutocomplete";
import { IconTextField } from "./IconTextField";
import { InfoTag } from "./InfoTag";
import { MultiSelectCombobox } from "./MultiSelectCombobox";
import { SingleSelectCombobox } from "./SingleSelectCombobox";
import { TransactionFieldIcon } from "./TransactionFieldIcon";
import { TransactionFormTabs, type TransactionFormTab } from "./TransactionFormTabs";
import { TransactionModeField } from "./TransactionModeField";
import { StatusField } from "./TransactionFormParts";
import type { TransactionMode, TransactionStatus } from "../../context/FinanceContext";

// Campos de formulário reutilizados pelos modais de lançamento.
const meta = { title: "Componentes/Formulários/Campos", parameters: { layout: "padded" } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const walletOptions = SAMPLE_SNAPSHOT.wallets.map((wallet) => ({ id: wallet.id, label: wallet.name, searchText: wallet.name }));
const tagOptions = SAMPLE_SNAPSHOT.tags.map((tag) => ({ id: tag.id, label: tag.name, searchText: tag.name }));

export const CampoDeTexto: Story = {
    name: "IconTextField",
    render: () => {
        const [value, setValue] = useState("");
        return (
            <div className="w-80 space-y-3">
                <IconTextField ariaLabel="Descrição" value={value} onChange={setValue} placeholder="Descrição" />
                <IconTextField ariaLabel="E-mail" value="marina@exemplo.com" onChange={fn()} placeholder="E-mail" type="email" />
                <IconTextField ariaLabel="Desabilitado" value="Bloqueado" onChange={fn()} placeholder="" disabled />
                <IconTextField ariaLabel="Buscar" value="" onChange={fn()} placeholder="Buscar" bareIcon />
            </div>
        );
    },
};

export const Data: Story = {
    name: "DateField",
    render: () => {
        const [value, setValue] = useState("2026-11-23");
        return <div className="w-72"><DateField value={value} onChange={setValue} /></div>;
    },
};

export const DiaDoMes: Story = {
    name: "DayOfMonthField",
    render: () => {
        const [day, setDay] = useState(10);
        return <div className="w-56"><DayOfMonthField label="Fechamento" value={day} onChange={setDay} icon={CalendarDays} /></div>;
    },
};

export const SelecaoUnica: Story = {
    name: "SingleSelectCombobox",
    render: () => {
        const [value, setValue] = useState("wallet-conta");
        return (
            <div className="w-72">
                <SingleSelectCombobox label="Carteira" value={value} onChange={setValue} placeholder="Escolha" emptyMessage="Nada encontrado" options={walletOptions}
                    renderOptionContent={(option) => <span>{option.label}</span>} leadingIcon={<Landmark size={15} />} />
            </div>
        );
    },
};

export const SelecaoMultipla: Story = {
    name: "MultiSelectCombobox",
    render: () => {
        const [values, setValues] = useState<string[]>(["tag-essencial"]);
        return (
            <div className="w-72">
                <MultiSelectCombobox label="Tags" values={values} onChange={setValues} placeholder="Escolha" emptyMessage="Nada encontrado" options={tagOptions}
                    renderOptionContent={(option) => <span>{option.label}</span>} />
            </div>
        );
    },
};

export const AutocompletarDescricao: Story = {
    name: "DescriptionAutocomplete",
    render: () => {
        const [value, setValue] = useState("Super");
        return (
            <div className="w-80">
                <DescriptionAutocomplete value={value} onChange={setValue} onSuggestionSelect={(transaction) => setValue(transaction.description)} transactions={SAMPLE_TRANSACTIONS}
                    type="spending" allowedCategoryIds={SAMPLE_SNAPSHOT.categories.map((category) => category.id)} />
            </div>
        );
    },
};

export const Compromisso: Story = {
    name: "CardCommitmentField",
    render: () => {
        const [value, setValue] = useState<"forecast" | "posted">("forecast");
        return <CardCommitmentField value={value} onChange={setValue} />;
    },
};

export const ModoDoLancamento: Story = {
    name: "TransactionModeField",
    render: () => {
        const [mode, setMode] = useState<TransactionMode>("installment");
        const [installments, setInstallments] = useState("6");
        const [recurrences, setRecurrences] = useState("");
        return <div className="w-80"><TransactionModeField mode={mode} onModeChange={setMode} installmentCountInput={installments} onInstallmentCountChange={setInstallments} recurrenceCountInput={recurrences} onRecurrenceCountChange={setRecurrences} /></div>;
    },
};

export const Situacao: Story = {
    name: "StatusField",
    render: () => {
        const [status, setStatus] = useState<TransactionStatus>("pending");
        return <div className="w-72"><StatusField status={status} onChange={setStatus} /></div>;
    },
};

export const Abas: Story = {
    name: "TransactionFormTabs",
    render: () => {
        const [tab, setTab] = useState<TransactionFormTab>("simple");
        return <TransactionFormTabs activeTab={tab} onChange={setTab} />;
    },
};

export const Etiqueta: Story = {
    name: "InfoTag",
    render: () => (
        <div className="flex items-center gap-2">
            <InfoTag>Parcelado</InfoTag>
            <InfoTag small>6x</InfoTag>
        </div>
    ),
};

export const IconeDeCampo: Story = { name: "TransactionFieldIcon", render: () => <TransactionFieldIcon icon={Landmark} /> };

export const SobreposicaoAncorada: Story = {
    name: "AnchoredOverlay",
    render: () => {
        const anchorRef = useRef<HTMLButtonElement>(null);
        const overlayRef = useRef<HTMLDivElement>(null);
        const [open, setOpen] = useState(true);
        return (
            <div className="h-64">
                <button ref={anchorRef} type="button" onClick={() => setOpen((current) => !current)} className="rounded-xl border border-white/[0.12] px-3 py-2 text-sm">Abrir overlay</button>
                <AnchoredOverlay anchorRef={anchorRef} overlayRef={overlayRef} isOpen={open} overlayWidth={240}>
                    <div className="rounded-xl border border-white/[0.12] bg-surface p-3 text-sm">Conteúdo ancorado ao botão</div>
                </AnchoredOverlay>
            </div>
        );
    },
};
