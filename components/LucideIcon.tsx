import * as Icons from 'lucide-react';
import { LucideProps } from 'lucide-react';

interface LucideIconProps extends LucideProps {
    name: string;
}

export default function LucideIcon({ name, ...props }: LucideIconProps) {
    const IconComponent = (Icons as any)[name];

    if (!IconComponent) {
        // Fallback icon if name is invalid or it's an old emoji
        return <Icons.Database {...props} />;
    }

    return <IconComponent {...props} />;
}
