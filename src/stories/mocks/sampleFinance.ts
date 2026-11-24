import {
    createFinanceSnapshot,
    normalizeBeneficiary,
    normalizeCreditCard,
    normalizeFinanceSnapshot,
    normalizeStoredTransaction,
    normalizeTag,
    normalizeTransactionGroup,
    normalizeWallet,
    normalizeWishItem,
    toTransactionList,
    type FinanceSnapshot,
    type StoredTransaction,
    type TransactionGroup,
    type TransactionGroupType,
    type TransactionStatus,
} from "../../context/finance/financeCore";
import { syncCreditCardInvoices } from "../../context/finance/syncCreditCardInvoices";
import type { AppUser } from "../../auth/appUser";
import type { FamilySummary, SharedWishlistSnapshot } from "../../context/familyTypes";
import type { UserProfileData } from "../../lib/userProfile";

// Dados fictícios só para o Storybook. Datas relativas a hoje, para as telas sempre mostrarem "este mês".

const NOW = new Date();
const pad = (value: number) => String(value).padStart(2, "0");
const monthDate = (offset: number, day: number) => {
    const date = new Date(NOW.getFullYear(), NOW.getMonth() + offset, 1);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(Math.min(day, 28))}`;
};
const CREATED = `${monthDate(-8, 1)}T12:00:00Z`;

export const SAMPLE_USER_ID = "user-demo";

export const SAMPLE_USER: AppUser = {
    uid: SAMPLE_USER_ID,
    email: "marina@exemplo.com",
    displayName: "Marina Souza",
    photoURL: null,
    providerData: [{ providerId: "password" }, { providerId: "google.com" }],
    metadata: { creationTime: CREATED },
};

export const SAMPLE_PROFILE: UserProfileData = {
    displayName: "Marina Souza",
    email: "marina@exemplo.com",
    photoURL: null,
    photoPublicId: null,
};

export const SAMPLE_FAMILY: FamilySummary = {
    id: "family-demo",
    name: "Família Souza",
    ownerUid: SAMPLE_USER_ID,
    memberCount: 2,
    members: [
        { uid: SAMPLE_USER_ID, displayName: "Marina Souza", email: "marina@exemplo.com", role: "admin", status: "active", joinedAt: CREATED },
        { uid: "user-2", displayName: "Carlos Souza", email: "carlos@exemplo.com", role: "member", status: "active", joinedAt: CREATED },
    ],
    invites: [],
    currentUserRole: "admin",
    maxMembers: 5,
};

export const SAMPLE_SHARED_WISHLISTS: SharedWishlistSnapshot[] = [
    {
        owner: { uid: "user-2", displayName: "Carlos Souza", photoURL: null },
        updatedAt: CREATED,
        items: [
            { id: "shared-1", description: "Bicicleta elétrica", value: 6200, priority: 2, link: null, imageUrl: null, createdAt: CREATED, isActive: true, categoryLabel: "Lazer", categoryIcon: "bike", categoryColor: "#8B5CF6" },
        ],
    },
] as unknown as SharedWishlistSnapshot[];

const base = normalizeFinanceSnapshot(null, SAMPLE_USER_ID, { defaultBeneficiaryName: "Marina" }).snapshot;

const wallets = [
    normalizeWallet({ id: "wallet-conta", name: "Conta Corrente", type: "checking", initialBalance: 5200, color: "#3B82F6", createdAt: CREATED }),
    normalizeWallet({ id: "wallet-poupanca", name: "Poupança", type: "savings", initialBalance: 12800, color: "#10B981", createdAt: CREATED }),
    normalizeWallet({ id: "wallet-carteira", name: "Dinheiro", type: "cash", initialBalance: 340, color: "#F59E0B", createdAt: CREATED }),
    normalizeWallet({ id: "wallet-invest", name: "Investimentos", type: "investment", initialBalance: 30000, color: "#8B5CF6", createdAt: CREATED }),
];
const walletIds = new Set(wallets.map((wallet) => wallet.id));

const creditCards = [
    normalizeCreditCard({ id: "card-roxo", name: "Cartão Roxo", limit: 8000, closingDay: 10, dueDay: 17, color: "#8B5CF6", bankWalletId: "wallet-conta", createdAt: CREATED }, walletIds),
    normalizeCreditCard({ id: "card-azul", name: "Cartão Azul", limit: 3500, closingDay: 25, dueDay: 5, color: "#3B82F6", bankWalletId: "wallet-conta", createdAt: CREATED }, walletIds),
];

const beneficiaries = [
    ...base.beneficiaries,
    normalizeBeneficiary({ id: "beneficiary-carlos", name: "Carlos", type: "person", avatarColor: "#F97316", sortOrder: 1, createdAt: CREATED }),
    normalizeBeneficiary({ id: "beneficiary-casa", name: "Casa", type: "cost_center", avatarColor: "#14B8A6", sortOrder: 2, createdAt: CREATED }),
    normalizeBeneficiary({ id: "beneficiary-rex", name: "Rex", type: "pet", avatarColor: "#EAB308", sortOrder: 3, createdAt: CREATED }),
];

const tags = [
    normalizeTag({ id: "tag-essencial", name: "Essencial", color: "#10B981", sortOrder: 0, createdAt: CREATED }),
    normalizeTag({ id: "tag-viagem", name: "Viagem", color: "#3B82F6", sortOrder: 1, createdAt: CREATED }),
    normalizeTag({ id: "tag-trabalho", name: "Trabalho", color: "#F59E0B", sortOrder: 2, createdAt: CREATED }),
];

const CAT = {
    food: "system-category-expense-food",
    market: "system-category-expense-food-market",
    restaurant: "system-category-expense-food-restaurants",
    housing: "system-category-expense-housing",
    transport: "system-category-expense-transport",
    health: "system-category-expense-health",
    leisure: "system-category-expense-leisure",
    salary: "system-category-income-salary",
    investments: "system-category-income-investments",
};

const wishItems = [
    normalizeWishItem({ id: "wish-1", value: 4200, categoryId: CAT.leisure, priority: 1, description: "Viagem para a serra", createdAt: CREATED }),
    normalizeWishItem({ id: "wish-2", value: 2800, categoryId: CAT.leisure, priority: 2, description: "Notebook novo", link: "https://exemplo.com/notebook", createdAt: CREATED }),
    normalizeWishItem({ id: "wish-3", value: 450, categoryId: CAT.leisure, priority: 3, description: "Tênis de corrida", createdAt: CREATED }),
];

const groups: TransactionGroup[] = [];
const stored: StoredTransaction[] = [];
let sequence = 0;

interface SingleOptions {
    categoryId?: string;
    walletId?: string | null;
    cardId?: string | null;
    beneficiaryId?: string | null;
    status?: TransactionStatus;
    notes?: string | null;
}

function addSingle(title: string, type: TransactionGroupType, amount: number, date: string, options: SingleOptions = {}) {
    sequence += 1;
    const groupId = `group-${sequence}`;
    const cardId = options.cardId ?? null;
    const walletId = cardId ? null : (options.walletId ?? "wallet-conta");
    groups.push(normalizeTransactionGroup({
        id: groupId, title, type, transactionMode: "single", totalAmount: amount, categoryId: options.categoryId ?? null,
        beneficiaryId: options.beneficiaryId ?? beneficiaries[0].id, notes: options.notes ?? null, createdAt: CREATED,
        sourceWalletId: type === "income" ? null : walletId, destinationWalletId: type === "income" ? walletId : null, creditCardId: cardId,
    }, walletIds));
    stored.push(normalizeStoredTransaction({
        id: `tx-${sequence}`, groupId, amount, scheduledDate: date, status: options.status ?? (date <= monthDate(0, NOW.getDate()) ? "paid" : "pending"),
        categoryId: options.categoryId ?? null, beneficiaryId: options.beneficiaryId ?? beneficiaries[0].id,
        sourceWalletId: type === "income" ? null : walletId, destinationWalletId: type === "income" ? walletId : null, creditCardId: cardId, createdAt: CREATED,
    }));
}

for (const offset of [-3, -2, -1, 0, 1]) {
    addSingle("Salário", "income", 7800, monthDate(offset, 5), { categoryId: CAT.salary });
    addSingle("Rendimentos", "income", 210 + offset * 8, monthDate(offset, 20), { categoryId: CAT.investments, walletId: "wallet-invest" });
    addSingle("Aluguel", "expense", 2100, monthDate(offset, 8), { categoryId: CAT.housing, beneficiaryId: "beneficiary-casa" });
    addSingle("Supermercado", "expense", 640 + offset * 35, monthDate(offset, 12), { categoryId: CAT.market, cardId: "card-roxo" });
    addSingle("Restaurante", "expense", 185, monthDate(offset, 15), { categoryId: CAT.restaurant, cardId: "card-roxo", beneficiaryId: "beneficiary-carlos" });
    addSingle("Combustível", "expense", 320, monthDate(offset, 18), { categoryId: CAT.transport, cardId: "card-azul" });
    addSingle("Farmácia", "expense", 96.5, monthDate(offset, 22), { categoryId: CAT.health, walletId: "wallet-carteira" });
    addSingle("Ração e veterinário", "expense", 240, monthDate(offset, 24), { categoryId: CAT.health, beneficiaryId: "beneficiary-rex", walletId: "wallet-conta" });
}

// Compra parcelada no cartão (6x), com algumas parcelas já pagas.
sequence += 1;
const installmentGroupId = `group-${sequence}`;
groups.push(normalizeTransactionGroup({
    id: installmentGroupId, title: "Notebook", type: "expense", transactionMode: "installment", totalAmount: 3600, installmentCount: 6,
    categoryId: CAT.leisure, beneficiaryId: beneficiaries[0].id, sourceWalletId: null, creditCardId: "card-roxo", createdAt: CREATED,
}, walletIds));
for (let index = 0; index < 6; index += 1) {
    const date = monthDate(index - 2, 10);
    stored.push(normalizeStoredTransaction({
        id: `tx-installment-${index + 1}`, groupId: installmentGroupId, installmentNumber: index + 1, amount: 600, scheduledDate: date,
        status: index < 2 ? "paid" : "pending", categoryId: CAT.leisure, beneficiaryId: beneficiaries[0].id, creditCardId: "card-roxo", createdAt: CREATED,
    }));
}

// Assinatura recorrente (a série projeta as ocorrências).
sequence += 1;
groups.push(normalizeTransactionGroup({
    id: `group-${sequence}`, title: "Streaming", type: "expense", transactionMode: "recurring", totalAmount: 39.9,
    categoryId: CAT.leisure, beneficiaryId: beneficiaries[0].id, sourceWalletId: null, creditCardId: "card-azul", createdAt: CREATED,
    recurrenceRule: {
        frequency: "monthly", interval: 1, anchorDate: monthDate(-5, 7), amount: 39.9, end: { type: "never" }, tagIds: [], excludedDates: [], notes: null, creditCardId: "card-azul",
    },
}, walletIds));

const synced = syncCreditCardInvoices({ creditCards, transactionGroups: groups, transactions: stored, existingInvoices: [] });

const transactionTags = [
    { transactionId: "tx-3", tagId: "tag-essencial" },
    { transactionId: "tx-4", tagId: "tag-essencial" },
];

export const SAMPLE_SNAPSHOT: FinanceSnapshot = createFinanceSnapshot(
    wallets, creditCards, synced.creditCardInvoices, "card-roxo", groups, synced.transactions, [],
    beneficiaries, base.categories, tags, wishItems, transactionTags,
    {
        ...base.planning,
        budgets: [
            { id: "budget-mercado", name: "Mercado", include: [{ kind: "category", categoryId: CAT.market }], exclude: [], amount: 1200, alertPercent: 80, createdAt: CREATED },
            { id: "budget-lazer", name: "Lazer e restaurantes", include: [{ kind: "category", categoryId: CAT.leisure }, { kind: "category", categoryId: CAT.restaurant }], exclude: [], amount: 500, alertPercent: 75, createdAt: CREATED },
        ],
    },
);

export const SAMPLE_TRANSACTIONS = toTransactionList(
    SAMPLE_SNAPSHOT.transactions, SAMPLE_SNAPSHOT.transactionGroups, SAMPLE_SNAPSHOT.categories, SAMPLE_SNAPSHOT.beneficiaries, SAMPLE_SNAPSHOT.tags, SAMPLE_SNAPSHOT.transactionTags,
);

export const SAMPLE_FAVORITE_WALLET_ID = "wallet-conta";
