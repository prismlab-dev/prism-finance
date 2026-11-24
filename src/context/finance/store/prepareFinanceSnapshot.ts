import type { Beneficiary, FinanceSnapshot } from "../domainTypes";
import { createFinanceSnapshot } from "../financeSnapshot";
import { getTodayDate } from "../helpers";
import { materializeSeriesHorizon } from "../recurrence/materializeSeriesHorizon";
import { normalizeFinanceSnapshot } from "../snapshotNormalization/normalizeFinanceSnapshot";
import { resolveFavoriteWalletId } from "./favoriteSelection";
import { withSyncedInvoices } from "./snapshotInvoices";
import { readLocalPreferenceSection, writeLocalPreferenceSection } from "../../../lib/localPreferences";
import {
    extractPlanningLocalPreferences,
    mergePlanningLocalPreferences,
    normalizePlanningLocalPreferences,
    PLANNING_LOCAL_PREFERENCES_SECTION,
} from "../../../lib/planningLocalPreferences";
import type { UserProfileData } from "../../../lib/userProfile";
import type { SupabaseFinanceData } from "../../../supabase/finance";

export interface PreparedFinanceSnapshot {
    snapshot: FinanceSnapshot;
    favoriteWalletId: string;
    /** O snapshot preparado difere da fonte e deve ser regravado. */
    changed: boolean;
}

/**
 * Converte dados do servidor (ou um snapshot vazio, sem fonte) no snapshot local,
 * completando o horizonte das séries recorrentes que ficaram para trás.
 */
export function prepareFinanceSnapshot(params: {
    financeSource: SupabaseFinanceData | null;
    userId: string;
    profile: UserProfileData;
    sharedBeneficiaries?: Beneficiary[];
}): PreparedFinanceSnapshot {
    const source = params.financeSource;
    const snapshot = source
        ? createFinanceSnapshot(
              source.wallets,
              source.creditCards,
              source.creditCardInvoices,
              source.favoriteCreditCardId,
              source.transactionGroups,
              source.transactions,
              source.ledgerEntries,
              source.beneficiaries,
              source.categories,
              source.tags,
              source.wishItems,
              source.transactionTags,
              source.planning,
          )
        : normalizeFinanceSnapshot(null, params.userId, {
              defaultBeneficiaryName: params.profile.displayName,
              defaultBeneficiaryAvatarImage: params.profile.photoURL,
              sharedBeneficiaries: params.sharedBeneficiaries ?? [],
          }).snapshot;
    const favoriteWalletId = resolveFavoriteWalletId(source?.favoriteWalletId, snapshot.wallets);
    if (!source) {
        return { snapshot, favoriteWalletId, changed: true };
    }

    // Series only roll their horizon forward on edits; top up ones left behind (older series, idle months) on every load.
    const materialized = materializeSeriesHorizon(snapshot, getTodayDate());
    if (materialized === snapshot) {
        return { snapshot, favoriteWalletId, changed: false };
    }
    return { snapshot: withSyncedInvoices(materialized), favoriteWalletId, changed: true };
}

/** Preferências de planejamento ficam só neste navegador; a primeira leitura semeia a partir do snapshot. */
export function applyLocalPlanningPreferences(snapshot: FinanceSnapshot, userId: string | null | undefined): FinanceSnapshot {
    const fallbackPreferences = extractPlanningLocalPreferences(snapshot.planning);
    const localPreferences = readLocalPreferenceSection(userId, PLANNING_LOCAL_PREFERENCES_SECTION, fallbackPreferences, normalizePlanningLocalPreferences);

    if (!localPreferences.exists) {
        writeLocalPreferenceSection(userId, PLANNING_LOCAL_PREFERENCES_SECTION, fallbackPreferences);
    }

    return {
        ...snapshot,
        planning: mergePlanningLocalPreferences(snapshot.planning, localPreferences.value),
    };
}
