'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { getActiveStories } from './actions'

interface Story {
    id: string
    media_url: string
    media_type: string
    created_at: string
    has_seen?: boolean
    music_url?: string | null
    music_title?: string | null
    music_artist?: string | null
    metadata?: any
}

interface UserStories {
    user: {
        id: string
        username: string
        full_name: string
        avatar_url: string | null
    }
    stories: Story[]
}

interface StoryContextType {
    userStories: UserStories[]
    setUserStories: React.Dispatch<React.SetStateAction<UserStories[]>>
    openStory: (userId: string) => void
    refreshStories: () => Promise<void>
}

const StoryContext = createContext<StoryContextType | undefined>(undefined)

export function StoryProvider({ children }: { children: React.ReactNode }) {
    const [userStories, setUserStories] = useState<UserStories[]>([])
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
    const [activeStoryIndex, setActiveStoryIndex] = useState(0)

    const refreshStories = async () => {
        const stories = await getActiveStories()
        setUserStories(stories as UserStories[])
    }

    useEffect(() => {
        refreshStories()
    }, [])

    const openStory = (userId: string) => {
        const index = userStories.findIndex(us => us.user.id === userId)
        if (index !== -1) {
            // Simplified for now, the viewer will be in StoryBar or a separate StoryViewer
            // But we need a way to communicate to the viewer
            window.dispatchEvent(new CustomEvent('open-story', { detail: { userId } }))
        }
    }

    return (
        <StoryContext.Provider value={{ userStories, setUserStories, openStory, refreshStories }}>
            {children}
        </StoryContext.Provider>
    )
}

export const useStories = () => {
    const context = useContext(StoryContext)
    if (!context) throw new Error('useStories must be used within a StoryProvider')
    return context
}
