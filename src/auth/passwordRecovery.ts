import { useSyncExternalStore } from "react";

const PASSWORD_RECOVERY_STORAGE_KEY = "prism:supabase-password-recovery";

/** Token da sessão aberta por um link de redefinição (fluxo implicit). */
export function readRecoveryToken(href: string): string | null {
    const hash = new URLSearchParams(new URL(href).hash.slice(1));
    return hash.get("type") === "recovery" ? hash.get("access_token") : null;
}

// Lido antes do Supabase, que limpa o hash e só avisa da redefinição depois de entregar a sessão.
let recoveryToken = typeof window === "undefined" ? null : readRecoveryToken(window.location.href);

const listeners = new Set<() => void>();

function notify(): void {
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    window.addEventListener("storage", listener);

    return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", listener);
    };
}

/** Guarda o uid (e não só uma marca) para nunca valer para outra conta no mesmo navegador. */
export function startPasswordRecovery(uid: string): void {
    window.localStorage.setItem(PASSWORD_RECOVERY_STORAGE_KEY, uid);
    notify();
}

/** Bloqueia já na primeira vez que a sessão do link aparece, sem depender do evento PASSWORD_RECOVERY. */
export function detectPasswordRecovery(session: { access_token: string; user: { id: string } } | null): void {
    if (!session || session.access_token !== recoveryToken) return;
    // Uma vez só: o Supabase reemite a mesma sessão depois que a senha já foi trocada.
    recoveryToken = null;
    startPasswordRecovery(session.user.id);
}

export function finishPasswordRecovery(): void {
    window.localStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
    notify();
}

export function isPasswordRecoveryPending(uid: string | undefined): boolean {
    return uid !== undefined && window.localStorage.getItem(PASSWORD_RECOVERY_STORAGE_KEY) === uid;
}

export function usePasswordRecoveryPending(uid: string | undefined): boolean {
    return useSyncExternalStore(subscribe, () => isPasswordRecoveryPending(uid));
}
