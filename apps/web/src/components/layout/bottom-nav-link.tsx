"use client";

import { Home, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS = { home: Home, search: Search };

export function BottomNavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  const Icon = ICONS[icon];

  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
        active ? "text-neutral-900" : "text-neutral-400"
      }`}
    >
      <Icon className="size-5" strokeWidth={active ? 2 : 1.75} />
      {label}
    </Link>
  );
}
