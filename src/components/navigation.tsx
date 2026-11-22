"use client";

import { usePreferences } from "@/components/preferences-context";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import type { MouseEvent } from "react";
import { BookOpen, Calendar, CalendarDays, Gamepad2, History, LayoutDashboard, Menu, Trophy, UsersRound } from "lucide-react";

const groups = [
  { title: "overview", links: [
    { href: "/", label: "dashboard", icon: LayoutDashboard },
    { href: "/real-oyunlar", label: "realFixtures", icon: CalendarDays },
    { href: "/oyunlar", label: "fixtureSchedule", icon: Calendar },
    { href: "/futbolcu-karyerasi", label: "careerGame", icon: Gamepad2 },
  ] },
  { title: "analytics", links: [
    { href: "/real-komandalar", label: "teams", icon: UsersRound },
    { href: "/movsum-proqnozu", label: "seasonForecast", icon: Trophy },
    { href: "/tarixce", label: "forecastHistory", icon: History },
    { href: "/metodologiya", label: "methodology", icon: BookOpen },
  ] },
] as const;

const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

function closeMobileMenu(event: MouseEvent<HTMLAnchorElement>) {
  const menu = event.currentTarget.closest("details");
  if (menu) menu.open = false;
}

export function Navigation() {
  const { t } = usePreferences();
  const pathname = usePathname();
  const hydrated = useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot);
  const menuLabel = t.mainNavigation;
  const links = (onNavigate?: typeof closeMobileMenu) => groups.map((group) => <div key={group.title} className="nav-group">
    {group.links.map(({ href, label, icon: Icon }) => {
      const active = hydrated && (pathname === href || (href !== "/" && pathname.startsWith(href + "/")));
      return <Link prefetch={false} key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className="nav-link">
        <Icon size={18} aria-hidden="true" />{t[label]}
      </Link>;
    })}
  </div>);
  return <aside className="sidebar">
    <Link href="/" className="brand" aria-label={t.matchiqAzHome}>
      <span className="brand-clip"><Image src="/matchiq-az-logo.webp" alt="" width={940} height={513} unoptimized preload /></span>
    </Link>
    <nav className="desktop-nav" aria-label={menuLabel}>{links()}</nav>
    <details className="mobile-nav">
      <summary aria-label={menuLabel}><Menu size={21} aria-hidden="true" /></summary>
      <nav aria-label={menuLabel}>{links(closeMobileMenu)}</nav>
    </details>
  </aside>;
}
