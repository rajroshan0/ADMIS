import { redirect } from 'next/navigation'

// Auth is now on the landing page — /login redirects to /
export default function LoginPage() {
  redirect('/')
}
