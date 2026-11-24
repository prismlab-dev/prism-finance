import { useCallback, useMemo } from "react";
import { DEFAULT_BENEFICIARY_NAME } from "../domainConstants";
import type { Beneficiary } from "../domainTypes";
import type { FinanceActionsValue } from "../contextTypes";
import { normalizeBeneficiary } from "../entityNormalization/registryNormalizers";
import { createId, findBeneficiaryByName, findCurrentUserSelfBeneficiary } from "../helpers";
import { permanentlyDeleteBeneficiaryData } from "../permanentDeletion";
import { compareBySortOrderNameAndId, getNextSortOrder } from "../registryOrdering";
import { reorderByIds, setActiveById, upsertById } from "./registryCommands";
import type { FinanceStoreKernel } from "./storeKernel";
import { buildUserProfileData } from "../../../lib/userProfile";

type BeneficiaryActions = Pick<FinanceActionsValue, "addBeneficiary" | "reorderBeneficiaries" | "setBeneficiaryActive" | "permanentlyDeleteBeneficiary">;

/** Beneficiários compartilhados pela família e o perfil do próprio usuário não são editáveis aqui. */
function isProtectedBeneficiary(beneficiary: Beneficiary): boolean {
    return beneficiary.source === "family_shared" || beneficiary.isSelfProfile;
}

export function useBeneficiaryActions({ user, state, persistFinanceFields, persistFullSnapshot }: FinanceStoreKernel): BeneficiaryActions {
    const { snapshotRef, profileRef, buildSnapshot, commitSnapshot } = state;

    const commitBeneficiaries = useCallback(
        (beneficiaries: Beneficiary[], beneficiaryOrder = beneficiaries.map((beneficiary) => beneficiary.id)) => {
            const snapshot = buildSnapshot({ beneficiaries });
            commitSnapshot(snapshot);
            persistFinanceFields({ beneficiaries: snapshot.beneficiaries, beneficiaryOrder });
        },
        [buildSnapshot, commitSnapshot, persistFinanceFields],
    );

    const addBeneficiary = useCallback(
        async (newBeneficiary: Beneficiary) => {
            const beneficiaries = snapshotRef.current.beneficiaries;
            const existing = beneficiaries.find((item) => item.id === newBeneficiary.id) ?? null;
            if (existing?.source === "family_shared") {
                return;
            }

            const beneficiary = normalizeBeneficiary({
                ...newBeneficiary,
                userId: newBeneficiary.userId ?? user?.uid ?? null,
                familyId: newBeneficiary.familyId ?? null,
                source: newBeneficiary.source ?? "personal",
                isSelfProfile: newBeneficiary.isSelfProfile ?? false,
                sortOrder: existing?.sortOrder ?? newBeneficiary.sortOrder ?? getNextSortOrder(beneficiaries),
                createdAt: newBeneficiary.createdAt ?? new Date().toISOString(),
            });
            commitBeneficiaries(upsertById(beneficiaries, beneficiary).sort(compareBySortOrderNameAndId));
        },
        [commitBeneficiaries, snapshotRef, user?.uid],
    );

    const reorderBeneficiaries = useCallback(
        async (beneficiaryIds: string[]) => {
            const reordered = reorderByIds(snapshotRef.current.beneficiaries, beneficiaryIds);
            if (reordered) {
                commitBeneficiaries(reordered.items, reordered.orderedIds);
            }
        },
        [commitBeneficiaries, snapshotRef],
    );

    const setBeneficiaryActive = useCallback(
        async (beneficiaryId: string, isActive: boolean) => {
            const beneficiaries = snapshotRef.current.beneficiaries;
            const target = beneficiaries.find((beneficiary) => beneficiary.id === beneficiaryId);
            if (!target || isProtectedBeneficiary(target)) {
                return;
            }

            const result = setActiveById(beneficiaries, beneficiaryId, isActive);
            if (result.changed) {
                commitBeneficiaries(result.items.sort(compareBySortOrderNameAndId));
            }
        },
        [commitBeneficiaries, snapshotRef],
    );

    /** Só beneficiários inativos; as transações passam para o perfil do usuário (criado se faltar). */
    const permanentlyDeleteBeneficiary = useCallback(
        async (beneficiaryId: string) => {
            const current = snapshotRef.current;
            const target = current.beneficiaries.find((beneficiary) => beneficiary.id === beneficiaryId);
            if (!target || target.isActive || isProtectedBeneficiary(target)) {
                return;
            }

            let beneficiaries = [...current.beneficiaries];
            let fallbackBeneficiary = findCurrentUserSelfBeneficiary(beneficiaries, user?.uid) ?? findBeneficiaryByName(beneficiaries, DEFAULT_BENEFICIARY_NAME);
            if (!fallbackBeneficiary) {
                const profile = profileRef.current ?? (user ? buildUserProfileData(user) : null);
                fallbackBeneficiary = normalizeBeneficiary({
                    id: createId("beneficiary"),
                    userId: user?.uid ?? null,
                    familyId: null,
                    source: "personal",
                    isSelfProfile: false,
                    name: profile?.displayName ?? DEFAULT_BENEFICIARY_NAME,
                    type: "person",
                    avatarColor: null,
                    avatarImage: profile?.photoURL ?? null,
                    isActive: true,
                    sortOrder: getNextSortOrder(beneficiaries),
                    createdAt: new Date().toISOString(),
                });
                beneficiaries = [...beneficiaries, fallbackBeneficiary];
            }

            const deleted = permanentlyDeleteBeneficiaryData({
                beneficiaryId,
                beneficiaries,
                transactionGroups: current.transactionGroups,
                transactions: current.transactions,
                fallbackBeneficiary,
            });
            const snapshot = buildSnapshot({
                beneficiaries: deleted.beneficiaries.sort(compareBySortOrderNameAndId),
                transactionGroups: deleted.transactionGroups,
                transactions: deleted.transactions,
            });
            persistFullSnapshot(snapshot);
            commitSnapshot(snapshot);
        },
        [buildSnapshot, commitSnapshot, persistFullSnapshot, profileRef, snapshotRef, user],
    );

    return useMemo(
        () => ({ addBeneficiary, reorderBeneficiaries, setBeneficiaryActive, permanentlyDeleteBeneficiary }),
        [addBeneficiary, permanentlyDeleteBeneficiary, reorderBeneficiaries, setBeneficiaryActive],
    );
}
