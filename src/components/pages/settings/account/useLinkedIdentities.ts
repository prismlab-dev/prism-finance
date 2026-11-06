import type { UserIdentity } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { resolveSupabaseAuthErrorMessage } from "../../../../supabase/auth/authErrorMessages";
import { listSupabaseIdentities } from "../../../../supabase/auth/authService";

/** Lê o erro que o Supabase devolve na URL quando a vinculação falha e limpa a URL. */
function consumeRedirectError(): string | null {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = query.get("error_code") ?? hash.get("error_code");
    const description = query.get("error_description") ?? hash.get("error_description");

    if (!code && !description) {
        return null;
    }

    window.history.replaceState(null, "", window.location.pathname);
    return resolveSupabaseAuthErrorMessage(new Error(`${code ?? ""} ${description ?? ""}`), "Não foi possível vincular a conta Google.");
}

export function useLinkedIdentities(userId: string | undefined) {
    const [identities, setIdentities] = useState<UserIdentity[]>([]);
    const [loading, setLoading] = useState(true);
    const [redirectError] = useState(consumeRedirectError);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            setIdentities(await listSupabaseIdentities());
        } catch (error) {
            console.error("Falha ao carregar formas de entrar:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (userId) {
            void reload();
        }
    }, [userId, reload]);

    return { identities, loading, redirectError, reload };
}
