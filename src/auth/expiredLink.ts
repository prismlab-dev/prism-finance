/** O Supabase usa o mesmo código para link vencido e link já usado, de qualquer e-mail de autenticação. */
export function isExpiredAuthLink(href: string): boolean {
    const url = new URL(href);
    const hash = new URLSearchParams(url.hash.slice(1));

    return (url.searchParams.get("error_code") ?? hash.get("error_code")) === "otp_expired";
}
