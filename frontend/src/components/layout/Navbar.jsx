import React from 'react';
import { NavLink } from 'react-router-dom';

/**
 * Navigation Links definition
 */
const NAV_ITEMS = [
  { name: 'Home', path: '/' },
  { name: 'Menu', path: '/menu' },
  { name: 'Orders', path: '/orders' },
  { name: 'About', path: '/about' },
  { name: 'Gallery', path: '/gallery' },
  { name: 'Reviews', path: '/reviews' },
  { name: 'Contact', path: '/contact' },
];

/**
 * Navbar Component (Desktop)
 * Renders center navigation links with active state highlighting.
 */
export default function Navbar() {
  return (
    <nav className="hidden lg:flex items-center space-x-0.5 xl:space-x-1 2xl:space-x-1 flex-shrink-0" aria-label="Main Navigation">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `px-2.5 xl:px-3 2xl:px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-accent ${
              isActive
                ? 'text-primary font-bold bg-secondary-dark/70 shadow-2xs border-b-2 border-accent'
                : 'text-muted hover:text-primary hover:bg-muted-bg/60'
            }`
          }
          end={item.path === '/'}
        >
          {item.name}
        </NavLink>
      ))}
    </nav>
  );
}
