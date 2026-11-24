import type { AppUser } from "../../../auth/appUser";
import type { FinanceSnapshot } from "../domainTypes";
import type { PersistFields } from "../contextTypes";
import type { FinanceStoreState } from "./useFinanceStoreState";

/** O que as ações do store precisam: estado atual, como confirmá-lo localmente e como persistir. */
export interface FinanceStoreKernel {
    user: AppUser | null;
    state: FinanceStoreState;
    persistFinanceFields: (fields: PersistFields) => void;
    persistFullSnapshot: (snapshot: FinanceSnapshot) => void;
}
