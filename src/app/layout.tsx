// /app/layout.tsx

import './globals.css'

export const metadata = {
  icons: {
    icon: '/gary4live_logo.png'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
