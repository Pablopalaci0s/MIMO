"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/regalos", label: "Regalos" },
  { href: "/ayuda", label: "Ayuda" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-8 text-sm font-medium sm:flex">
      {NAV_LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`group relative py-1 transition-colors duration-200 ${
              active ? "text-neutral-900" : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            {link.label}
            <span
              className={`absolute inset-x-0 -bottom-0.5 h-px bg-brand transition-transform duration-200 ease-out ${
                active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}
