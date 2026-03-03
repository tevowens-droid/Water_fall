'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/budget',    label: 'This Week',  icon: '💰' },
  { href: '/next-week', label: 'Next Week',  icon: '📅' },
  { href: '/history',   label: 'History',    icon: '📊' },
  { href: '/settings',  label: 'Settings',   icon: '⚙️' },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <>
      {/* Desktop / top nav */}
      <nav className="top-nav">
        <div className="nav-brand">💧 <span>Waterfall</span></div>
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={'nav-btn' + (pathname === l.href ? ' active' : '')}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="bot-nav">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={'bot-btn' + (pathname === l.href ? ' active' : '')}
          >
            <span className="bot-icon">{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
