'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Calendar, Lightbulb, BarChart3, FileText, Layers } from 'lucide-react'

const navItems = [
    { href: '/dashboard/admin/social-media', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/admin/social-media/calendar', label: 'Calendario', icon: Calendar },
    { href: '/dashboard/admin/social-media/ideas', label: 'Ideas', icon: Lightbulb },
    { href: '/dashboard/admin/social-media/metrics', label: 'Métricas', icon: BarChart3 },
    { href: '/dashboard/admin/social-media/scripts', label: 'Guiones IA', icon: FileText },
    { href: '/dashboard/admin/social-media/carousels', label: 'Carruseles IA', icon: Layers },
]

export default function SocialMediaLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    return (
        <div className="min-h-screen bg-[#080808]">
            {/* Top Nav */}
            <div className="border-b border-[#C9A84C]/20 bg-[#0a0a0a] sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1">
                        {navItems.map(item => {
                            const Icon = item.icon
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                                        isActive
                                            ? 'bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/30'
                                            : 'text-gray-500 hover:text-[#C9A84C] hover:bg-[#C9A84C]/5'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                {children}
            </div>
        </div>
    )
}
