import { getCenterProducts } from "../../management-actions";
import { getCenterDetails, getOrganizationCenters } from "../../actions";
import StoreManager from "./StoreManager";
import { ShoppingBag } from "lucide-react";

export default async function StorePage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ centerId?: string }>
}) {
    const { id } = await params;
    const { centerId } = await searchParams;

    const idToFetch = centerId || id;
    const isSede = !!centerId;

    const [products, details, centers] = await Promise.all([
        getCenterProducts(idToFetch, isSede),
        getCenterDetails(id),
        getOrganizationCenters(id)
    ]);

    return (
        <div className="px-2 py-4 sm:p-8 space-y-6 sm:space-y-8 animate-fade-in">
            <div className="flex items-start gap-4 mb-4 sm:mb-8 border-b border-white/5 pb-4 sm:pb-8">
                <div className="p-3 bg-brand-red/10 rounded-2xl border border-brand-red/20 text-brand-red">
                    <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-heading font-black text-white italic uppercase">Store Manager</h1>
                    <p className="text-gray-400">Manage products, inventory, and sales.</p>
                </div>
            </div>

            <StoreManager
                centerId={id}
                initialProducts={products}
                centers={centers}
                orgDetails={details}
            />
        </div>
    );
}
