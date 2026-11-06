import { Mail } from "lucide-react";
import { GoogleIcon } from "../../../common/GoogleIcon";

type AccountIdentityHeaderProps = {
    userName: string;
    email: string | null;
    photoUrl: string | null;
    createdAt: string | undefined;
    hasEmailLogin: boolean;
    hasGoogleLogin: boolean;
};

function formatMemberSince(createdAt: string | undefined): string | null {
    const date = createdAt ? new Date(createdAt) : null;
    if (!date || Number.isNaN(date.getTime())) {
        return null;
    }

    return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

export function AccountIdentityHeader({ userName, email, photoUrl, createdAt, hasEmailLogin, hasGoogleLogin }: AccountIdentityHeaderProps) {
    const memberSince = formatMemberSince(createdAt);

    return (
        <header className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101010] p-5 sm:p-7">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-emerald-500/[0.07] blur-3xl" />
            <div className="relative flex flex-wrap items-center gap-5">
                <span className="inline-flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.06] text-2xl font-semibold text-white ring-1 ring-white/[0.1] ring-offset-4 ring-offset-[#101010]">
                    {photoUrl ? <img src={photoUrl} alt="" className="h-full w-full object-cover" /> : userName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-2xl font-semibold tracking-tight text-white sm:text-[28px]">{userName}</h2>
                    <p className="mt-1 truncate text-sm text-white/55">{email ?? "E-mail indisponível"}</p>
                    {memberSince ? <p className="mt-0.5 text-sm text-white/35">No Silus desde {memberSince}</p> : null}
                </div>
                <ul className="flex flex-wrap gap-2" aria-label="Formas de entrar ativas">
                    {hasEmailLogin ? (
                        <li className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs text-white/70">
                            <Mail size={13} aria-hidden />
                            E-mail
                        </li>
                    ) : null}
                    {hasGoogleLogin ? (
                        <li className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs text-white/70">
                            <span className="scale-75">
                                <GoogleIcon />
                            </span>
                            Google
                        </li>
                    ) : null}
                </ul>
            </div>
        </header>
    );
}
