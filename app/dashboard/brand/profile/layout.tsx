import type { ReactNode } from 'react'

export default function BrandProfileLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Tabler Icons webfont — used by brand dashboard */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.x/dist/tabler-icons.min.css"
        crossOrigin="anonymous"
      />
      {children}
    </>
  )
}
