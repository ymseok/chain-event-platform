import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/lib/providers';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Chain Event Platform - Admin',
  description: 'Blockchain Event Aggregation & Dispatch Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'hsl(225 25% 10%)',
              border: '1px solid hsl(225 20% 18%)',
              color: 'hsl(210 20% 92%)',
            },
          }}
        />
      </body>
    </html>
  );
}
