import { useCallback, useEffect, useState } from "react";
import type { AppUser } from "../../../auth/appUser";
import { subscribeToFinanceRevisionMessages } from "../crossTabSync";
import { normalizeFinanceSnapshot } from "../snapshotNormalization/normalizeFinanceSnapshot";
import { toSupabaseFinanceData } from "../useFinanceSyncQueue";
import { resolveFavoriteWalletId } from "./favoriteSelection";
import { applyLocalPlanningPreferences, prepareFinanceSnapshot } from "./prepareFinanceSnapshot";
import type { FamilyState } from "./useFamilyState";
import type { FinanceStoreState } from "./useFinanceStoreState";
import type { FinanceSyncBridge } from "./useFinanceSync";
import { DEFAULT_WALLET_ID } from "../domainConstants";
import { buildUserProfileData } from "../../../lib/userProfile";
import { loadCurrentFamilyContext } from "../../../supabase/family";
import { createEmptySupabaseFinanceData, loadSupabaseFinanceData, loadSupabaseFinanceIncrementally, subscribeToFinanceRevisionChanges } from "../../../supabase/finance";

/**
 * Carrega o snapshot confirmado ao entrar (priorizando escritas pendentes) e acompanha
 * revisões novas vindas do Supabase Realtime e de outras abas.
 */
export function useFinanceLoading(params: { user: AppUser | null; profileVersion: number; state: FinanceStoreState; sync: FinanceSyncBridge; setFamilyState: FamilyState["setFamilyState"] }): boolean {
    const { user, profileVersion, state, sync, setFamilyState } = params;
    const { profileRef, setProfile, commitSnapshot, setFavoriteWalletId } = state;
    const { financeSync, financeClientId, currentRevisionRef, lastAcknowledgedDataRef, saveLocalSnapshotBackup, applyRemoteFinanceData } = sync;
    const { enqueueSync, getPendingSyncData, hydratedUserId, hasPendingSync, retrySync } = financeSync;
    const [financeLoading, setFinanceLoading] = useState(true);

    useEffect(() => {
        let isActive = true;

        const loadFinance = async () => {
            if (!user) {
                const empty = normalizeFinanceSnapshot(null, null).snapshot;
                setProfile(null);
                commitSnapshot(empty);
                setFamilyState(null, []);
                setFavoriteWalletId(resolveFavoriteWalletId(DEFAULT_WALLET_ID, empty.wallets));
                setFinanceLoading(false);
                return;
            }

            // A fila de sync precisa ter recuperado as escritas pendentes deste usuário antes do primeiro load.
            setFinanceLoading(true);
            if (hydratedUserId !== user.uid) {
                return;
            }

            const profile = buildUserProfileData(user, { preferCurrentProfilePhoto: true });
            const pendingSyncFinance = getPendingSyncData();

            try {
                setProfile(profile);
                const remoteFinance = await loadSupabaseFinanceData(user.uid);
                const remoteAcknowledgedData = remoteFinance.data ?? createEmptySupabaseFinanceData();
                const prepared = prepareFinanceSnapshot({ financeSource: pendingSyncFinance ?? remoteFinance.data, userId: user.uid, profile });
                const localSnapshot = applyLocalPlanningPreferences(prepared.snapshot, user.uid);
                const familyContext = await loadCurrentFamilyContext().catch((error) => {
                    console.error("Failed to load family data:", error);
                    return { family: null, sharedWishlists: [] };
                });

                if (!isActive) {
                    return;
                }

                currentRevisionRef.current = remoteFinance.revision;
                lastAcknowledgedDataRef.current = remoteAcknowledgedData;
                commitSnapshot(localSnapshot);
                setFavoriteWalletId(prepared.favoriteWalletId);
                setFamilyState(familyContext.family, familyContext.sharedWishlists);
                saveLocalSnapshotBackup(localSnapshot, "load-success", prepared.favoriteWalletId);

                if (!pendingSyncFinance && (!remoteFinance.data || prepared.changed)) {
                    enqueueSync(toSupabaseFinanceData(localSnapshot, prepared.favoriteWalletId), {
                        baseRevision: remoteFinance.revision,
                        baseData: remoteAcknowledgedData,
                    });
                } else if (pendingSyncFinance) {
                    retrySync();
                }
            } catch (error) {
                console.error("Failed to load finance data:", error);
                if (isActive) {
                    setProfile(profile);
                    const fallback = prepareFinanceSnapshot({ financeSource: pendingSyncFinance, userId: user.uid, profile });
                    commitSnapshot(fallback.snapshot);
                    setFamilyState(null, []);
                    setFavoriteWalletId(fallback.favoriteWalletId);
                }
            } finally {
                if (isActive) {
                    setFinanceLoading(false);
                }
            }
        };

        void loadFinance();

        return () => {
            isActive = false;
        };
    }, [
        commitSnapshot,
        currentRevisionRef,
        enqueueSync,
        getPendingSyncData,
        hydratedUserId,
        lastAcknowledgedDataRef,
        profileVersion,
        retrySync,
        saveLocalSnapshotBackup,
        setFamilyState,
        setFavoriteWalletId,
        setProfile,
        user,
    ]);

    const refreshFromConfirmedRevision = useCallback(
        async (revision: number, trigger: string, updatedBy: string | null) => {
            if (!user || revision <= currentRevisionRef.current) {
                return;
            }

            // Eco da própria escrita: o snapshot local já está à frente.
            if (updatedBy === financeClientId) {
                currentRevisionRef.current = Math.max(currentRevisionRef.current, revision);
                return;
            }

            // Escritas pendentes resolvem o conflito pela fila (merge de três vias).
            if (hasPendingSync) {
                retrySync();
                return;
            }

            try {
                const acknowledgedData = lastAcknowledgedDataRef.current;
                const incremental = acknowledgedData ? await loadSupabaseFinanceIncrementally(acknowledgedData, currentRevisionRef.current) : null;
                const loadedFinance =
                    !incremental || incremental.requiresFullReload
                        ? await loadSupabaseFinanceData(user.uid)
                        : { data: incremental.data, revision: incremental.revision, tombstones: [] };
                if (loadedFinance.revision <= currentRevisionRef.current) {
                    return;
                }
                if (getPendingSyncData()) {
                    retrySync();
                    return;
                }

                applyRemoteFinanceData({
                    financeData: loadedFinance.data,
                    revision: loadedFinance.revision,
                    profile: profileRef.current ?? buildUserProfileData(user),
                    trigger,
                });
                setFinanceLoading(false);
            } catch (error) {
                console.error("Failed to refresh finance data after revision update:", error);
            }
        },
        [applyRemoteFinanceData, currentRevisionRef, financeClientId, getPendingSyncData, hasPendingSync, lastAcknowledgedDataRef, profileRef, retrySync, user],
    );

    useEffect(() => {
        if (!user) {
            currentRevisionRef.current = 0;
            lastAcknowledgedDataRef.current = null;
            return;
        }

        return subscribeToFinanceRevisionChanges(user.uid, (change) => {
            void refreshFromConfirmedRevision(change.revision, "supabase-realtime", change.updatedBy);
        });
    }, [currentRevisionRef, lastAcknowledgedDataRef, refreshFromConfirmedRevision, user]);

    useEffect(() => {
        if (!user) {
            return;
        }

        return subscribeToFinanceRevisionMessages(user.uid, (message) => {
            void refreshFromConfirmedRevision(message.revision, "cross-tab-revision", message.updatedBy);
        });
    }, [refreshFromConfirmedRevision, user]);

    return financeLoading;
}
