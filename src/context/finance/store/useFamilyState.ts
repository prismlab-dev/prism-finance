import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppUser } from "../../../auth/appUser";
import type { FamilySummary, SharedWishlistSnapshot } from "../../familyTypes";
import type { FinanceActionsValue } from "../contextTypes";
import {
    acceptSupabaseFamilyInvite,
    createSupabaseFamily,
    createSupabaseFamilyInvite,
    loadCurrentFamilyContext,
    removeSupabaseFamilyMember,
    subscribeToFamilyShareRevisionChanges,
} from "../../../supabase/family";

type FamilyActions = Pick<FinanceActionsValue, "createFamily" | "generateFamilyInvite" | "joinFamilyByCode" | "removeFamilyMember">;

export interface FamilyState {
    family: FamilySummary | null;
    sharedWishlists: SharedWishlistSnapshot[];
    setFamilyState: (family: FamilySummary | null, sharedWishlists: SharedWishlistSnapshot[]) => void;
    actions: FamilyActions;
}

/** Família do usuário e listas de desejo compartilhadas; as escritas passam pelas RPCs de família. */
export function useFamilyState(user: AppUser | null): FamilyState {
    const [family, setFamily] = useState<FamilySummary | null>(null);
    const [sharedWishlists, setSharedWishlists] = useState<SharedWishlistSnapshot[]>([]);
    const familyRef = useRef(family);

    const setFamilyState = useCallback((nextFamily: FamilySummary | null, nextSharedWishlists: SharedWishlistSnapshot[]) => {
        familyRef.current = nextFamily;
        setFamily(nextFamily);
        setSharedWishlists(nextSharedWishlists);
    }, []);

    const refreshFamilyState = useCallback(async () => {
        if (!user) {
            setFamilyState(null, []);
            return;
        }

        const familyContext = await loadCurrentFamilyContext();
        setFamilyState(familyContext.family, familyContext.sharedWishlists);
    }, [setFamilyState, user]);

    useEffect(() => {
        const familyId = family?.id;
        if (!familyId || !user) {
            return;
        }

        return subscribeToFamilyShareRevisionChanges(familyId, (change) => {
            if (change.updatedBy !== user.uid) {
                void refreshFamilyState().catch((error) => {
                    console.error("Failed to refresh shared family data:", error);
                });
            }
        });
    }, [family?.id, refreshFamilyState, user]);

    const createFamily = useCallback(
        async (familyName?: string) => {
            await createSupabaseFamily(familyName);
            await refreshFamilyState();
        },
        [refreshFamilyState],
    );

    const generateFamilyInvite = useCallback(async () => {
        const familyId = familyRef.current?.id;
        if (!familyId) {
            throw new Error("Crie ou entre em uma familia antes de gerar um convite.");
        }
        const invite = await createSupabaseFamilyInvite(familyId);
        await refreshFamilyState();
        return invite;
    }, [refreshFamilyState]);

    const joinFamilyByCode = useCallback(
        async (code: string) => {
            await acceptSupabaseFamilyInvite(code);
            await refreshFamilyState();
        },
        [refreshFamilyState],
    );

    const removeFamilyMember = useCallback(
        async (memberUid: string) => {
            const familyId = familyRef.current?.id;
            if (!familyId) {
                return;
            }
            await removeSupabaseFamilyMember(familyId, memberUid);
            await refreshFamilyState();
        },
        [refreshFamilyState],
    );

    const actions = useMemo(
        () => ({ createFamily, generateFamilyInvite, joinFamilyByCode, removeFamilyMember }),
        [createFamily, generateFamilyInvite, joinFamilyByCode, removeFamilyMember],
    );

    return { family, sharedWishlists, setFamilyState, actions };
}
