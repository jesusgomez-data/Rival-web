import { createClient } from './client';
import { Session } from '@supabase/supabase-js';

export interface SavedAccount {
    userId: string;
    email: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    level?: string;
    session: Session;
}

const STORAGE_KEY = 'rival_saved_accounts';

export function getSavedAccounts(): SavedAccount[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Error reading saved accounts:', e);
        return [];
    }
}

export function saveAccount(
    userId: string,
    email: string,
    username: string,
    fullName: string,
    avatarUrl: string,
    level: string | undefined,
    session: Session
) {
    if (typeof window === 'undefined') return;
    try {
        const accounts = getSavedAccounts();
        const existingIdx = accounts.findIndex(a => a.userId === userId);
        
        const updatedAccount: SavedAccount = {
            userId,
            email,
            username,
            fullName,
            avatarUrl,
            level,
            session
        };

        if (existingIdx > -1) {
            accounts[existingIdx] = updatedAccount;
        } else {
            accounts.push(updatedAccount);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    } catch (e) {
        console.error('Error saving account:', e);
    }
}

export function removeAccount(userId: string) {
    if (typeof window === 'undefined') return;
    try {
        const accounts = getSavedAccounts();
        const filtered = accounts.filter(a => a.userId !== userId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
        console.error('Error removing account:', e);
    }
}

export async function switchToAccount(userId: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
        const accounts = getSavedAccounts();
        const account = accounts.find(a => a.userId === userId);
        if (!account) return false;

        const supabase = createClient();
        
        // Use setSession to restore the session on the client, which also updates cookies
        const { error } = await supabase.auth.setSession({
            access_token: account.session.access_token,
            refresh_token: account.session.refresh_token
        });

        if (error) {
            console.error('Error setting session for switched account:', error);
            // If the session is invalid (e.g. expired refresh token), remove it from list
            removeAccount(userId);
            return false;
        }

        return true;
    } catch (e) {
        console.error('Error switching account:', e);
        return false;
    }
}

export function clearActiveSessionLocally() {
    if (typeof window === 'undefined') return;
    try {
        // 1. Clear localStorage keys starting with sb- and ending with -auth-token
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // 2. Clear cookies starting with sb-
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
            if (name.startsWith('sb-')) {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
            }
        }
    } catch (e) {
        console.error('Error clearing active session locally:', e);
    }
}
