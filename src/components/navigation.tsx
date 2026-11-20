"use client";

import { usePreferences } from "@/components/preferences-context";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { BookOpen, Calendar, CalendarDays, Clock3, History, LayoutDashboard, UsersRound } from "lucide-react";

const groups = [
  { title: "overview", links: [
    { href: "/", label: "dashboard", icon: LayoutDashboard },
    { href: "/real-oyunlar", label: "realFixtures", icon: CalendarDays },
    { href: "/oyunlar/bu-gun", label: "todaySMatches", icon: Calendar },
    { href: "/oyunlar/sabah", label: "tomorrowSMatches", icon: Clock3 },
    { href: "/oyunlar/gelecek", label: "upcomingMatches", icon: CalendarDays },
  ] },
  { title: "analytics", links: [
    { href: "/real-komandalar", label: "teams", icon: UsersRound },
    { href: "/tarixce", label: "forecastHistory", icon: History },
    { href: "/metodologiya", label: "methodology", icon: BookOpen },
  ] },
] as const;

const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function Navigation() {
  const { t } = usePreferences();
  const pathname = usePathname();
  const hydrated = useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot);
  return <aside className="sidebar">
    <Link href="/" className="brand" aria-label={t.matchiqAzHome}>
      <span className="brand-clip"><Image src="/matchiq-az-logo.webp" alt="" width={940} height={513} unoptimized preload /></span>
    </Link>
    <nav aria-label={t.mainNavigation}>
      {groups.map((group) => <div key={group.title} className="nav-group">
        <p>{t[group.title]}</p>
        {group.links.map(({ href, label, icon: Icon }) => {
          const active = hydrated && (pathname === href || (href !== "/" && pathname.startsWith(href + "/")));
          return <Link key={href} href={href} aria-current={active ? "page" : undefined} className="nav-link">
            <Icon size={17} aria-hidden="true" />{t[label]}
          </Link>;
        })}
      </div>)}
    </nav>
  </aside>;
}
