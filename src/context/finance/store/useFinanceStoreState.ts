import { useCallback, useRef, useState, type RefObject } from "react";
import { DEFAULT_WALLET_ID } from "../domainConstants";
import type { FinanceSnapshot } from "../domainTypes";
import { DEFAULT_PLANNING_STATE, DEFAULT_WALLET } from "../defaultState";
import { createFinanceSnapshot } from "../financeSnapshot";
import type { UserProfileData } from "../../../lib/userProfile";

export type BuildSnapshot = (overrides?: Partial<FinanceSnapshot>) => FinanceSnapshot;

export interface FinanceStoreState {
    snapshot: FinanceSnapshot;
    favoriteWalletId: string;
    profile: UserProfileData | null;
    /** Espelhos síncronos do estado: as ações leem daqui para não depender do ciclo de render. */
    snapshotRef: RefObject<FinanceSnapshot>;
    favoriteWalletIdRef: RefObject<string>;
    profileRef: RefObject<UserProfileData | null>;
    commitSnapshot: (snapshot: FinanceSnapshot) => void;
    setFavoriteWalletId: (walletId: string) => void;
    setProfile: (profile: UserProfileData | null) => void;
    /** Recalcula saldos e resumo a partir do estado atual com as substituições dadas. */
    buildSnapshot: BuildSnapshot;
}

function createInitialSnapshot(): FinanceSnapshot {
    return createFinanceSnapshot([DEFAULT_WALLET], [], [], null, [], [], [], [], [], [], [], [], DEFAULT_PLANNING_STATE);
}

/** Estado local (cache) do snapshot financeiro, da carteira favorita e do perfil. */
export function useFinanceStoreState(): FinanceStoreState {
    const [snapshot, setSnapshot] = useState<FinanceSnapshot>(createInitialSnapshot);
    const [favoriteWalletId, setFavoriteWalletIdState] = useState(DEFAULT_WALLET_ID);
    const [profile, setProfileState] = useState<UserProfileData | null>(null);

    const snapshotRef = useRef(snapshot);
    const favoriteWalletIdRef = useRef(favoriteWalletId);
    const profileRef = useRef(profile);

    const commitSnapshot = useCallback((nextSnapshot: FinanceSnapshot) => {
        snapshotRef.current = nextSnapshot;
        setSnapshot(nextSnapshot);
    }, []);

    const setFavoriteWalletId = useCallback((walletId: string) => {
        favoriteWalletIdRef.current = walletId;
        setFavoriteWalletIdState(walletId);
    }, []);

    const setProfile = useCallback((nextProfile: UserProfileData | null) => {
        profileRef.current = nextProfile;
        setProfileState(nextProfile);
    }, []);

    const buildSnapshot = useCallback<BuildSnapshot>((overrides = {}) => {
        const current = snapshotRef.current;
        return createFinanceSnapshot(
            overrides.wallets ?? current.wallets,
            overrides.creditCards ?? current.creditCards,
            overrides.creditCardInvoices ?? current.creditCardInvoices,
            overrides.favoriteCreditCardId ?? current.favoriteCreditCardId,
            overrides.transactionGroups ?? current.transactionGroups,
            overrides.transactions ?? current.transactions,
            overrides.ledgerEntries ?? current.ledgerEntries,
            overrides.beneficiaries ?? current.beneficiaries,
            overrides.categories ?? current.categories,
            overrides.tags ?? current.tags,
            overrides.wishItems ?? current.wishItems,
            overrides.transactionTags ?? current.transactionTags,
            overrides.planning ?? current.planning,
        );
    }, []);

    return { snapshot, favoriteWalletId, profile, snapshotRef, favoriteWalletIdRef, profileRef, commitSnapshot, setFavoriteWalletId, setProfile, buildSnapshot };
}
