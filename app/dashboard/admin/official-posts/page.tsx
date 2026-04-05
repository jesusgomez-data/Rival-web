'use client'

import { useState, useEffect, useMemo } from 'react'
import { getMarketingAssets, publishOfficialPost, publishOfficialStory } from './actions'
import Image from 'next/image'
import { Calendar, Send, Clock, ChevronLeft, ChevronRight, CheckCircle2, Instagram, LayoutGrid, FileText, Loader2, Zap, ShieldAlert } from 'lucide-react'
import { clsx } from "clsx"
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

type AssetGroups = Record<string, { files: string[], description: string }>

export default function OfficialPostsAdmin() {
    const [assets, setAssets] = useState<AssetGroups>({})
    const [loading, setLoading] = useState(true)
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
    const [currentSlide, setCurrentSlide] = useState(0)
    const [publishing, setPublishing] = useState(false)
    const [success, setSuccess] = useState(false)

    const [caption, setCaption] = useState('')
    const [scheduledDate, setScheduledDate] = useState('')
    const [publishingStory, setPublishingStory] = useState(false)
    const [storySuccess, setStorySuccess] = useState(false)
    const [authorized, setAuthorized] = useState<boolean | null>(null)
    const router = useRouter()
    
    // Admin Whitelist
    const ADMIN_EMAILS = useMemo(() => ['rival.app.official@gmail.com', 'jesusgomez.s@hotmail.com'], [])

    useEffect(() => {
        checkAuth()
    }, [ADMIN_EMAILS])

    const checkAuth = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase().trim())) {
            setAuthorized(true)
            loadAssets()
        } else {
            setAuthorized(false)
            setLoading(false)
        }
    }

    async function loadAssets() {
        const res = await getMarketingAssets()
        if (res.assets) {
            setAssets(res.assets)
            // Select first group by default and set its description
            const firstGroup = Object.keys(res.assets)[0]
            if (firstGroup) {
                setSelectedGroup(firstGroup)
                setCaption(res.assets[firstGroup].description || '')
            }
        }
        setLoading(false)
    }

    const handlePublish = async () => {
        if (!selectedGroup) return
        
        setPublishing(true)
        const formData = new FormData()
        formData.append('assets', JSON.stringify(assets[selectedGroup].files))
        formData.append('caption', caption)
        if (scheduledDate) formData.append('scheduled_for', scheduledDate)

        const res = await publishOfficialPost(formData)
        setPublishing(false)

        if (res.success) {
            setSuccess(true)
            setTimeout(() => setSuccess(false), 3000)
        } else {
            alert(res.error || 'Error al publicar')
        }
    }

    const handlePublishStory = async () => {
        if (!selectedGroup) return
        
        setPublishingStory(true)
        const formData = new FormData()
        formData.append('assets', JSON.stringify(assets[selectedGroup].files))

        const res = await publishOfficialStory(formData)
        setPublishingStory(false)

        if (res.success) {
            setStorySuccess(true)
            setTimeout(() => setStorySuccess(false), 3000)
        } else {
            alert(res.error || 'Error al publicar historia')
        }
    }

    if (authorized === false) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6 border border-red-500/30">
                    <ShieldAlert className="w-10 h-10 text-brand-red" />
                </div>
                <h1 className="text-2xl font-black italic uppercase tracking-tight mb-2">ACCESO RESTRINGIDO</h1>
                <p className="text-gray-500 text-sm max-w-md mb-8 font-medium">Esta sección es de uso exclusivo para el equipo oficial de Rival Fit. Si crees que deberías tener acceso, contacta con soporte.</p>
                <button 
                    onClick={() => router.push('/dashboard')}
                    className="px-8 py-4 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all active:scale-95"
                >
                    Volver al Dashboard
                </button>
            </div>
        )
    }

    if (loading || authorized === null) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
            <Loader2 className="w-8 h-8 animate-spin text-brand-red mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Cargando panel oficial...</p>
        </div>
    )

    const groups = Object.keys(assets)
    const currentAssets = selectedGroup ? assets[selectedGroup] : []

    return (
        <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white mb-2">Canal Oficial <span className="text-brand-red">Admin</span></h1>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 max-w-xl">Gestiona las publicaciones corporativas de Rival Fit. El contenido se publica directamente como la marca oficial con insignia de verificación.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Selector de Contenido */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                        <LayoutGrid className="w-4 h-4 text-brand-red" />
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-white/50">Librería Marketing</h2>
                    </div>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        {groups.map(group => (
                            <button
                                key={group}
                                 onClick={() => {
                                    setSelectedGroup(group)
                                    setCurrentSlide(0)
                                    setCaption(assets[group].description || '')
                                }}
                                className={clsx(
                                    "w-full text-left p-4 rounded-2xl border transition-all group",
                                    selectedGroup === group 
                                        ? "bg-brand-red/10 border-brand-red text-white" 
                                        : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                                )}
                            >
                                <p className="text-[10px] font-black uppercase tracking-tight truncate">{group.replace(/-/g, ' ')}</p>
                                <p className="text-[9px] font-bold opacity-50 mt-1">{assets[group].files.length} diapositivas</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Preview del Contenido */}
                <div className="lg:col-span-5">
                    {selectedGroup && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <Instagram className="w-4 h-4 text-brand-red" />
                                <h2 className="text-[11px] font-black uppercase tracking-widest text-white/50">Previsualización (Feed)</h2>
                            </div>
                            
                            <div className="relative aspect-[4/5] w-full bg-black rounded-[40px] overflow-hidden border border-white/10 shadow-2xl">
                                {currentAssets.files[currentSlide]?.endsWith('.mp4') ? (
                                    <video src={currentAssets.files[currentSlide]} className="w-full h-full object-cover" autoPlay loop muted />
                                ) : (
                                    <Image
                                        src={currentAssets.files[currentSlide]}
                                        alt="Preview"
                                        fill
                                        className="object-cover"
                                    />
                                )}
                                
                                {currentAssets.files.length > 1 && (
                                    <>
                                        <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                                                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20 hover:bg-white/10"
                                            >
                                                <ChevronLeft className="w-6 h-6" />
                                            </button>
                                            <button 
                                                onClick={() => setCurrentSlide(prev => Math.min(currentAssets.files.length - 1, prev + 1))}
                                                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20 hover:bg-white/10"
                                            >
                                                <ChevronRight className="w-6 h-6" />
                                            </button>
                                        </div>
                                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-1.5 bg-black/40 backdrop-blur-xl rounded-full border border-white/10">
                                            {currentAssets.files.map((_, i) => (
                                                <div 
                                                    key={i} 
                                                    className={clsx(
                                                        "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                                        currentSlide === i ? "bg-brand-red w-4" : "bg-white/20"
                                                    )} 
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Editor y Publicación */}
                <div className="lg:col-span-4 space-y-6 bg-white/5 p-8 rounded-[32px] border border-white/5 border-l-white/10 shadow-xl self-start">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <FileText className="w-4 h-4 text-brand-red" />
                            <h2 className="text-[11px] font-black uppercase tracking-widest text-white/50">Detalles de Publicación</h2>
                        </div>
                        
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Descripción del Post</p>
                        <textarea
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            placeholder="Escribe el mensaje oficial aquí..."
                            className="w-full bg-black border border-white/10 rounded-2xl p-4 text-sm font-medium focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none min-h-[120px] transition-all"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Programar Publicación</p>
                            {scheduledDate && (
                                <button onClick={() => setScheduledDate('')} className="text-[9px] font-black text-brand-red uppercase">Limpiar</button>
                            )}
                        </div>
                        <div className="relative group">
                            <input
                                type="date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-2xl p-4 pl-12 text-sm font-black focus:border-brand-red outline-none appearance-none"
                            />
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-hover:text-brand-red transition-colors" />
                        </div>
                        <p className="text-[9px] font-medium text-gray-500 mt-2 italic">* Si lo dejas vacío, se publicará instantáneamente.</p>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/10">
                        <button
                            onClick={handlePublish}
                            disabled={publishing || !selectedGroup}
                            className={clsx(
                                "w-full h-16 rounded-2xl font-black uppercase tracking-tighter flex items-center justify-center gap-3 transition-all active:scale-95 group",
                                success 
                                    ? "bg-green-500 text-white" 
                                    : scheduledDate 
                                        ? "bg-blue-600 hover:bg-blue-500 text-white" 
                                        : "bg-brand-red hover:bg-brand-red/90 text-white shadow-[0_8px_30px_rgb(230,0,0,0.3)]"
                            )}
                        >
                            {publishing ? (
                                <>
                                    <Clock className="w-5 h-5 animate-spin" />
                                    <span>Procesando...</span>
                                </>
                            ) : success ? (
                                <>
                                    <CheckCircle2 className="w-6 h-6" />
                                    <span>¡Publicado con éxito!</span>
                                </>
                            ) : (
                                <>
                                    {scheduledDate ? <Clock className="w-5 h-5 group-hover:rotate-12 transition-transform" /> : <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                                    <span className="text-lg italic">{scheduledDate ? 'Programar Post' : 'Publicar Ahora'}</span>
                                </>
                            )}
                        </button>

                        {selectedGroup?.startsWith('story-') && (
                            <button
                                onClick={handlePublishStory}
                                disabled={publishingStory || !selectedGroup}
                                className={clsx(
                                    "w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 transition-all border group",
                                    storySuccess 
                                        ? "bg-green-500 border-green-500 text-white" 
                                        : "bg-white/5 border-white/10 text-white hover:bg-white/10 active:scale-95"
                                )}
                            >
                                {publishingStory ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : storySuccess ? (
                                    <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                    <Zap className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
                                )}
                                <span>{storySuccess ? '¡Historia Subida!' : 'Publicar como Historia'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
