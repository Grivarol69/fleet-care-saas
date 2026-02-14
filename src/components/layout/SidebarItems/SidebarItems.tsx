'use client';

import Link from 'next/link';
import { SidebarItemsProps } from './SidebarItems.types';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown } from 'lucide-react';

import { usePathname } from 'next/navigation';
import { useState } from 'react';

export function SidebarItems(props: SidebarItemsProps) {
  const { item } = props;
  const { label, icon: Icon, href, subItems } = item;
  const [isOpen, setIsOpen] = useState(false);

  const pathname = usePathname();
  const isActive =
    pathname === href ||
    (subItems && subItems.some(subItem => pathname === subItem.href));

  const toggleSubMenu = () => {
    if (subItems) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div>
      <div
        onClick={toggleSubMenu}
        className={cn(
          `flex gap-x-2 mt-2 text-slate-700 text-sm items-center hover:bg-slate-300/20 p-2 rounded-lg cursor-pointer`,
          isActive && 'bg-slate-400/20'
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={1} />
        {label}
        {subItems && (
          <span className="ml-auto">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-slate-700" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-700" />
            )}
          </span>
        )}
      </div>
      {subItems && isOpen && (
        <div className="ml-6 mt-2">
          {subItems.map(subItem => (
            <Link
              key={subItem.label}
              href={subItem.href}
              className={cn(
                `block py-2 px-4 text-sm text-slate-600 hover:bg-slate-300/20 rounded-lg`,
                pathname === subItem.href && 'bg-slate-400/20'
              )}
            >
              {subItem.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
