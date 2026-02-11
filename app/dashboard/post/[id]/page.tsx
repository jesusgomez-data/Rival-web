'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function PostRedirectPage() {
    const router = useRouter()
    const params = useParams()
    const postId = params.id as string

    useEffect(() => {
        // Redirigir al dashboard con el postId como hash para hacer scroll
        router.replace(`/dashboard#post-${postId}`)
    }, [router, postId])

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-brand-red mx-auto" />
                <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">
                    Cargando post...
                </p>
            </div>
        </div>
    )
}
