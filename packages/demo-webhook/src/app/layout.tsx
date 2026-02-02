import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Demo Webhook Receiver',
  description: 'Real-time webhook event viewer for Chain Event Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
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
