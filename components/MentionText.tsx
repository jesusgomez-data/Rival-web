import Link from "next/link";
import { clsx } from "clsx";

interface MentionTextProps {
    text: string;
    className?: string;
    mentionClassName?: string;
}

/**
 * Renders text with clickable @mentions and #hashtags
 */
export default function MentionText({ text, className, mentionClassName }: MentionTextProps) {
    if (!text) return null;

    // Combined regex for mentions (@user) and hashtags (#tag)
    // Supports Spanish accents and special characters common in usernames/tags
    const combinedRegex = /((?:^|\s)[@#][\wñáéíóúü-]+(?:[.-][\wñáéíóúü-]+)*)/gi;

    return (
        <span className={className}>
            {text.split(combinedRegex).map((part, i) => {
                const trimmed = part.trim();
                const space = part.startsWith(' ') ? ' ' : '';

                if (trimmed.startsWith('@')) {
                    const username = trimmed.slice(1).toLowerCase();
                    return (
                        <span key={i}>
                            {space}
                            <Link
                                href={`/dashboard/profile/${username}`}
                                className={clsx(
                                    "text-brand-red font-bold hover:underline transition-colors",
                                    mentionClassName
                                )}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {trimmed}
                            </Link>
                        </span>
                    );
                }

                if (trimmed.startsWith('#')) {
                    const tag = trimmed.slice(1).toLowerCase();
                    return (
                        <span key={i}>
                            {space}
                            <Link
                                href={`/dashboard/hashtags/${tag}`}
                                className={clsx(
                                    "text-brand-red font-black italic hover:underline hover:scale-105 inline-block transition-all",
                                    mentionClassName
                                )}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {trimmed}
                            </Link>
                        </span>
                    );
                }

                return part;
            })}
        </span>
    );
}
