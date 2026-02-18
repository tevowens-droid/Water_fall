import type { Metadata } from 'next';
import { AppProvider } from '@/context/AppContext';
import Nav from '@/components/Nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Waterfall Budget',
  description: 'Paycheck-to-budget waterfall allocation tool',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <Nav />
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
