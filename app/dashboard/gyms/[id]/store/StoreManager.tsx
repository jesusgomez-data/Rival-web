"use client";

import { useState } from "react";
import { Plus, Trash2, Tag, ShoppingBag, Edit2, CreditCard, Banknote, User, Search, Loader2, X, Check } from "lucide-react";
import { createProduct, updateProduct, deleteProduct, searchAthletes, processStoreSale } from "../../management-actions"; // Added imports

import clsx from "clsx"; // Added clsx

export default function StoreManager({ centerId, initialProducts }: any) {
    const [products, setProducts] = useState(initialProducts);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null); // For edit mode
    const [isSaving, setIsSaving] = useState(false);

    // Sales Modal State
    const [showSalesModal, setShowSalesModal] = useState(false);
    const [selectedProductForSale, setSelectedProductForSale] = useState<any>(null);
    const [salesStep, setSalesStep] = useState(1); // 1: Select Member, 2: Payment
    const [memberSearchQuery, setMemberSearchQuery] = useState("");
    const [memberSearchResults, setMemberSearchResults] = useState<any[]>([]);
    const [isSearchingMember, setIsSearchingMember] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
    const [isProcessingSale, setIsProcessingSale] = useState(false);

    // Initial state for form reset
    const emptyForm = {
        name: '',
        price: '',
        stock: '',
        category: 'apparel',
        description: ''
    };

    function handleOpenCreate() {
        setEditingProduct(null);
        setShowModal(true);
    }

    function handleOpenEdit(product: any) {
        setEditingProduct(product);
        setShowModal(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSaving(true);
        const formData = new FormData(e.target as HTMLFormElement); // Reads all form fields (name, price, stock, category, description, image)

        let res;
        if (editingProduct) {
            res = await updateProduct(centerId, editingProduct.id, formData);
        } else {
            res = await createProduct(centerId, formData);
        }

        setIsSaving(false);

        if (res.error) {
            alert(res.error);
        } else {
            setShowModal(false);
            setEditingProduct(null);
            window.location.reload();
        }
    }

    // Sales Logic
    function handleOpenSale(product: any) {
        setSelectedProductForSale(product);
        setSalesStep(1);
        setSelectedMember(null);
        setMemberSearchQuery("");
        setMemberSearchResults([]);
        setShowSalesModal(true);
    }

    const handleMemberSearch = async (query: string) => {
        setMemberSearchQuery(query);
        if (query.length < 2) {
            setMemberSearchResults([]);
            return;
        }
        setIsSearchingMember(true);
        const results = await searchAthletes(query);
        setMemberSearchResults(results);
        setIsSearchingMember(false);
    };

    async function handleProcessSale() {
        if (!selectedProductForSale) return;
        setIsProcessingSale(true);

        const saleData = {
            product_id: selectedProductForSale.id,
            member_id: selectedMember ? selectedMember.id : null,
            payment_method: paymentMethod
        };

        const res = await processStoreSale(centerId, {
            ...saleData,
            member_id: selectedMember?.id
        });

        setIsProcessingSale(false);

        if (res.error) {
            alert(res.error);
        } else {
            alert("Venta procesada correctamente!");
            setShowSalesModal(false);
            setProducts((prev: any) => prev.map((p: any) =>
                p.id === selectedProductForSale.id
                    ? { ...p, stock_quantity: p.stock_quantity - 1 }
                    : p
            ));
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this product?")) return;
        const res = await deleteProduct(centerId, id);
        if (res.success) {
            setProducts(products.filter((p: any) => p.id !== id));
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-gray-400 text-sm">
                    <ShoppingBag className="w-5 h-5 shrink-0" />
                    <span>Manage your merchandise, supplements, and gear.</span>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="w-full sm:w-auto bg-brand-red text-white py-3 px-6 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-lg"
                >
                    <Plus className="w-5 h-5" /> Add Product
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {products.map((product: any) => (
                    <div key={product.id} className="bg-brand-gray border border-white/5 rounded-2xl p-4 sm:p-6 relative group overflow-hidden">
                        <div className="absolute top-4 right-4 z-10 flex gap-2">
                            <button onClick={() => handleOpenEdit(product)} className="p-2 bg-black/50 text-white rounded-lg hover:bg-blue-600 transition-colors">
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(product.id)} className="p-2 bg-black/50 text-white rounded-lg hover:bg-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="h-40 bg-black/40 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden">
                            {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                                <Tag className="w-12 h-12 text-gray-700" />
                            )}
                            <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-xs text-white font-mono">
                                Stock: {product.stock_quantity}
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-white font-bold text-lg truncate pr-2">{product.name}</h3>
                                <span className="text-brand-red font-black text-lg">€{product.price}</span>
                            </div>
                            <p className="text-gray-500 text-sm line-clamp-2 h-10 mb-3">{product.description}</p>
                            <span className="inline-block bg-white/5 text-gray-400 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">
                                {product.category}
                            </span>
                            <button
                                onClick={() => handleOpenSale(product)}
                                className="w-full mt-4 bg-white text-black py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-brand-red hover:text-white transition-all flex items-center justify-center gap-2 shadow-lg"
                            >
                                <ShoppingBag className="w-3 h-3" /> Vender
                            </button>
                        </div>
                    </div>
                ))}

                {products.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-2xl">
                        <ShoppingBag className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                        <p className="text-gray-500">Your store is empty.</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-brand-gray border border-white/10 rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-black text-white italic uppercase mb-6">{editingProduct ? 'Edit Product' : 'New Product'}</h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 ml-1">Product Name</label>
                                <input
                                    name="name"
                                    required
                                    defaultValue={editingProduct?.name || ''}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-red text-sm"
                                    placeholder="e.g. Rival T-Shirt"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 ml-1">Price (€)</label>
                                    <input
                                        name="price"
                                        type="number"
                                        step="0.01"
                                        required
                                        defaultValue={editingProduct?.price || ''}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-red text-sm"
                                        placeholder="25.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 ml-1">Stock</label>
                                    <input
                                        name="stock"
                                        type="number"
                                        required
                                        defaultValue={editingProduct?.stock_quantity || ''}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-red text-sm"
                                        placeholder="100"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 ml-1">Category</label>
                                <select
                                    name="category"
                                    defaultValue={editingProduct?.category || 'apparel'}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-red text-sm appearance-none"
                                >
                                    <option value="apparel">Apparel</option>
                                    <option value="supplements">Supplements</option>
                                    <option value="gear">Gear</option>
                                    <option value="drinks">Drinks/Food</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 ml-1">Description</label>
                                <textarea
                                    name="description"
                                    defaultValue={editingProduct?.description || ''}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-red text-sm h-24 resize-none"
                                    placeholder="Product details..."
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 ml-1">{editingProduct ? 'Replace Image (Optional)' : 'Product Image'}</label>
                                <input
                                    name="image"
                                    type="file"
                                    accept="image/*"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-red text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-red file:text-white hover:file:bg-red-600"
                                />
                                {editingProduct?.image_url && (
                                    <p className="mt-2 text-[10px] text-gray-500">Current image: <a href={editingProduct.image_url} target="_blank" className="text-brand-red underline">View</a></p>
                                )}
                            </div>

                            <div className="flex gap-2 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-transparent border border-white/10 text-white py-3 rounded-xl text-xs font-black uppercase hover:bg-white/5">Cancel</button>
                                <button type="submit" disabled={isSaving} className="flex-1 bg-white text-black py-3 rounded-xl text-xs font-black uppercase hover:bg-brand-red hover:text-white disabled:opacity-50">{isSaving ? 'Saving...' : (editingProduct ? 'Save Changes' : 'Create Product')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
