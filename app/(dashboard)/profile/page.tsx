import { requireAuth } from '../../../lib/auth';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
    const user = await requireAuth();

    return <ProfileClient user={user} />;
}
