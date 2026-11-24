import type { Beneficiary } from "../../context/FinanceContext";
import { contentColorOn } from "../../lib/colorContrast";

type BeneficiaryAvatarProps = {
    beneficiary: Pick<Beneficiary, "name" | "avatarImage" | "avatarColor">;
    /** Equipe fica levemente quadrada para contrastar com as pessoas. */
    isTeam?: boolean;
    className?: string;
    textClassName?: string;
};

function resolveInitial(name: string): string {
    const trimmedName = name.trim();
    if (!trimmedName) {
        return "?";
    }

    return trimmedName.charAt(0).toUpperCase();
}

export function BeneficiaryAvatar({ beneficiary, className, textClassName = "text-xs font-semibold text-white", isTeam = false }: BeneficiaryAvatarProps) {
    const resolvedClassName = className ?? `h-7 w-7 ${isTeam ? "rounded-lg" : "rounded-full"}`;
    return (
        <span
            className={`inline-flex items-center justify-center overflow-hidden bg-white/[0.03] ${resolvedClassName}`}
            style={{ backgroundColor: beneficiary.avatarImage ? undefined : beneficiary.avatarColor ?? "#4B5563" }}
        >
            {beneficiary.avatarImage ? <img src={beneficiary.avatarImage} alt={beneficiary.name} className="h-full w-full object-cover" /> : <span className={textClassName} style={{ color: contentColorOn(beneficiary.avatarColor ?? "#4B5563") }}>{resolveInitial(beneficiary.name)}</span>}
        </span>
    );
}
