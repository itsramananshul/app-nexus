"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Cpu,
  GitBranch,
  LayoutGrid,
  ScrollText,
  Settings as SettingsIcon,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";

const NEXUS_NAV = [
  { href: "/", label: "Mesh", icon: LayoutGrid },
];

const TOOLKIT_NAV = [
  { href: "/controllers",  label: "Controllers",  icon: Cpu },
  { href: "/router",       label: "Router",       icon: GitBranch },
  { href: "/applications", label: "Applications", icon: Workflow },
  { href: "/capabilities", label: "Capabilities", icon: Zap },
  { href: "/logs",         label: "Logs",         icon: ScrollText },
  { href: "/settings",     label: "Settings",     icon: SettingsIcon },
];

const SIDEBAR_WIDTH = 200;

export function Sidebar() {
  const path = usePathname() ?? "/";

  return (
    <aside
      style={{
        width: SIDEBAR_WIDTH,
        minHeight: "100dvh",
        background: "#000000",
        borderRight: "1px solid #1a1a1a",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
      }}
    >
      <div style={{ padding: "16px 18px 14px", borderBottom: "1px solid #1a1a1a" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", letterSpacing: "0.15em" }}>
          NEXUS
        </div>
        <div style={{ fontSize: 10, color: "#555", marginTop: 2, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          OpenPrem · OII
        </div>
      </div>

      <nav style={{ padding: "10px 8px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        <SectionLabel>Dashboard</SectionLabel>
        {NEXUS_NAV.map((item) => (
          <NavItem key={item.href} item={item} active={isActive(path, item.href)} />
        ))}

        <div style={{ height: 1, background: "#1a1a1a", margin: "12px 6px" }} />

        <SectionLabel>Toolkit</SectionLabel>
        {TOOLKIT_NAV.map((item) => (
          <NavItem key={item.href} item={item} active={isActive(path, item.href)} />
        ))}
      </nav>

      <div style={{ padding: "10px 18px", borderTop: "1px solid #1a1a1a", fontSize: 10, color: "#444" }}>
        OII Model v2
      </div>
    </aside>
  );
}

function isActive(path: string, href: string): boolean {
  if (href === "/") return path === "/";
  return path.startsWith(href);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: "#444",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: "6px 10px 4px",
      }}
    >
      {children}
    </div>
  );
}

function NavItem({
  item,
  active,
}: {
  item: { href: string; label: string; icon: LucideIcon };
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 5,
        color: active ? "#ffffff" : "#888",
        background: active ? "#111111" : "transparent",
        fontWeight: active ? 600 : 400,
        fontSize: 13,
        textDecoration: "none",
        border: active ? "1px solid #2a2a2a" : "1px solid transparent",
        transition: "all 0.12s",
      }}
    >
      <Icon size={14} color={active ? "#ffffff" : "#666"} />
      {item.label}
    </Link>
  );
}

export const SIDEBAR_WIDTH_PX = SIDEBAR_WIDTH;
