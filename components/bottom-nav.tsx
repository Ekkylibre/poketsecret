"use client";

import { Bell, Map, Store, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Carte", icon: Map },
  { href: "/magasins", label: "Magasins", icon: Store },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profil", label: "Profil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const activeIndex = tabs.findIndex(({ href }) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)
  );

  return (
    <nav className="bg-background sticky bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-10 relative mx-8 flex rounded-2xl border px-3 py-2 shadow-[0_4px_16px_rgb(0_0_0_/_0.35)]">
      {activeIndex !== -1 && (
        <div
          className="pointer-events-none absolute inset-y-2 left-3 z-0 flex transition-transform duration-300 ease-out"
          style={{
            width: `calc((100% - 1.5rem) / ${tabs.length})`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        >
          <span className="bg-accent m-auto size-10 rounded-full" />
        </div>
      )}
      {tabs.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={`relative z-10 flex flex-1 items-center justify-center py-1 transition-colors ${
              isActive ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <span className="flex size-10 items-center justify-center">
              <Icon className="size-5" strokeWidth={isActive ? 2.5 : 2} />
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
