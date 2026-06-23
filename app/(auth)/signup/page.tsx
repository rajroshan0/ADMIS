import { redirect } from 'next/navigation'

// Auth is now on the landing page — /signup redirects to /
export default function SignupPage() {
  redirect('/')
}
