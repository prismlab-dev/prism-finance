import { useCallback, useMemo } from "react";
import type { Tag, WishItem } from "../domainTypes";
import type { FinanceActionsValue } from "../contextTypes";
import { normalizeTag, normalizeWishItem } from "../entityNormalization/registryNormalizers";
import { permanentlyDeleteTagData } from "../permanentDeletion";
import { compareBySortOrderNameAndId, getNextSortOrder } from "../registryOrdering";
import { reorderByIds, setActiveById, upsertById } from "./registryCommands";
import type { FinanceStoreKernel } from "./storeKernel";

type TagAndWishlistActions = Pick<FinanceActionsValue, "addTag" | "reorderTags" | "setTagActive" | "permanentlyDeleteTag" | "addWishItem" | "removeWishItem">;

function compareWishItemsNewestFirst(a: WishItem, b: WishItem): number {
    return b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
}

export function useTagAndWishlistActions({ user, state, persistFinanceFields, persistFullSnapshot }: FinanceStoreKernel): TagAndWishlistActions {
    const { snapshotRef, buildSnapshot, commitSnapshot } = state;
    const userId = user?.uid ?? null;

    const commitTags = useCallback(
        (tags: Tag[]) => {
            const snapshot = buildSnapshot({ tags });
            commitSnapshot(snapshot);
            persistFinanceFields({ tags: snapshot.tags });
        },
        [buildSnapshot, commitSnapshot, persistFinanceFields],
    );

    const commitWishItems = useCallback(
        (wishItems: WishItem[]) => {
            const snapshot = buildSnapshot({ wishItems });
            commitSnapshot(snapshot);
            persistFinanceFields({ wishItems: snapshot.wishItems });
        },
        [buildSnapshot, commitSnapshot, persistFinanceFields],
    );

    const addTag = useCallback(
        async (newTag: Tag) => {
            const tags = snapshotRef.current.tags;
            const existing = tags.find((item) => item.id === newTag.id) ?? null;
            const tag = normalizeTag({
                ...newTag,
                userId: newTag.userId ?? userId,
                sortOrder: existing?.sortOrder ?? newTag.sortOrder ?? getNextSortOrder(tags),
                createdAt: newTag.createdAt ?? new Date().toISOString(),
            });
            commitTags(upsertById(tags, tag).sort(compareBySortOrderNameAndId));
        },
        [commitTags, snapshotRef, userId],
    );

    const reorderTags = useCallback(
        async (tagIds: string[]) => {
            const reordered = reorderByIds(snapshotRef.current.tags, tagIds);
            if (reordered) {
                commitTags(reordered.items);
            }
        },
        [commitTags, snapshotRef],
    );

    const setTagActive = useCallback(
        async (tagId: string, isActive: boolean) => {
            const result = setActiveById(snapshotRef.current.tags, tagId, isActive);
            if (result.changed) {
                commitTags(result.items.sort(compareBySortOrderNameAndId));
            }
        },
        [commitTags, snapshotRef],
    );

    const permanentlyDeleteTag = useCallback(
        async (tagId: string) => {
            const current = snapshotRef.current;
            const target = current.tags.find((tag) => tag.id === tagId);
            if (!target || target.isActive) {
                return;
            }

            const deleted = permanentlyDeleteTagData({ tagId, tags: current.tags, transactionTags: current.transactionTags, transactionGroups: current.transactionGroups });
            const snapshot = buildSnapshot({
                tags: deleted.tags.sort(compareBySortOrderNameAndId),
                transactionTags: deleted.transactionTags,
                transactionGroups: deleted.transactionGroups,
            });
            persistFullSnapshot(snapshot);
            commitSnapshot(snapshot);
        },
        [buildSnapshot, commitSnapshot, persistFullSnapshot, snapshotRef],
    );

    /** Desejo precisa de categoria, descrição e valor positivo; ao editar, mantém a data de criação. */
    const addWishItem = useCallback(
        async (newWishItem: WishItem) => {
            const wishItems = snapshotRef.current.wishItems;
            const existing = wishItems.find((item) => item.id === newWishItem.id) ?? null;
            const wishItem = normalizeWishItem({
                ...newWishItem,
                userId: newWishItem.userId ?? userId,
                isActive: newWishItem.isActive ?? true,
                createdAt: existing?.createdAt ?? newWishItem.createdAt ?? new Date().toISOString(),
            });
            if (!wishItem.categoryId.trim() || !wishItem.description.trim() || wishItem.value <= 0) {
                return;
            }

            commitWishItems(upsertById(wishItems, wishItem, "prepend").sort(compareWishItemsNewestFirst));
        },
        [commitWishItems, snapshotRef, userId],
    );

    const removeWishItem = useCallback(
        async (wishItemId: string) => {
            const wishItems = snapshotRef.current.wishItems;
            const nextWishItems = wishItems.filter((item) => item.id !== wishItemId);
            if (nextWishItems.length !== wishItems.length) {
                commitWishItems(nextWishItems);
            }
        },
        [commitWishItems, snapshotRef],
    );

    return useMemo(
        () => ({ addTag, reorderTags, setTagActive, permanentlyDeleteTag, addWishItem, removeWishItem }),
        [addTag, addWishItem, permanentlyDeleteTag, removeWishItem, reorderTags, setTagActive],
    );
}
