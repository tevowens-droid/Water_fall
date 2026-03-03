import type { Metadata, Viewport } from 'next';
import { AppProvider } from '@/context/AppContext';
import Nav from '@/components/Nav';
import PasswordGate from '@/components/PasswordGate';
import './globals.css';

export const metadata: Metadata = {
  title: 'Waterfall Budget',
  description: 'Paycheck-to-budget waterfall allocation tool',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <PasswordGate>
            <Nav />
            {children}
          </PasswordGate>
        </AppProvider>
      </body>
    </html>
  );
}
