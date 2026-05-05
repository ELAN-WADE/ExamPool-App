"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import styles from "./Sidebar.module.css";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

type Props = {
  items: NavItem[];
  title: string;
  accentColor?: string;
};

export function Sidebar({ items, title, accentColor = "#4f7cff" }: Props) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const normalizedPathname = pathname.replace(/\/+$/, "") || "/";

  return (
    <aside className={styles.sidebar}>
      {/* Logo / brand */}
      <div className={styles.brand}>
        <div className={styles.brandIcon} style={{ background: accentColor }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <span className={styles.brandName}>ExamPool</span>
          <span className={styles.brandRole}>{title}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {items.map((item) => {
          const active = normalizedPathname === item.href.replace(/\/+$/, "") || normalizedPathname.startsWith(item.href.replace(/\/+$/, "") + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${active ? styles.active : ""}`}
              style={active ? { "--accent": accentColor } as React.CSSProperties : undefined}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
              {active && <span className={styles.activeDot} />}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className={styles.footer}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>{user?.name?.charAt(0)?.toUpperCase() ?? "?"}</div>
          <div className={styles.userMeta}>
            <span className={styles.userName}>{user?.name ?? "—"}</span>
            <span className={styles.userEmail}>{user?.email ?? ""}</span>
          </div>
        </div>
        <button
          className={styles.logoutBtn}
          onClick={async () => {
            await logout();
            window.location.href = "/";
          }}
          title="Logout"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
