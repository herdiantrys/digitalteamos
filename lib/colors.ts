export const COLOR_PALETTE = [
    { name: 'Default', bg: '#f0f0f0', text: '#555' },
    { name: 'Gray', bg: '#e3e3e3', text: '#444' },
    { name: 'Red', bg: '#ffe0e0', text: '#c0392b' },
    { name: 'Orange', bg: '#ffecd6', text: '#c0610a' },
    { name: 'Yellow', bg: '#fff8d6', text: '#9a7d0a' },
    { name: 'Green', bg: '#d6ffe0', text: '#1e7e3e' },
    { name: 'Teal', bg: '#d6f5f0', text: '#0e7877' },
    { name: 'Blue', bg: '#d6eaff', text: '#1558b0' },
    { name: 'Purple', bg: '#ecdcff', text: '#5a189a' },
    { name: 'Pink', bg: '#ffe0f0', text: '#9b2761' },
    { name: 'Brown', bg: '#ecdccc', text: '#6e4f1c' },
];

export function getBadgeColorObj(str: string, colorConfig: Record<string, string> = {}) {
    const colorName = colorConfig[str];
    if (colorName) {
        if (colorName.startsWith('custom:')) {
            const parts = colorName.split(':');
            if (parts.length === 3) {
                return {
                    name: 'Custom',
                    bg: parts[1],
                    text: parts[2]
                };
            }
        }

        const found = COLOR_PALETTE.find(c => c.name === colorName);
        if (found) return found;
    }

    // Hash-based fallback
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    // Return a default combination based on the hue that matches the style
    return {
        name: 'Auto',
        bg: `hsl(${hue}, 80%, 94%)`,
        text: `hsl(${hue}, 70%, 35%)`
    };
}
