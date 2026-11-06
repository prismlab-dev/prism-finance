import { Hexagon } from "lucide-react";
import { version } from "../../../package.json";

interface AppBrandProps {
    /** Recolhe para só o ícone na faixa laptop, acompanhando a sidebar compacta. */
    compactAtLaptop?: boolean;
    showVersion?: boolean;
}

export function AppBrand({ compactAtLaptop = false, showVersion = true }: AppBrandProps) {
    return (
        <div
            className={[
                "flex min-w-0 flex-1 items-center gap-2 transition-[gap] duration-300 ease-out",
                compactAtLaptop ? "laptop:flex-none laptop:gap-0 desktop:flex-1 desktop:gap-2" : "",
            ].join(" ")}
        >
            <Hexagon className="shrink-0" size={25} />
            <h1
                className={[
                    "flex max-w-full flex-1 items-baseline justify-between overflow-hidden whitespace-nowrap uppercase leading-none opacity-100 transition-[max-width,opacity] duration-300 ease-out text-xl",
                    compactAtLaptop ? "laptop:max-w-0 laptop:opacity-0 desktop:max-w-full desktop:opacity-100" : "",
                ].join(" ")}
            >
                Silus
                {showVersion ? <span className="text-[11px] leading-none font-normal normal-case text-white/35 tabular-nums">v{version}</span> : null}
            </h1>
        </div>
    );
}
