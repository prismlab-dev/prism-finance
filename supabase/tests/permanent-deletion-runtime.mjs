import assert from "node:assert/strict";
import { createServer } from "vite";

/** Runs the production deletion domain + payload builder against the SQL writer. */
export async function validatePermanentDeletionRuntime(database, projectRoot) {
    const runtime = await createServer({ root: projectRoot, configFile: false, envDir: false,
        optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom" });
    try {
        const core = await runtime.ssrLoadModule("/src/context/finance/financeCore.ts");
        const { permanentlyDeleteWalletData, permanentlyDeleteCreditCardData } = await runtime.ssrLoadModule("/src/context/finance/permanentDeletion.ts");
        const { syncCreditCardInvoices } = await runtime.ssrLoadModule("/src/context/finance/syncCreditCardInvoices.ts");
        const { buildInvoiceSettlement } = await runtime.ssrLoadModule("/src/context/finance/invoiceSettlement.ts");
        const { buildFinanceChangesPayload } = await runtime.ssrLoadModule("/src/supabase/finance/financeChanges.ts");
        const { createTransactionSnapshot } = await runtime.ssrLoadModule("/src/context/finance/transactionCreation/createTransactionSnapshot.ts");
        const wallets = ["default", "second"].map((id) => core.normalizeWallet({ id, name: id, initialBalance: 1000, createdAt: "2026-01-01T12:00:00Z" }));
        const emptyOf = () => core.createFinanceSnapshot([], [], [], null, [], [], [], [], [], [], [], []);
        let userNumber = 0;

        const run = async (name, { payer, bankWalletId = null, mode = "single", occurrenceWallet, remove }) => {
            const userId = `10000000-0000-0000-0000-0000000008${String(userNumber++).padStart(2, "0")}`;
            await database.exec(`reset role; insert into auth.users(id,email) values ('${userId}','${userId}@example.test');
                insert into public.profiles(id,display_name,email) values ('${userId}','x','${userId}@example.test');
                set role authenticated; select set_config('request.jwt.claim.sub','${userId}',false);`);
            let revision = 0;
            let saved = { ...emptyOf(), favoriteWalletId: null };
            const save = async (snapshot) => {
                const target = { ...snapshot, favoriteWalletId: "second" };
                const result = await database.query("select public.apply_finance_changes($1,$2::jsonb,'deletion-test') as result",
                    [revision, JSON.stringify(buildFinanceChangesPayload(userId, saved, target))]);
                revision = Number(result.rows[0].result.revision);
                saved = target;
            };
            const card = core.normalizeCreditCard({ id: `card-${name}`, name: "Cartão", limit: 5000, closingDay: 10, dueDay: 17, bankWalletId }, new Set(["default", "second"]));
            const empty = core.normalizeFinanceSnapshot({ wallets, creditCards: [card], favoriteCreditCardId: card.id }, userId).snapshot;
            const created = createTransactionSnapshot({ ...empty, wallets, favoriteCreditCardId: card.id }, {
                id: `charge-${name}`, description: "Compra", type: "spending", value: -100, amount: -100, status: "pending",
                date: "2026-01-05", scheduledDate: "2026-01-05", paymentMethod: "credit_card", creditCardId: card.id,
                transactionMode: mode, installmentCount: mode === "installment" ? 3 : undefined,
            }, { userId, now: "2026-01-01T12:00:00Z" });
            const base = occurrenceWallet ? { ...created, transactions: created.transactions.map((item) => ({ ...item, sourceWalletId: created.transactionGroups[0].sourceWalletId })) } : created;
            await save(base);
            const invoice = base.creditCardInvoices[0];
            let paid;
            if (payer) {
                const group = core.normalizeTransactionGroup({ id: "pay-group", title: "Pagamento", type: "expense", transactionMode: "single", sourceWalletId: payer,
                    totalAmount: invoice.totalAmount, createdAt: "2026-01-12T12:00:00Z" }, new Set(["default", "second"]));
                paid = { ...base, transactionGroups: [...base.transactionGroups, group], transactions: [...base.transactions, core.normalizeStoredTransaction({ id: "pay", groupId: group.id,
                    amount: invoice.totalAmount, scheduledDate: "2026-01-12", status: "paid", paidAt: "2026-01-12T12:00:00Z", paymentForInvoiceId: invoice.id,
                    notes: core.buildInvoicePaymentNote({ invoiceId: invoice.id, creditCardId: card.id }), createdAt: "2026-01-12T12:00:00Z" })] };
            } else {
                const settled = buildInvoiceSettlement({ ...base, invoiceIds: [invoice.id], markAsPaid: true, userId, invoices: base.creditCardInvoices });
                paid = { ...base, ...settled, creditCardInvoices: settled.invoices };
            }
            await save(paid);

            const deleted = remove === "card"
                ? permanentlyDeleteCreditCardData({ ...paid, creditCardId: card.id })
                : { creditCardInvoices: paid.creditCardInvoices, ...permanentlyDeleteWalletData({ ...paid, walletId: remove }) };
            const invoices = syncCreditCardInvoices({ ...deleted, creditCards: deleted.creditCards, existingInvoices: deleted.creditCardInvoices });
            const target = { ...paid, ...deleted, creditCardInvoices: invoices.creditCardInvoices, transactions: invoices.transactions };
            await save(target);
            const rows = (await database.query(`select
                (select count(*)::int from public.transactions where payment_for_invoice_id is null) as charges,
                (select count(*)::int from public.transactions where payment_for_invoice_id is not null) as payments,
                (select count(*)::int from public.transactions t join public.transaction_groups g on g.user_id = t.user_id and g.id = t.group_id where t.payment_for_invoice_id is not null and coalesce(t.source_wallet_id, g.source_wallet_id) is not null) as wallet_payments,
                (select count(*)::int from public.ledger_entries) as ledger,
                (select status from public.credit_card_invoices where id = '${invoice.id}') as invoice_status,
                (select balance::float from public.wallets limit 1) as balance,
                (select count(*)::int from public.wallets) as wallets, (select count(*)::int from public.credit_cards) as cards`)).rows[0];
            const label = JSON.stringify({ mode, bankWalletId, payer, remove });
            assert.deepEqual(rows, remove === "card"
                ? { charges: 0, payments: 0, wallet_payments: 0, ledger: 0, invoice_status: null, balance: 1000, wallets: 2, cards: 0 }
                : { charges: base.transactions.length, payments: 1, wallet_payments: payer && payer !== remove ? 1 : 0, ledger: payer && payer !== remove ? 1 : 0,
                    invoice_status: "paid", balance: payer && payer !== remove ? 1000 - invoice.totalAmount : 1000, wallets: 1, cards: 1 }, label);
        };
        for (const mode of ["single", "installment"])
            for (const bankWalletId of [null, "second"])
                for (const payer of ["default", "second", null])
                    for (const occurrenceWallet of [false, true])
                        for (const remove of ["default", "second", "card"]) await run(mode, { payer, bankWalletId, mode, occurrenceWallet, remove });
        console.log("PERMANENT DELETION OK wallets and cards used by paid invoices; card purchases and paid invoices outlive wallets");
    } finally {
        await runtime.close();
    }
}
