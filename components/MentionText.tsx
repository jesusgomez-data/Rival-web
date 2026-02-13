import Link from "next/link";
import { clsx } from "clsx";

interface MentionTextProps {
    text: string;
    className?: string;
    mentionClassName?: string;
}

/**
 * Renders text with clickable @mentions
 */
export default function MentionText({ text, className, mentionClassName }: MentionTextProps) {
    if (!text) return null;

    // Improved regex to avoid capturing trailing punctuation like . , ! ?
    // Matches @ followed by word chars, dashes or dots, but dots/dashes must be followed by word chars
    const mentionRegex = /((?:^|\s)@[\w-]+(?:[.-][\w-]+)*)/g;

    return (
        <span className={className}>
            {text.split(mentionRegex).map((part, i) => {
                if (part && part.trim().startsWith('@')) {
                    const mention = part.trim();
                    const space = part.startsWith(' ') ? ' ' : '';

                    // Slugify for URL safety, but keep display text as is
                    const username = mention.slice(1).toLowerCase();

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
                                {mention}
                            </Link>
                        </span>
                    );
                }
                return part;
            })}
        </span>
    );
}
