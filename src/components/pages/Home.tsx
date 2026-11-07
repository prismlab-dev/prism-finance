import { WealthCard } from "./home/WealthCard";
import { RecentTransactionsPanel } from "./home/RecentTransactionsPanel";
import { SpendingBillsAlertCard } from "./home/SpendingBillsAlertCard";
import { UpcomingPanel } from "./home/UpcomingPanel";
import { CreditCardInvoicesCard } from "./home/CreditCardInvoicesCard";
import { useFinanceTransactions } from "../../context/FinanceContext";
import { Suspense, lazy, type ReactNode } from "react";
import { ChartSkeleton } from "../loading/CompactSkeletons";
import { useHomeLayout, type HomeWidgetId } from "../../lib/homeLayout";

const BalancoMensal = lazy(() => import("./home/charts/BalancoMensal").then((module) => ({ default: module.BalancoMensal })));
const GastosPorCategoria = lazy(() => import("./home/charts/GastosPorCategoria").then((module) => ({ default: module.GastosPorCategoria })));

export function HomePage() {
    const transactions = useFinanceTransactions();
    const [layout] = useHomeLayout();

    const widgets: Record<HomeWidgetId, ReactNode> = {
        upcoming: <UpcomingPanel transactions={transactions} />,
        recent: <RecentTransactionsPanel transactions={transactions} />,
        spending: (
            <Suspense fallback={<ChartSkeleton />}>
                <GastosPorCategoria />
            </Suspense>
        ),
        invoices: <CreditCardInvoicesCard />,
        wealth: <WealthCard />,
        alerts: <SpendingBillsAlertCard transactions={transactions} />,
        balance: (
            <Suspense fallback={<ChartSkeleton />}>
                <BalancoMensal />
            </Suspense>
        ),
    };

    return (
        <div className="w-full space-y-3 pb-4">
            <div className="grid w-full gap-2 xl:grid-cols-[minmax(280px,400px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(320px,420px)_minmax(0,700px)_minmax(0,1fr)]">
                {layout.columns.map((column, index) => (
                    <section key={index} className="min-w-0 space-y-2">
                        {column.map((id) => (
                            <div key={id}>{widgets[id]}</div>
                        ))}
                    </section>
                ))}
            </div>
        </div>
    );
}
