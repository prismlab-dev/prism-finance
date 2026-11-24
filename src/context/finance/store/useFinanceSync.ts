import { useCallback, useMemo, useRef } from "react";
import type { AppUser } from "../../../auth/appUser";
import type { FinanceSnapshot } from "../domainTypes";
import type { PersistFields } from "../contextTypes";
import { getFinanceClientId, publishFinanceRevisionToTabs } from "../crossTabSync";
import { mergeSupabaseFinanceData } from "../financeSyncMerge";
import { assertInvoiceMutation } from "../invoiceMutations";
import { normalizeFinanceSnapshot } from "../snapshotNormalization/normalizeFinanceSnapshot";
import { toSupabaseFinanceData, useFinanceSyncQueue } from "../useFinanceSyncQueue";
import { applyLocalPlanningPreferences, prepareFinanceSnapshot, type PreparedFinanceSnapshot } from "./prepareFinanceSnapshot";
import type { FinanceStoreState } from "./useFinanceStoreState";
import { buildFinanceBackupFile, downloadFinanceBackupFile, saveLocalFinanceBackup } from "../../../lib/financeBackup";
import { buildUserProfileData, type UserProfileData } from "../../../lib/userProfile";
import { createEmptySupabaseFinanceData, loadSupabaseFinanceData, saveSupabaseFinanceData, type SupabaseFinanceData } from "../../../supabase/finance";

export interface ApplyRemoteFinanceParams {
    financeData: SupabaseFinanceData | null;
    revision: number;
    profile: UserProfileData;
    trigger: string;
}

/**
 * Ponte entre o estado local e o servidor: enfileira deltas sobre a última revisão
 * confirmada, aplica revisões aceitas/mescladas e mantém o backup local.
 */
export function useFinanceSync(user: AppUser | null, state: FinanceStoreState) {
    const { profileRef, favoriteWalletIdRef, setProfile, commitSnapshot, setFavoriteWalletId, buildSnapshot } = state;
    const financeClientId = useMemo(() => getFinanceClientId(), []);
    const currentRevisionRef = useRef(0);
    const lastAcknowledgedDataRef = useRef<SupabaseFinanceData | null>(null);

    const resolveProfile = useCallback((): UserProfileData | null => profileRef.current ?? (user ? buildUserProfileData(user) : null), [profileRef, user]);

    const saveLocalSnapshotBackup = useCallback(
        (snapshot: FinanceSnapshot, trigger: string, favoriteWalletIdOverride?: string | null) => {
            if (!user) {
                return;
            }

            const resolvedProfile = profileRef.current ?? buildUserProfileData(user);
            saveLocalFinanceBackup({
                uid: user.uid,
                email: user.email ?? null,
                displayName: resolvedProfile.displayName,
                favoriteWalletId: favoriteWalletIdOverride ?? favoriteWalletIdRef.current,
                finance: snapshot,
                trigger,
            });
        },
        [favoriteWalletIdRef, profileRef, user],
    );

    /** Substitui o estado local pelo snapshot preparado e registra a base confirmada. */
    const commitPreparedFinance = useCallback(
        (params: { prepared: PreparedFinanceSnapshot; revision: number; acknowledgedData: SupabaseFinanceData; profile: UserProfileData; trigger: string }) => {
            const localSnapshot = applyLocalPlanningPreferences(params.prepared.snapshot, user?.uid);
            currentRevisionRef.current = params.revision;
            lastAcknowledgedDataRef.current = params.acknowledgedData;
            setProfile(params.profile);
            commitSnapshot(localSnapshot);
            setFavoriteWalletId(params.prepared.favoriteWalletId);
            saveLocalSnapshotBackup(localSnapshot, params.trigger, params.prepared.favoriteWalletId);
            return localSnapshot;
        },
        [commitSnapshot, saveLocalSnapshotBackup, setFavoriteWalletId, setProfile, user?.uid],
    );

    const applyRemoteFinanceData = useCallback(
        (params: ApplyRemoteFinanceParams) => {
            const prepared = prepareFinanceSnapshot({ financeSource: params.financeData, userId: user?.uid ?? "", profile: params.profile });
            commitPreparedFinance({
                prepared,
                revision: params.revision,
                acknowledgedData: params.financeData ?? createEmptySupabaseFinanceData(),
                profile: params.profile,
                trigger: params.trigger,
            });
        },
        [commitPreparedFinance, user?.uid],
    );

    const applyConfirmedRevision = useCallback(
        (financeData: SupabaseFinanceData, revision: number) => {
            const resolvedProfile = resolveProfile();
            if (resolvedProfile) {
                applyRemoteFinanceData({ financeData, revision, profile: resolvedProfile, trigger: "sync-accepted" });
            } else {
                currentRevisionRef.current = revision;
                lastAcknowledgedDataRef.current = financeData;
            }
            if (user) {
                publishFinanceRevisionToTabs(user.uid, revision, financeClientId);
            }
        },
        [applyRemoteFinanceData, financeClientId, resolveProfile, user],
    );

    const mergeAndPrepareFinanceData = useCallback(
        (params: { baseData: SupabaseFinanceData; remoteData: SupabaseFinanceData; targetData: SupabaseFinanceData }): SupabaseFinanceData => {
            const mergedData = mergeSupabaseFinanceData(params);
            const resolvedProfile = resolveProfile();
            if (!resolvedProfile) {
                return mergedData;
            }

            const prepared = prepareFinanceSnapshot({ financeSource: mergedData, userId: user?.uid ?? "", profile: resolvedProfile });
            return toSupabaseFinanceData(prepared.snapshot, prepared.favoriteWalletId);
        },
        [resolveProfile, user?.uid],
    );

    const applyConflictMergedData = useCallback(
        (financeData: SupabaseFinanceData, baseData: SupabaseFinanceData, revision: number) => {
            const resolvedProfile = resolveProfile();
            if (!resolvedProfile) {
                return;
            }

            const prepared = prepareFinanceSnapshot({ financeSource: financeData, userId: user?.uid ?? "", profile: resolvedProfile });
            commitPreparedFinance({ prepared, revision, acknowledgedData: baseData, profile: resolvedProfile, trigger: "revision-conflict-merge" });
        },
        [commitPreparedFinance, resolveProfile, user?.uid],
    );

    const backupPendingData = useCallback(
        async (financeData: SupabaseFinanceData) => {
            if (!user) throw new Error("Entre na sua conta para salvar a cópia local.");
            const resolvedProfile = profileRef.current ?? buildUserProfileData(user);
            const prepared = prepareFinanceSnapshot({ financeSource: financeData, userId: user.uid, profile: resolvedProfile });
            const backup = { uid: user.uid, finance: prepared.snapshot, favoriteWalletId: prepared.favoriteWalletId };
            await saveLocalFinanceBackup({ ...backup, trigger: "before-sync-recovery" });
            downloadFinanceBackupFile(buildFinanceBackupFile(backup), "prism-alteracoes-nao-sincronizadas");
        },
        [profileRef, user],
    );

    const financeSync = useFinanceSyncQueue({
        userId: user?.uid ?? null,
        clientId: financeClientId,
        saveFinanceData: saveSupabaseFinanceData,
        loadFinanceData: loadSupabaseFinanceData,
        mergeFinanceData: mergeAndPrepareFinanceData,
        onSyncAccepted: applyConfirmedRevision,
        onConflictMerged: applyConflictMergedData,
        backupPendingData,
    });
    const { enqueueSync } = financeSync;

    /** Enfileira o snapshot atual (com as substituições dadas) sobre a última revisão confirmada. */
    const persistFinanceFields = useCallback(
        (fields: PersistFields) => {
            if (!user) {
                return;
            }

            const snapshot = buildSnapshot(fields);
            const resolvedFavoriteWalletId = fields.favoriteWalletId ?? favoriteWalletIdRef.current;
            if (lastAcknowledgedDataRef.current) assertInvoiceMutation(lastAcknowledgedDataRef.current, snapshot);
            const financeData = toSupabaseFinanceData(snapshot, resolvedFavoriteWalletId);
            saveLocalSnapshotBackup(snapshot, "persist-fields", resolvedFavoriteWalletId);
            enqueueSync(financeData, {
                baseRevision: currentRevisionRef.current,
                baseData: lastAcknowledgedDataRef.current ?? financeData,
            });
        },
        [buildSnapshot, enqueueSync, favoriteWalletIdRef, saveLocalSnapshotBackup, user],
    );

    const persistFullSnapshot = useCallback(
        (snapshot: FinanceSnapshot) => {
            persistFinanceFields({ ...snapshot, favoriteWalletId: favoriteWalletIdRef.current });
        },
        [favoriteWalletIdRef, persistFinanceFields],
    );

    const updateFinance = useCallback(
        async (newFinance: FinanceSnapshot) => {
            const resolvedProfile = resolveProfile();
            const normalized = normalizeFinanceSnapshot(newFinance, user?.uid ?? null, {
                defaultBeneficiaryName: resolvedProfile?.displayName,
                defaultBeneficiaryAvatarImage: resolvedProfile?.photoURL ?? null,
                sharedBeneficiaries: state.snapshotRef.current.beneficiaries.filter((beneficiary) => beneficiary.source === "family_shared"),
            }).snapshot;
            commitSnapshot(normalized);
            persistFullSnapshot(normalized);
        },
        [commitSnapshot, persistFullSnapshot, resolveProfile, state.snapshotRef, user?.uid],
    );

    return {
        financeSync,
        financeClientId,
        currentRevisionRef,
        lastAcknowledgedDataRef,
        saveLocalSnapshotBackup,
        applyRemoteFinanceData,
        persistFinanceFields,
        persistFullSnapshot,
        updateFinance,
    };
}

export type FinanceSyncBridge = ReturnType<typeof useFinanceSync>;
