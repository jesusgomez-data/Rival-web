"use client"
import React, { useState, useEffect, useRef } from "react";
import { getFollows } from "@/app/dashboard/community/follows-actions";
import { createClient } from "@/utils/supabase/client";
import { clsx } from "clsx";

interface MentionInputProps {
    value: string;
    onChange: (val: string) => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    placeholder?: string;
    className?: string;
    containerClassName?: string;
    autoFocus?: boolean;
    as?: 'input' | 'textarea';
}

/**
 * An input component that provides @mention suggestions based on followed users.
 */
export default function MentionInput({
    value,
    onChange,
    onKeyDown,
    placeholder,
    className,
    containerClassName,
    autoFocus = false,
    as = 'input'
}: MentionInputProps) {
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [filteredSuggestions, setFilteredSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [mentionStart, setMentionStart] = useState(-1);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    // Fetch follows on mount
    useEffect(() => {
        async function fetchFollows() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const follows = await getFollows(user.id, 'following');
                setSuggestions(follows);
            }
        }
        fetchFollows();
    }, []);

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const pos = e.target.selectionStart || 0;
        onChange(newValue);
        setCursorPosition(pos);

        // Check for @ mention
        const textBeforeCursor = newValue.slice(0, pos);
        const lastAt = textBeforeCursor.lastIndexOf('@');

        // Ensure @ is either at start or after a space
        if (lastAt !== -1 && (lastAt === 0 || textBeforeCursor[lastAt - 1] === ' ')) {
            const mentionText = textBeforeCursor.slice(lastAt + 1);
            // Only suggest if it's one word (no spaces or newlines between @ and cursor)
            if (!mentionText.includes(' ') && !mentionText.includes('\n')) {
                setMentionStart(lastAt);
                const filtered = suggestions.filter(s =>
                    s.username?.toLowerCase().startsWith(mentionText.toLowerCase()) ||
                    s.full_name?.toLowerCase().includes(mentionText.toLowerCase())
                );
                setFilteredSuggestions(filtered);
                setShowSuggestions(filtered.length > 0);
                return;
            }
        }
        setShowSuggestions(false);
    };

    const handleSelect = (username: string) => {
        const beforeMention = value.slice(0, mentionStart + 1);
        const afterMention = value.slice(cursorPosition);
        const newValue = beforeMention + username + ' ' + afterMention;
        onChange(newValue);
        setShowSuggestions(false);

        // Refocus and set cursor
        if (inputRef.current) {
            inputRef.current.focus();
            // We can't immediately set selection because it might be overwritten by state update
            // However, most of the time it works fine or we accept it.
        }
    };

    const InputComponent = as;

    return (
        <div className={clsx("relative flex-1", containerClassName)}>
            <InputComponent
                ref={inputRef as any}
                value={value}
                onChange={handleChange}
                onKeyDown={(e) => {
                    // Navigate suggestions with keys? (Optional future improvement)
                    if (showSuggestions && e.key === 'Escape') {
                        setShowSuggestions(false);
                    }
                    if (onKeyDown) onKeyDown(e);
                }}
                placeholder={placeholder}
                className={className}
                autoFocus={autoFocus}
            />

            {showSuggestions && (
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#121212] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                    <div className="p-2.5 border-b border-white/5 bg-white/5 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Mencionar a...</span>
                        <button onClick={() => setShowSuggestions(false)} className="text-gray-500 hover:text-white transition-colors">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="max-h-56 overflow-y-auto custom-scrollbar">
                        {filteredSuggestions.map((user) => (
                            <button
                                key={user.id}
                                type="button"
                                onClick={() => handleSelect(user.username)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-brand-red transition-colors text-left group"
                            >
                                <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden border border-white/10 group-hover:border-white/30 shrink-0">
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-brand-red/10 text-brand-red text-[10px] font-bold">
                                            {user.username?.[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-white group-hover:text-white truncate">@{user.username}</p>
                                    <p className="text-[10px] text-gray-400 group-hover:text-white/70 truncate uppercase tracking-widest font-bold font-accent">{user.full_name}</p>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
