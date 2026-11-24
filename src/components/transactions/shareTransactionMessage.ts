import type { Transaction } from "../../context/FinanceContext";
import { getTransactionCategoryDisplayLabel } from "../../lib/transactionCategory";
import type { TransactionShowcaseTeam } from "./TransactionShowcase";
import { formatCurrencyBRL, formatTransactionDate } from "./transactionView";

const TYPE_LABEL: Record<Transaction["type"], string> = {
    income: "Receita",
    spending: "Despesa",
    transfer: "Transferência",
};

interface ShareMessageParams {
    transaction: Transaction;
    link: string;
    team?: TransactionShowcaseTeam;
    teamName?: string;
}

/** Texto que acompanha a imagem copiada: o resumo da transação e o link para abri-la no Silus. */
export function buildShareMessage({ transaction, link, team, teamName }: ShareMessageParams): string {
    const categoryLabel = team ? (team.category?.name ?? "Sem categoria") : getTransactionCategoryDisplayLabel(transaction.category);
    const title = transaction.description.trim() || categoryLabel;
    const type = team ? `${TYPE_LABEL[transaction.type]} da equipe${teamName ? ` ${teamName}` : ""}` : TYPE_LABEL[transaction.type];
    const lines = [
        `${title}: R$ ${formatCurrencyBRL(transaction.value)}`,
        `${type} em ${categoryLabel}, ${formatTransactionDate(transaction.date, "dd/MM/yyyy")}`,
    ];
    if (team) {
        lines.push(`${transaction.type === "income" ? "Recebido por" : "Pago por"} ${team.payerName}`);
        const pending = team.shares.filter((share) => !share.isPayer && !share.paid);
        if (pending.length > 0) lines.push(`${transaction.type === "income" ? "Falta receber" : "Falta pagar"}: ${pending.map((share) => `${share.name} (R$ ${formatCurrencyBRL(share.amount)})`).join(", ")}`);
    }
    lines.push("", `Abrir no Silus: ${link}`);
    return lines.join("\n");
}
