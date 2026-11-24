import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { SAMPLE_SHARED_WISHLISTS } from "../../../stories/mocks/sampleFinance";
import { WishlistContextMenu } from "./WishlistContextMenu";
import { WishlistItemCard } from "./WishlistItemCard";
import { buildWishlistContextActions } from "./wishlistContextActions";
import { SAMPLE_SNAPSHOT } from "../../../stories/mocks/sampleFinance";

const meta = { title: "Componentes/Desejos/Peças", parameters: { layout: "padded" } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const item = SAMPLE_SHARED_WISHLISTS[0].items[0];

export const CartaoDeDesejo: Story = {
    name: "WishlistItemCard",
    render: () => (
        <div className="w-72 space-y-4">
            <WishlistItemCard item={item} isEditable projectionMonth={{ monthKey: "2027-03", label: "mar/2027" }} onEdit={fn()} onContextMenu={fn()} onOpenProjectionMonth={fn()} />
            <WishlistItemCard item={{ ...item, link: "https://exemplo.com/produto" }} isEditable={false} projectionMonth={null} onEdit={fn()} onContextMenu={fn()} onOpenProjectionMonth={fn()} />
        </div>
    ),
};
export const MenuDeContexto: Story = {
    name: "WishlistContextMenu",
    parameters: { layout: "fullscreen" },
    render: () => <WishlistContextMenu state={{ wishItemId: SAMPLE_SNAPSHOT.wishItems[0].id, x: 80, y: 40 }} actions={buildWishlistContextActions(SAMPLE_SNAPSHOT.wishItems[0])} onSelect={fn()} onClose={fn()} />,
};
