import { redirect } from 'next/navigation'

// Creator dashboard home → send to discovery
export default function CreatorDashboardPage() {
  redirect('/dashboard/creator/discover')
}
