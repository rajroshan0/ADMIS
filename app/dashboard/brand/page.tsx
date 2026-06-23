import { redirect } from 'next/navigation'

// Brand dashboard home → send to discovery
export default function BrandDashboardPage() {
  redirect('/dashboard/brand/discover')
}
