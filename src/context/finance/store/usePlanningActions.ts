import { useCallback, useEffect, useMemo } from "react";
import type { PlanningState } from "../domainTypes";
import type { FinanceActionsValue } from "../contextTypes";
import { normalizePlanningState } from "../planningState";
import type { FinanceStoreKernel } from "./storeKernel";
import { readLocalPreferenceSection, writeLocalPreferenceSection } from "../../../lib/localPreferences";
import {
    arePlanningLocalPreferencesEqual,
    areSyncedPlanningFieldsEqual,
    extractPlanningLocalPreferences,
    mergePlanningLocalPreferences,
    normalizePlanningLocalPreferences,
    PLANNING_LOCAL_PREFERENCES_SECTION,
} from "../../../lib/planningLocalPreferences";

/**
 * O planejamento tem duas partes: preferências de visualização (só neste navegador) e
 * simulações/orçamentos (sincronizados). Cada mudança vai só para onde pertence.
 */
export function usePlanningActions({ user, state, persistFinanceFields }: FinanceStoreKernel): Pick<FinanceActionsValue, "updatePlanningState"> {
    const { snapshotRef, buildSnapshot, commitSnapshot } = state;
    const userId = user?.uid;

    const updatePlanningState = useCallback(
        async (nextPlanning: PlanningState) => {
            const previousPlanning = snapshotRef.current.planning;
            const normalizedPlanning = normalizePlanningState(nextPlanning);
            const snapshot = buildSnapshot({ planning: normalizedPlanning });
            commitSnapshot(snapshot);

            if (!arePlanningLocalPreferencesEqual(previousPlanning, normalizedPlanning)) {
                writeLocalPreferenceSection(userId, PLANNING_LOCAL_PREFERENCES_SECTION, extractPlanningLocalPreferences(normalizedPlanning));
            }

            if (!areSyncedPlanningFieldsEqual(previousPlanning, normalizedPlanning)) {
                persistFinanceFields({ planning: snapshot.planning });
            }
        },
        [buildSnapshot, commitSnapshot, persistFinanceFields, snapshotRef, userId],
    );

    // Preferências alteradas em outra aba chegam pelo evento `storage`.
    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const handleStorage = () => {
            const planning = snapshotRef.current.planning;
            const localPreferences = readLocalPreferenceSection(userId, PLANNING_LOCAL_PREFERENCES_SECTION, extractPlanningLocalPreferences(planning), normalizePlanningLocalPreferences);
            if (!localPreferences.exists) {
                return;
            }

            const nextPlanning = mergePlanningLocalPreferences(planning, localPreferences.value);
            if (!arePlanningLocalPreferencesEqual(planning, nextPlanning)) {
                commitSnapshot(buildSnapshot({ planning: nextPlanning }));
            }
        };

        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, [buildSnapshot, commitSnapshot, snapshotRef, userId]);

    return useMemo(() => ({ updatePlanningState }), [updatePlanningState]);
}
