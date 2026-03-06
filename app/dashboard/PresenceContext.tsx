'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

interface PresenceContextType {
    onlineUsers: Set<string>
}

const PresenceContext = createContext<PresenceContextType>({ onlineUsers: new Set() })

export function PresenceProvider({ children }: { children: React.ReactNode }) {
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
    const supabase = createClient()

    useEffect(() => {
        // We need to get the user ID first
        const setupPresence = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Re-create channel with user ID as key
            const presenceChannel = supabase.channel('global-presence', {
                config: {
                    presence: {
                        key: user.id,
                    },
                },
            })

            presenceChannel
                .on('presence', { event: 'sync' }, () => {
                    const newState = presenceChannel.presenceState()
                    const users = new Set(Object.keys(newState))
                    setOnlineUsers(users)
                })
                .on('presence', { event: 'join' }, ({ key, newPresences }: { key: string, newPresences: any[] }) => {
                    setOnlineUsers(prev => {
                        const newSet = new Set(prev)
                        newSet.add(key)
                        return newSet
                    })
                })
                .on('presence', { event: 'leave' }, ({ key, leftPresences }: { key: string, leftPresences: any[] }) => {
                    setOnlineUsers(prev => {
                        const newSet = new Set(prev)
                        newSet.delete(key)
                        return newSet
                    })
                })
                .subscribe(async (status: string) => {
                    if (status === 'SUBSCRIBED') {
                        await presenceChannel.track({
                            user_id: user.id,
                            online_at: new Date().toISOString(),
                        })
                    }
                })

            return () => {
                supabase.removeChannel(presenceChannel)
            }
        }

        let cleanup: (() => void) | undefined;

        setupPresence().then(fn => {
            cleanup = fn;
        });

        return () => {
            cleanup?.();
        }
    }, [])

    return (
        <PresenceContext.Provider value={{ onlineUsers }}>
            {children}
        </PresenceContext.Provider>
    )
}

export const usePresence = () => useContext(PresenceContext)
