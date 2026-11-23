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
        const { materializeOccurrence } = await runtime.ssrLoadModule("/src/context/finance/recurrence/materializeOccurrence.ts");
        const { occurrenceId } = await runtime.ssrLoadModule("/src/context/finance/recurrence/projectOccurrences.ts");
        const { buildInvoiceSettlement } = await runtime.ssrLoadModule("/src/context/finance/invoiceSettlement.ts");
        const { buildFinanceChangesPayload } = await runtime.ssrLoadModule("/src/supabase/finance/financeChanges.ts");
        const { createTransactionSnapshot } = await runtime.ssrLoadModule("/src/context/finance/transactionCreation/createTransactionSnapshot.ts");
        const { mergeSupabaseFinanceData } = await runtime.ssrLoadModule("/src/context/finance/financeSyncMerge.ts");
        const { recalculateGroupTotals } = await runtime.ssrLoadModule("/src/context/finance/transactionSeries/helpers.ts");
        const wallets = ["default", "second"].map((id) => core.normalizeWallet({ id, name: id, initialBalance: 1000, createdAt: "2026-01-01T12:00:00Z" }));
        const emptyOf = () => core.createFinanceSnapshot([], [], [], null, [], [], [], [], [], [], [], []);
        let userNumber = 0;

        const run = async (name, { keepPayments = false, payer, bankWalletId = null, mode = "single", occurrenceWallet, remove }) => {
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
                ? permanentlyDeleteCreditCardData({ ...paid, creditCardId: card.id, keepPayments })
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
                (select balance::float from public.wallets order by id = '${payer ?? "default"}' desc limit 1) as balance,
                (select count(*)::int from public.wallets) as wallets, (select count(*)::int from public.credit_cards) as cards`)).rows[0];
            const kept = keepPayments && payer ? 1 : 0;
            const label = JSON.stringify({ keepPayments, mode, bankWalletId, payer, remove });
            assert.deepEqual(rows, remove === "card"
                ? { charges: kept, payments: 0, wallet_payments: 0, ledger: kept, invoice_status: null, balance: kept ? 1000 - invoice.totalAmount : 1000, wallets: 2, cards: 0 }
                : { charges: base.transactions.length, payments: 1, wallet_payments: payer && payer !== remove ? 1 : 0, ledger: payer && payer !== remove ? 1 : 0,
                    invoice_status: "paid", balance: payer && payer !== remove ? 1000 - invoice.totalAmount : 1000, wallets: 1, cards: 1 }, label);
        };
        for (const mode of ["single", "installment"])
            for (const bankWalletId of [null, "second"])
                for (const payer of ["default", "second", null])
                    for (const occurrenceWallet of [false, true])
                        for (const remove of ["default", "second", "card"]) await run(mode, { payer, bankWalletId, mode, occurrenceWallet, remove });
        for (const mode of ["single", "installment"])
            for (const payer of ["default", "second", null]) await run(`kept-${mode}`, { payer, mode, remove: "card", keepPayments: true });
        // "stale": the device deletes the card without having seen the installment moved by another one.
        for (const [index, { survivorPaid, stale }] of [{ survivorPaid: false }, { survivorPaid: true }, { survivorPaid: false, stale: true }, { survivorPaid: true, stale: true }].entries()) {
            const userId = `10000000-0000-0000-0000-00000000090${index}`;
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
            const sync = (snapshot) => {
                const synced = syncCreditCardInvoices({ ...snapshot, existingInvoices: snapshot.creditCardInvoices });
                return { ...snapshot, transactions: synced.transactions, creditCardInvoices: synced.creditCardInvoices };
            };
            const cards = ["card-a", "card-b"].map((id) => core.normalizeCreditCard({ id, name: id, limit: 5000, closingDay: 10, dueDay: 17 }, new Set(["default", "second"])));
            const empty = core.normalizeFinanceSnapshot({ wallets, creditCards: cards, favoriteCreditCardId: "card-a" }, userId).snapshot;
            let state = createTransactionSnapshot({ ...empty, wallets, favoriteCreditCardId: "card-a" }, {
                id: "split", description: "Compra", type: "spending", value: -100, amount: -100, status: "pending", date: "2026-01-05", scheduledDate: "2026-01-05",
                paymentMethod: "credit_card", creditCardId: "card-a", transactionMode: "installment", installmentCount: 3,
            }, { userId, now: "2026-01-01T12:00:00Z" });
            const beforeMove = sync(state);
            state = sync({ ...state, transactions: state.transactions.map((item) => item.installmentNumber === 2
                ? { ...item, routingOverride: true, creditCardId: "card-b", invoiceId: null } : item) });
            await save(state);
            const settle = (cardId) => {
                const invoice = state.creditCardInvoices.find((item) => item.creditCardId === cardId && item.totalAmount > 0);
                const settled = buildInvoiceSettlement({ ...state, invoiceIds: [invoice.id], markAsPaid: true, userId, invoices: state.creditCardInvoices });
                state = { ...state, ...settled, creditCardInvoices: settled.invoices };
            };
            settle("card-a");
            await save(state);
            if (survivorPaid) { settle("card-b"); await save(state); }
            const amount = state.transactions.find((item) => item.installmentNumber === 2).amount;
            const deleteCard = (snapshot) => {
                const deleted = permanentlyDeleteCreditCardData({ ...snapshot, creditCardId: "card-a" });
                return sync({ ...snapshot, ...deleted, transactionGroups: recalculateGroupTotals(deleted.transactionGroups, deleted.transactions), favoriteCreditCardId: "card-b" });
            };
            state = stale ? mergeSupabaseFinanceData({ baseData: beforeMove, remoteData: state, targetData: deleteCard(beforeMove) }) : deleteCard(state);
            await save(state);
            const read = async () => (await database.query(`select g.credit_card_id, g.installment_count, g.total_amount::float as total, jsonb_array_length(g.removed_installments) as removed,
                t.installment_number, t.amount::float as amount, i.credit_card_id as invoice_card, i.status as invoice_status
                from public.transactions t join public.transaction_groups g on g.user_id = t.user_id and g.id = t.group_id
                left join public.credit_card_invoices i on i.user_id = t.user_id and i.id = t.invoice_id where t.payment_for_invoice_id is null`)).rows;
            const expected = [{ credit_card_id: "card-b", installment_count: 3, total: amount, removed: 2, installment_number: 2, amount, invoice_card: "card-b", invoice_status: survivorPaid ? "paid" : "open" }];
            assert.deepEqual(await read(), expected);
            // A client that does not know the column must not erase the record.
            const payload = buildFinanceChangesPayload(userId, saved, { ...saved, transactionGroups: saved.transactionGroups.map((item) => ({ ...item, title: "Novo" })) });
            payload.upserts.transaction_groups.forEach((row) => delete row.removed_installments);
            await database.query("select public.apply_finance_changes($1,$2::jsonb,'old-client')", [revision, JSON.stringify(payload)]);
            assert.deepEqual(await read(), expected);
        }
        // A card holding posted occurrences of a recurring series, with its invoice open or paid.
        for (const [index, paid] of [false, true].entries()) {
            const userId = `10000000-0000-0000-0000-00000000100${index}`;
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
            const cards = ["card-a", "card-b"].map((id) => core.normalizeCreditCard({ id, name: id, limit: 5000, closingDay: 10, dueDay: 17 }, new Set(["default", "second"])));
            const empty = core.normalizeFinanceSnapshot({ wallets, creditCards: cards, favoriteCreditCardId: "card-a" }, userId).snapshot;
            let state = { ...empty, wallets, favoriteCreditCardId: "card-a" };
            for (const card of cards) state = createTransactionSnapshot(state, {
                id: `sub-${card.id}`, description: "Assinatura", type: "spending", value: -50, amount: -50, status: "pending", date: "2026-01-05", scheduledDate: "2026-01-05",
                paymentMethod: "credit_card", creditCardId: card.id, transactionMode: "recurring",
            }, { userId, now: "2026-01-01T12:00:00Z" });
            for (const group of state.transactionGroups) state = materializeOccurrence(state, occurrenceId(group.id, 1));
            state = { ...state, transactions: state.transactions.map((item) => ({ ...item, commitment: "posted" })) };
            const synced = syncCreditCardInvoices({ ...state, existingInvoices: state.creditCardInvoices });
            state = { ...state, transactions: synced.transactions, creditCardInvoices: synced.creditCardInvoices };
            await save(state);
            const invoice = state.creditCardInvoices.find((item) => item.creditCardId === "card-a" && item.totalAmount > 0);
            if (paid) {
                const settled = buildInvoiceSettlement({ ...state, invoiceIds: [invoice.id], markAsPaid: true, userId, invoices: state.creditCardInvoices });
                state = { ...state, ...settled, creditCardInvoices: settled.invoices };
                await save(state);
            }
            const before = (await database.query("select count(*)::int as n from public.transactions where occurrence_number is not null")).rows[0].n;
            assert.equal(before, 2);
            const deleted = permanentlyDeleteCreditCardData({ ...state, creditCardId: "card-a" });
            await save({ ...state, ...deleted, transactionGroups: recalculateGroupTotals(deleted.transactionGroups, deleted.transactions), favoriteCreditCardId: "card-b" });
            const rows = (await database.query(`select (select array_agg(id) from public.credit_cards) as cards,
                (select array_agg(distinct credit_card_id) from public.credit_card_invoices) as invoice_cards,
                (select count(*)::int from public.transactions) as transactions,
                (select count(*)::int from public.finance_tombstones where entity_type = 'credit_card_invoice' and entity_id = '${invoice.id}') as invoice_tombstones`)).rows[0];
            assert.deepEqual(rows, { cards: ["card-b"], invoice_cards: ["card-b"], transactions: 1, invoice_tombstones: 1 });
        }
        console.log("PERMANENT DELETION OK wallets and cards used by paid invoices; card purchases and paid invoices outlive wallets");
    } finally {
        await runtime.close();
    }
}
