"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { BookOpen, Calendar, CalendarDays, Clock3, History, LayoutDashboard, UsersRound } from "lucide-react";

const groups = [
  { title: "İCMAL", links: [
    { href: "/", label: "İdarə paneli", icon: LayoutDashboard },
    { href: "/real-oyunlar", label: "Real oyunlar", icon: CalendarDays },
    { href: "/oyunlar/bu-gun", label: "Bu günün oyunları", icon: Calendar },
    { href: "/oyunlar/sabah", label: "Sabahın oyunları", icon: Clock3 },
    { href: "/oyunlar/gelecek", label: "Qarşıdakı oyunlar", icon: CalendarDays },
  ] },
  { title: "ANALİTİKA", links: [
    { href: "/real-komandalar", label: "Komandalar", icon: UsersRound },
    { href: "/tarixce", label: "Proqnoz tarixçəsi", icon: History },
    { href: "/metodologiya", label: "Metodologiya", icon: BookOpen },
  ] },
];

const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function Navigation() {
  const pathname = usePathname();
  const hydrated = useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot);
  return <aside className="sidebar">
    <Link href="/" className="brand" aria-label="MatchIQ AZ ana səhifə">
      <span className="brand-clip"><Image src="/matchiq-az-logo.webp" alt="" width={940} height={513} unoptimized preload /></span>
    </Link>
    <nav aria-label="Əsas naviqasiya">
      {groups.map((group) => <div key={group.title} className="nav-group">
        <p>{group.title}</p>
        {group.links.map(({ href, label, icon: Icon }) => {
          const active = hydrated && (pathname === href || (href !== "/" && pathname.startsWith(href + "/")));
          return <Link key={href} href={href} aria-current={active ? "page" : undefined} className="nav-link">
            <Icon size={17} aria-hidden="true" />{label}
          </Link>;
        })}
      </div>)}
    </nav>
  </aside>;
}
