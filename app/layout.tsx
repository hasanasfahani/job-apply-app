import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JobApply AI',
  description: 'AI-powered job application assistant',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ colorScheme: 'light' }}>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f5f5f5', color: '#111111', WebkitTextFillColor: '#111111' }}>
        {children}
      </body>
    </html>
  )
}
