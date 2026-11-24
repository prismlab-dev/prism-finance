import { Eye, EyeOff } from "lucide-react";
import { Button } from "../../ui/Button";

interface RegistrySectionActionsProps {
    isShowingInactive: boolean;
    showLabel: string;
    hideLabel: string;
    createLabel: string;
    onToggleInactive: () => void;
    onCreate: () => void;
}

export function RegistrySectionActions({
    isShowingInactive,
    showLabel,
    hideLabel,
    createLabel,
    onToggleInactive,
    onCreate,
}: RegistrySectionActionsProps) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" shape="pill" className="cursor-pointer uppercase tracking-wide" type="button" onClick={onToggleInactive}>
                {isShowingInactive ? <EyeOff size={13} /> : <Eye size={13} />}
                {isShowingInactive ? hideLabel : showLabel}
            </Button>
            <Button variant="secondary" size="md" shape="pill" className="cursor-pointer text-xs! uppercase tracking-wide" type="button" onClick={onCreate}>
                {createLabel}
            </Button>
        </div>
    );
}
