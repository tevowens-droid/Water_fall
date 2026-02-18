'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/budget',    label: 'This Week' },
  { href: '/next-week', label: 'Next Week' },
  { href: '/history',   label: 'History' },
  { href: '/settings',  label: '⚙️ Settings' },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav>
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
  );
}
