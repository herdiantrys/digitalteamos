'use client';

import * as Icons from 'lucide-react';

/**
 * Renders a database icon.
 * - If `icon` is null/undefined → shows fallback
 * - If `icon` looks like an emoji or 1-2 chars → renders as text/emoji
 * - Otherwise → treats as a Lucide icon name (PascalCase) and renders via lucide-react
 */
export default function DatabaseIcon({
    icon,
    color,
    size = 18,
    fallback = '📄',
}: {
    icon?: string | null;
    color?: string | null;
    size?: number;
    fallback?: string;
}) {
    if (!icon) {
        return <span style={{ fontSize: size }}>{fallback}</span>;
    }

    // Detect emoji: emoji code points are > U+00FF, or short (1-2 visible chars)
    const isEmoji = /\p{Emoji}/u.test(icon) || [...icon].length <= 2;

    if (isEmoji) {
        return <span style={{ fontSize: size, lineHeight: 1 }}>{icon}</span>;
    }

    // Try to resolve as a Lucide icon (PascalCase name)
    // e.g. "Folder", "Database", "BarChart2"
    const IconComponent = (Icons as any)[icon];
    if (IconComponent) {
        return <IconComponent size={size} color={color || 'currentColor'} strokeWidth={1.8} />;
    }

    // Fallback: show as text then the default emoji
    return <span style={{ fontSize: size }}>{fallback}</span>;
}
