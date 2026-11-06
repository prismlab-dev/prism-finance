function readMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === "object" && error !== null && "message" in error) {
        const message = (error as { message?: unknown }).message;
        return typeof message === "string" ? message : "";
    }

    return "";
}

export function resolveSupabaseAuthErrorMessage(error: unknown, fallback: string): string {
    const message = readMessage(error).toLowerCase();

    if (message.includes("invalid login credentials")) {
        return "E-mail ou senha incorretos.";
    }

    if (message.includes("email not confirmed")) {
        return "Confirme seu e-mail antes de entrar.";
    }

    if (message.includes("user already registered") || message.includes("already registered")) {
        return "Este e-mail ja esta cadastrado.";
    }

    if (message.includes("password should be at least")) {
        return "A senha precisa ter no minimo 6 caracteres.";
    }

    if (message.includes("signup is disabled")) {
        return "Cadastro desabilitado no Supabase.";
    }

    if (message.includes("email address has already been registered") || message.includes("email_exists")) {
        return "Este e-mail já está em uso por outra conta.";
    }

    if (message.includes("invalid format") || message.includes("unable to validate email")) {
        return "Digite um e-mail válido.";
    }

    if (message.includes("identity is already linked") || message.includes("identity_already_exists")) {
        return "Esta conta Google já está vinculada a outro usuário do Prism.";
    }

    if (message.includes("manual linking is disabled")) {
        return "A vinculação de contas está desativada no Supabase.";
    }

    if (message.includes("at least 2 identities") || message.includes("single_identity_not_deletable")) {
        return "Mantenha pelo menos uma forma de entrar na conta.";
    }

    return fallback;
}
