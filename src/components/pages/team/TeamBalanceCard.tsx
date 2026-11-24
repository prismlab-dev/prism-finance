import type { ChartData, ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";
import type { TeamExpenseEntry } from "../../../context/teamTypes";
import { formatCurrencyBRL } from "../../transactions/transactionView";
import { INCOME_COLOR, SPENDING_COLOR, areaFill } from "../home/charts/BalancoMensal";

/** Receitas menos despesas pagas; acertos entre membros só movem dinheiro dentro da equipe e ficam de fora. */
const balanceOf = (entries: TeamExpenseEntry[]) =>
    entries.reduce((sum, entry) => (entry.kind === "income" ? sum + entry.amount : entry.kind === "expense" ? sum - entry.amount : sum), 0);

const signed = (value: number) => `${value >= 0 ? "+" : "−"} R$ ${formatCurrencyBRL(Math.abs(value))}`;

/** Mesmo formato do "Balanço do mês" da home, com o saldo acumulado da equipe ao lado. */
export function TeamBalanceCard({ entries }: { entries: TeamExpenseEntry[] }) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = now.getDate();
    const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(now);

    const paid = entries.filter((entry) => entry.status === "paid");
    const monthEntries = paid.filter((entry) => entry.date.startsWith(monthKey));
    const dailyIncome = Array<number>(daysInMonth).fill(0);
    const dailySpending = Array<number>(daysInMonth).fill(0);
    for (const entry of monthEntries) {
        const day = Number(entry.date.slice(8, 10)) - 1;
        if (entry.kind === "income") dailyIncome[day] += entry.amount;
        else if (entry.kind === "expense") dailySpending[day] += entry.amount;
    }
    const incomes = dailyIncome.reduce((sum, value) => sum + value, 0);
    const spending = dailySpending.reduce((sum, value) => sum + value, 0);
    const balance = incomes - spending;
    const total = balanceOf(paid);
    const isEmpty = incomes <= 0 && spending <= 0;

    const cumulative = (daily: number[]) => {
        let running = 0;
        return daily.map((value, index) => {
            running += value;
            return index < today ? running : null;
        });
    };

    const line = (label: string, data: number[], color: string, rgb: string) => ({
        label,
        data: cumulative(data),
        borderColor: color,
        backgroundColor: areaFill(rgb),
        fill: "origin" as const,
        stepped: true,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
    });

    const chartData: ChartData<"line", (number | null)[]> = {
        labels: Array.from({ length: daysInMonth }, (_, index) => String(index + 1)),
        datasets: [line("Entrou", dailyIncome, INCOME_COLOR, "52, 211, 153"), line("Saiu", dailySpending, SPENDING_COLOR, "251, 113, 133")],
    };

    const chartOptions: ChartOptions<"line"> = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 700, easing: "easeOutQuart" },
        interaction: { mode: "index", intersect: false },
        scales: {
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: {
                    color: "#525252",
                    font: { size: 11 },
                    autoSkip: false,
                    maxRotation: 0,
                    callback: (_value, index) => (index === 0 || index === today - 1 || index === daysInMonth - 1 ? String(index + 1) : ""),
                },
            },
            y: { beginAtZero: true, border: { display: false }, grid: { color: "rgba(255, 255, 255, 0.04)" }, ticks: { display: false, maxTicksLimit: 4 } },
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: "rgba(10, 10, 10, 0.96)",
                borderColor: "rgba(255, 255, 255, 0.12)",
                borderWidth: 1,
                cornerRadius: 10,
                padding: 10,
                callbacks: {
                    title: (items) => `Até o dia ${items[0]?.label ?? ""}`,
                    label: (item) => ` ${item.dataset.label}: R$ ${formatCurrencyBRL(Number(item.raw ?? 0))}`,
                },
            },
        },
    };

    const pills = [
        { label: "Receitas", value: `R$ ${formatCurrencyBRL(incomes)}`, color: INCOME_COLOR, muted: incomes <= 0 },
        { label: "Despesas", value: `R$ ${formatCurrencyBRL(spending)}`, color: SPENDING_COLOR, muted: spending <= 0 },
        { label: "Balanço total", value: signed(total), color: total >= 0 ? INCOME_COLOR : SPENDING_COLOR, muted: total === 0 },
    ];

    return (
        <section className="w-full rounded-2xl border border-white/[0.08] bg-surface p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-lg font-medium text-white">Balanço do mês</p>
                    <p className="text-sm capitalize text-neutral-500">{monthLabel}</p>
                </div>
                {!isEmpty && (
                    <p className={`text-2xl font-semibold leading-none tabular-nums ${balance >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{signed(balance)}</p>
                )}
            </div>

            {isEmpty ? (
                <p className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-6 text-center text-sm text-neutral-400">Nenhuma receita ou despesa paga da equipe neste mês</p>
            ) : (
                <div className="mt-4 h-44">
                    <Line data={chartData} options={chartOptions} />
                </div>
            )}

            <ul className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                {pills.map((pill) => (
                    <li key={pill.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                        <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: pill.color }} />
                            {pill.label}
                        </span>
                        <span className={`mt-0.5 block text-sm font-semibold tabular-nums ${pill.muted ? "text-neutral-600" : "text-white"}`}>{pill.value}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
