import { Building2 } from "lucide-react";

interface TeamAvatarProps {
    name: string;
    image: string | null;
    className?: string;
    iconSize?: number;
}

/** Foto 1:1 da equipe; sem foto, um prédio sobre fundo esmeralda. */
export function TeamAvatar({ name, image, className = "size-8 rounded-[9px]", iconSize = 16 }: TeamAvatarProps) {
    return (
        <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${image ? "" : "bg-emerald-500/15 text-emerald-200"} ${className}`}>
            {image ? <img src={image} alt={name} className="h-full w-full object-cover" /> : <Building2 size={iconSize} aria-hidden />}
        </span>
    );
}
