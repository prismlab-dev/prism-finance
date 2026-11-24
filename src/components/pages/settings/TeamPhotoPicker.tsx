import { ImageUp, Trash2 } from "lucide-react";
import { useRef, type ChangeEvent } from "react";
import { cropImageFileToSquare } from "../../../lib/squareImage";
import { TeamAvatar } from "../../team/TeamAvatar";
import { SETTINGS_SECONDARY_BUTTON_CLASS } from "./SettingsSection";

interface TeamPhotoPickerProps {
    name: string;
    image: string | null;
    onChange: (image: string | null) => void;
    onError: (message: string) => void;
    disabled?: boolean;
}

export function TeamPhotoPicker({ name, image, onChange, onError, disabled = false }: TeamPhotoPickerProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) {
            return;
        }

        try {
            onChange(await cropImageFileToSquare(file));
        } catch (error) {
            onError(error instanceof Error ? error.message : "Não foi possível usar essa imagem.");
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-4">
            <TeamAvatar name={name} image={image} className="size-20 rounded-[20px]" iconSize={30} />
            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled} className={SETTINGS_SECONDARY_BUTTON_CLASS}>
                        <ImageUp size={15} aria-hidden />
                        {image ? "Trocar foto" : "Escolher foto"}
                    </button>
                    {image ? (
                        <button type="button" onClick={() => onChange(null)} disabled={disabled} className={SETTINGS_SECONDARY_BUTTON_CLASS} aria-label="Remover foto">
                            <Trash2 size={15} aria-hidden />
                        </button>
                    ) : null}
                </div>
                <p className="text-xs text-white/40">A foto é cortada no centro em formato quadrado.</p>
            </div>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleFile(event)} />
        </div>
    );
}
