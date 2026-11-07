import { type ComponentProps, useMemo } from "react";
import { CircleDot, History } from "lucide-react";
import { useFinanceCreditCards, useFinanceFavoriteCreditCard } from "../../context/FinanceContext";
import { resolveCreditCardInvoiceCycle } from "../../context/financeTypes";
import { getPathForPage, usePage } from "../../context/PageContext";
import { getLocalTodayDate } from "../../lib/localDate";
import { shiftMonth } from "../pages/statement/statementPageShared";
import { NavSubitems } from "./NavSubitems";

type StatementNavSubitemsProps = Omit<ComponentProps<typeof NavSubitems>, "items" | "activeId">;

// Atalhos para a fatura aberta e a anterior do cartão favorito.
export function StatementNavSubitems(props: StatementNavSubitemsProps) {
    const creditCards = useFinanceCreditCards();
    const favoriteCreditCardId = useFinanceFavoriteCreditCard();
    const { goToPage } = usePage();
    const today = getLocalTodayDate();

    const items = useMemo(() => {
        const card = creditCards.find((creditCard) => creditCard.id === favoriteCreditCardId);
        if (!card) return [];

        const openMonth = resolveCreditCardInvoiceCycle(today, card.closingDay, card.dueDay).cycleKey;
        const shortcut = (id: string, label: string, selectedMonth: string, icon: typeof History) => ({
            id,
            label,
            path: getPathForPage("statement"),
            marker: <ShortcutIcon icon={icon} />,
            onSelect: () => goToPage("statement", { page: "statement", selectedCardId: card.id, selectedMonth }),
        });

        return [shortcut("open", "Fatura aberta", openMonth, CircleDot), shortcut("previous", "Fatura anterior", shiftMonth(openMonth, -1), History)];
    }, [creditCards, favoriteCreditCardId, goToPage, today]);

    return <NavSubitems {...props} items={items} activeId={null} />;
}

function ShortcutIcon({ icon: Icon }: { icon: typeof History }) {
    return <Icon size={15} strokeWidth={2} />;
}
