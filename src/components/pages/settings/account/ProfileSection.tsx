import { ImagePlus, Trash2, UserRound, Undo2 } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { AppUser } from "../../../../auth/appUser";
import { dispatchAuthProfileUpdated } from "../../../../lib/authProfileEvents";
import { uploadAvatarToCloudinary } from "../../../../lib/cloudinary";
import { resolveSupabaseAuthErrorMessage } from "../../../../supabase/auth/authErrorMessages";
import { updateSupabaseProfile } from "../../../../supabase/auth/authService";
import { IconTextField } from "../../../transactions/IconTextField";
import { SettingsFeedback, SettingsSection } from "../SettingsSection";
import { Button } from "../../../ui/Button";

type ProfileSectionProps = {
    user: AppUser;
    userName: string;
    userPhotoUrl: string | null;
};

type PhotoMode = "keep" | "replace" | "remove";

export function ProfileSection({ user, userName, userPhotoUrl }: ProfileSectionProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const previewObjectUrlRef = useRef<string | null>(null);
    const [displayName, setDisplayName] = useState(userName);
    const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
    const [selectedPhotoPreviewUrl, setSelectedPhotoPreviewUrl] = useState<string | null>(null);
    const [photoMode, setPhotoMode] = useState<PhotoMode>("keep");
    const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const previewPhotoUrl = photoMode === "remove" ? null : (selectedPhotoPreviewUrl ?? userPhotoUrl);
    const hasChanges = displayName.trim() !== userName || photoMode !== "keep";

    function clearSelectedPhotoPreview() {
        if (previewObjectUrlRef.current) {
            URL.revokeObjectURL(previewObjectUrlRef.current);
            previewObjectUrlRef.current = null;
        }

        setSelectedPhotoFile(null);
        setSelectedPhotoPreviewUrl(null);
    }

    useEffect(() => {
        setDisplayName(userName);
        clearSelectedPhotoPreview();
        setPhotoMode("keep");
    }, [userName, userPhotoUrl]);

    useEffect(() => {
        return () => {
            if (previewObjectUrlRef.current) {
                URL.revokeObjectURL(previewObjectUrlRef.current);
            }
        };
    }, []);

    function handleUndoPhoto() {
        clearSelectedPhotoPreview();
        setPhotoMode("keep");
        setFeedback(null);
    }

    function handleRemovePhoto() {
        clearSelectedPhotoPreview();
        setPhotoMode("remove");
        setFeedback(null);
    }

    function handlePhotoFileChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            setFeedback({ type: "error", message: "Selecione um arquivo de imagem." });
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setFeedback({ type: "error", message: "Use uma imagem de até 2 MB." });
            return;
        }

        clearSelectedPhotoPreview();
        const objectUrl = URL.createObjectURL(file);
        previewObjectUrlRef.current = objectUrl;
        setSelectedPhotoFile(file);
        setSelectedPhotoPreviewUrl(objectUrl);
        setPhotoMode("replace");
        setFeedback(null);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const nextDisplayName = displayName.trim();
        if (!nextDisplayName) {
            setFeedback({ type: "error", message: "Digite um nome de usuário." });
            return;
        }

        setLoading(true);
        setFeedback(null);

        try {
            let nextPhotoUrl = userPhotoUrl;
            let nextPhotoPublicId: string | null | undefined = undefined;

            if (photoMode === "replace" && selectedPhotoFile) {
                const uploadResult = await uploadAvatarToCloudinary(selectedPhotoFile, user.uid);
                nextPhotoUrl = uploadResult.secureUrl;
                nextPhotoPublicId = uploadResult.publicId;
            } else if (photoMode === "remove") {
                nextPhotoUrl = null;
                nextPhotoPublicId = null;
            }

            await updateSupabaseProfile({
                displayName: nextDisplayName,
                photoURL: nextPhotoUrl,
                photoPublicId: nextPhotoPublicId,
            });
            dispatchAuthProfileUpdated();
            clearSelectedPhotoPreview();
            setPhotoMode("keep");
            setFeedback({ type: "success", message: "Perfil salvo." });
        } catch (error) {
            console.error("Falha ao atualizar perfil:", error);
            setFeedback({ type: "error", message: resolveSupabaseAuthErrorMessage(error, "Não foi possível salvar o perfil agora.") });
        } finally {
            setLoading(false);
        }
    }

    return (
        <SettingsSection title="Perfil" description="Nome e foto que aparecem no menu e para os membros da sua família.">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                    <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.06] text-xl font-semibold text-white">
                        {previewPhotoUrl ? <img src={previewPhotoUrl} alt="" className="h-full w-full object-cover" /> : (displayName.trim() || userName).charAt(0).toUpperCase()}
                    </span>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="lg" type="button" onClick={() => fileInputRef.current?.click()}>
                            <ImagePlus size={15} aria-hidden />
                            {previewPhotoUrl ? "Trocar foto" : "Enviar foto"}
                        </Button>
                        {photoMode !== "keep" ? (
                            <Button variant="secondary" size="lg" type="button" onClick={handleUndoPhoto}>
                                <Undo2 size={15} aria-hidden />
                                Desfazer
                            </Button>
                        ) : userPhotoUrl ? (
                            <Button variant="secondary" size="lg" type="button" onClick={handleRemovePhoto}>
                                <Trash2 size={15} aria-hidden />
                                Remover
                            </Button>
                        ) : null}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoFileChange} className="hidden" />
                </div>

                <div className="max-w-md">
                    <IconTextField
                        ariaLabel="Nome de usuário"
                        icon={UserRound}
                        value={displayName}
                        onChange={(value) => {
                            setDisplayName(value);
                            setFeedback(null);
                        }}
                        placeholder="Como você quer aparecer no Silus"
                        maxLength={60}
                    />
                </div>

                <SettingsFeedback feedback={feedback} />

                <Button variant="success" size="lg" type="submit" disabled={loading || !hasChanges}>
                    {loading ? "Salvando..." : "Salvar perfil"}
                </Button>
            </form>
        </SettingsSection>
    );
}
