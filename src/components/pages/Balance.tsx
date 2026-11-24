import { useMemo } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Pencil, Plus, Star } from "lucide-react";
import {
    useFinanceActions,
    useFinanceCreditCardInvoices,
    useFinanceCreditCards,
    useFinanceFavoriteCreditCard,
    useFinanceFavoriteWallet,
    useFinanceSession,
    useFinanceSummary,
    useFinanceWallets,
} from "../../context/FinanceContext";
import { useModal } from "../../context/ModalContext";
import { useLocalPreferenceSection } from "../../lib/localPreferences";
import { WalletAvatar } from "../common/WalletAvatar";
import { AuthShell } from "../layout/AuthShell";
import { BalanceModal } from "../modal/BalanceModal";
import { CreditCardModal } from "../modal/CreditCardModal";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Surface, SURFACE_CLASS } from "../ui/Surface";
import { EmptyState } from "../ui/EmptyState";
import { currencyFormatter } from "../../lib/formatters";
import { isRecord } from "../../lib/primitives";

const META_CHIP_CLASS = "text-xs px-2.5 py-0.5 bg-neutral-200/5 text-white/45 border border-white/10 rounded-full";

interface BalancePagePreferences {
    showArchivedWallets: boolean;
    showArchivedCreditCards: boolean;
}

const BALANCE_PAGE_PREFERENCES_SECTION = "balance";
const DEFAULT_BALANCE_PAGE_PREFERENCES: BalancePagePreferences = {
    showArchivedWallets: false,
    showArchivedCreditCards: false,
};

function normalizeBalancePagePreferences(value: unknown): BalancePagePreferences {
    if (!isRecord(value)) {
        return DEFAULT_BALANCE_PAGE_PREFERENCES;
    }

    return {
        showArchivedWallets: typeof value.showArchivedWallets === "boolean" ? value.showArchivedWallets : DEFAULT_BALANCE_PAGE_PREFERENCES.showArchivedWallets,
        showArchivedCreditCards: typeof value.showArchivedCreditCards === "boolean" ? value.showArchivedCreditCards : DEFAULT_BALANCE_PAGE_PREFERENCES.showArchivedCreditCards,
    };
}

export function BalancePage() {
    const { user } = useFinanceSession();
    const wallets = useFinanceWallets();
    const creditCards = useFinanceCreditCards();
    const creditCardInvoices = useFinanceCreditCardInvoices();
    const summary = useFinanceSummary();
    const favoriteWalletId = useFinanceFavoriteWallet();
    const favoriteCreditCardId = useFinanceFavoriteCreditCard();
    const { setFavoriteWallet, setFavoriteCreditCard } = useFinanceActions();
    const { openModal } = useModal();
    const [preferences, setPreferences] = useLocalPreferenceSection(user?.uid, BALANCE_PAGE_PREFERENCES_SECTION, DEFAULT_BALANCE_PAGE_PREFERENCES, normalizeBalancePagePreferences);
    const { showArchivedWallets, showArchivedCreditCards } = preferences;
    const visibleWallets = useMemo(() => wallets.filter((wallet) => showArchivedWallets || wallet.isActive), [showArchivedWallets, wallets]);
    const visibleCreditCards = useMemo(() => creditCards.filter((card) => showArchivedCreditCards || card.isActive), [creditCards, showArchivedCreditCards]);
    const totalCreditLimit = creditCards.reduce((sum, card) => sum + card.limit, 0);
    const totalOpenInvoices = creditCardInvoices.reduce((sum, invoice) => sum + Math.max(0, invoice.totalAmount - invoice.paidAmount), 0);

    const metrics = [
        { label: "Saldo total", value: currencyFormatter.format(summary.balance) },
        { label: "Limite total", value: currencyFormatter.format(totalCreditLimit) },
        { label: "Faturas abertas", value: currencyFormatter.format(totalOpenInvoices) },
    ];

    return (
        <AuthShell mainClassName="text-white">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 pb-10 lg:flex-row lg:items-start">
                <section className="w-full lg:w-[80%]">
                    <Surface className="relative overflow-hidden p-4">
                        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-500/10 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />

                        <div className="relative flex flex-wrap items-center justify-between gap-3">
                            <div className="text-left">
                                <p className="text-lg font-medium text-white">Suas carteiras</p>
                            </div>

                            <div className="flex flex-row-reverse gap-1.5 items-center">
                                <Button variant="secondary" size="sm" shape="pill" className="cursor-pointer uppercase tracking-[0.05em]" type="button" onClick={() => openModal(<BalanceModal mode="create" />)}>
                                    <Plus size={13} />
                                    Criar carteira
                                </Button>
                                <Button variant="secondary" size="sm" shape="pill" className="cursor-pointer uppercase tracking-[0.05em]" type="button" onClick={() => setPreferences((current) => ({ ...current, showArchivedWallets: !current.showArchivedWallets }))}>
                                    {showArchivedWallets ? <EyeOff size={13} /> : <Eye size={13} />}
                                    {showArchivedWallets ? "Arquivadas" : "Arquivadas"}
                                </Button>
                            </div>
                        </div>

                        <div className="relative mt-4 space-y-2">
                            {visibleWallets.length < 1 && <EmptyState variant="soft" size="sm">Nenhuma carteira para os filtros atuais.</EmptyState>}
                            {visibleWallets.map((wallet, index) => {
                                const isFavorite = wallet.id === favoriteWalletId;
                                

                                return (
                                    <motion.article
                                        key={wallet.id}
                                        initial={{ opacity: 0, y: 14 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.22, delay: index * 0.03, ease: "easeOut" }}
                                        className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                                            wallet.isActive ? "border-white/[0.06] bg-white/[0.02]" : "border-white/[0.08] bg-white/[0.01] opacity-70"
                                        }`}
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <WalletAvatar wallet={wallet} className="h-14 w-14 rounded-xl border border-white/10" iconSize={30} iconStrokeWidth={1.7} />

                                            <div className="min-w-0 text-left">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate text-[15px] font-medium text-white">{wallet.name}</p>
                                                    {!wallet.isActive && (
                                                        <Badge uppercase>
                                                            Arquivada
                                                        </Badge>
                                                    )}
                                                </div>
                                               
                                                <div className="flex gap-1 mt-1">
                                                    <p className={META_CHIP_CLASS}>
                                                        Saldo inicial: {currencyFormatter.format(wallet.initialBalance)}
                                                    </p>
                                                    <p className={META_CHIP_CLASS}>
                                                        Saldo atual: {currencyFormatter.format(wallet.balance)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button variant="secondary" size="sm" shape="pill" className="uppercase tracking-[0.04em]" type="button" onClick={() => openModal(<BalanceModal mode="edit" walletId={wallet.id} />)}>
                                                <Pencil size={14} />
                                                Editar
                                            </Button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (wallet.isActive) {
                                                        void setFavoriteWallet(wallet.id);
                                                    }
                                                }}
                                                disabled={!wallet.isActive}
                                                className={[
                                                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.04em] transition-all",
                                                    isFavorite
                                                        ? "border-amber-200/35 bg-amber-300/10 text-amber-200"
                                                        : wallet.isActive
                                                          ? "border-white/[0.12] bg-white/[0.03] text-white/70 hover:border-white/[0.2] hover:text-white"
                                                          : "border-white/[0.1] bg-white/[0.02] text-white/40",
                                                ].join(" ")}
                                            >
                                                <Star size={14} className={isFavorite ? "fill-amber-200 text-amber-200" : ""} />
                                                {isFavorite ? "Favorita" : "Marcar favorita"}
                                            </button>
                                        </div>
                                    </motion.article>
                                );
                            })}
                        </div>
                    </Surface>

                    <Surface className="relative mt-3 overflow-hidden p-4">
                        <div className="pointer-events-none absolute -right-12 -top-10 h-36 w-36 rounded-full bg-amber-500/12 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-orange-500/10 blur-3xl" />

                        <div className="relative flex flex-wrap items-center justify-between gap-3">
                            <div className="text-left">
                                <p className="text-lg font-medium text-white">Seus cartoes de credito</p>
                            </div>

                            <div className="flex flex-row-reverse gap-1.5">
                                <Button variant="secondary" size="sm" shape="pill" className="cursor-pointer uppercase tracking-[0.05em]" type="button" onClick={() => openModal(<CreditCardModal mode="create" />)}>
                                    <Plus size={13} />
                                    Criar cartao
                                </Button>
                                <Button variant="secondary" size="sm" shape="pill" className="cursor-pointer uppercase tracking-[0.05em]" type="button" onClick={() => setPreferences((current) => ({ ...current, showArchivedCreditCards: !current.showArchivedCreditCards }))}>
                                    {showArchivedCreditCards ? <EyeOff size={13} /> : <Eye size={13} />}
                                    {showArchivedCreditCards ? " arquivados" : " arquivados"}
                                </Button>
                            </div>
                        </div>

                        <div className="relative mt-4 space-y-2">
                            {visibleCreditCards.length < 1 && <EmptyState variant="soft" size="sm">Nenhum cartao para os filtros atuais.</EmptyState>}
                            {visibleCreditCards.map((creditCard, index) => {
                                const isFavorite = creditCard.id === favoriteCreditCardId;

                                return (
                                    <motion.article
                                        key={creditCard.id}
                                        initial={{ opacity: 0, y: 14 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.22, delay: index * 0.03, ease: "easeOut" }}
                                        className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                                            creditCard.isActive ? "border-white/[0.06] bg-white/[0.02]" : "border-white/[0.08] bg-white/[0.01] opacity-70"
                                        }`}
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <WalletAvatar wallet={creditCard} className="h-14 w-14 rounded-xl border border-white/10" iconSize={30} iconStrokeWidth={1.7} />

                                            <div className="min-w-0 text-left">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate text-[15px] font-medium text-white">{creditCard.name}</p>
                                                    {!creditCard.isActive && (
                                                        <Badge uppercase>
                                                            Arquivado
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex gap-1 mt-1">
                                                    <p className={META_CHIP_CLASS}>Limite: {currencyFormatter.format(creditCard.limit)}</p>
                                                    <p className={META_CHIP_CLASS}>Fechamento: {creditCard.closingDay}</p>
                                                    <p className={META_CHIP_CLASS}>Vencimento: {creditCard.dueDay}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button variant="secondary" size="sm" shape="pill" className="uppercase tracking-[0.04em]" type="button" onClick={() => openModal(<CreditCardModal mode="edit" creditCardId={creditCard.id} />)}>
                                                <Pencil size={14} />
                                                Editar
                                            </Button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (creditCard.isActive) {
                                                        void setFavoriteCreditCard(creditCard.id);
                                                    }
                                                }}
                                                disabled={!creditCard.isActive}
                                                className={[
                                                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.04em] transition-all",
                                                    isFavorite
                                                        ? "border-amber-200/35 bg-amber-300/10 text-amber-200"
                                                        : creditCard.isActive
                                                          ? "border-white/[0.12] bg-white/[0.03] text-white/70 hover:border-white/[0.2] hover:text-white"
                                                          : "border-white/[0.1] bg-white/[0.02] text-white/40",
                                                ].join(" ")}
                                            >
                                                <Star size={14} className={isFavorite ? "fill-amber-200 text-amber-200" : ""} />
                                                {isFavorite ? "Favorito" : "Marcar favorito"}
                                            </button>
                                        </div>
                                    </motion.article>
                                );
                            })}
                        </div>
                    </Surface>
                </section>

                <aside className="w-full space-y-2 lg:w-[30%]">
                    {metrics.map((metric, index) => (
                        <motion.div
                            key={metric.label}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.05 + index * 0.04, ease: "easeOut" }}
                            className={`${SURFACE_CLASS.solid} p-4 text-left`}
                        >
                            <p className="text-xs uppercase tracking-[0.2em] text-white/35">{metric.label}</p>
                            <p className="mt-1 text-lg font-medium text-white">{metric.value}</p>
                        </motion.div>
                    ))}
                </aside>
            </div>
        </AuthShell>
    );
}
