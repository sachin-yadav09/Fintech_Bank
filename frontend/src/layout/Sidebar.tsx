// frontend\src\layout\Sidebar.tsx
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  X,
  Menu,
  LayoutDashboard,
  PiggyBank,
  Users,
  Bell,
  Settings,
  CreditCard,
  ArrowRightLeft,
  Receipt,
  Landmark,
  Wallet,
} from "lucide-react";
import { getOverview } from "@/libs/core";

export type NavItem = { label: string; to: string; icon: React.ReactNode };

const nav: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: "Transactions", to: "/dashboard/transactions", icon: <Receipt className="h-5 w-5" /> },
  { label: "Transfers", to: "/dashboard/transfers", icon: <ArrowRightLeft className="h-5 w-5" /> },
  { label: "Savings", to: "/dashboard/savings", icon: <PiggyBank className="h-5 w-5" /> },
  { label: "Loans", to: "/dashboard/loans", icon: <CreditCard className="h-5 w-5" /> },
  { label: "Beneficiaries", to: "/dashboard/beneficiaries", icon: <Users className="h-5 w-5" /> },
  { label: "Bank", to: "/dashboard/bank", icon: <Landmark className="h-5 w-5" /> },
  { label: "Notifications", to: "/dashboard/notifications", icon: <Bell className="h-5 w-5" /> },
  { label: "Settings", to: "/dashboard/profile", icon: <Settings className="h-5 w-5" /> },
];

const OPEN_EVT = "sidebar:open";
const CLOSE_EVT = "sidebar:close";
const TOGGLE_EVT = "sidebar:toggle";

export const dispatchSidebarEvent = (name: string) =>
  document.dispatchEvent(new CustomEvent(name));

export function SidebarTrigger({
  variant = "toggle",
  className = "",
  children,
}: {
  variant?: "open" | "toggle";
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={() =>
        dispatchSidebarEvent(variant === "open" ? OPEN_EVT : TOGGLE_EVT)
      }
      className={
        className ||
        "inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-text-muted)] shadow-sm border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] md:hidden transition-colors"
      }
    >
      {children ?? <Menu className="h-5 w-5" />}
    </button>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <nav className="mt-2 px-3 space-y-1">
      {nav.map(({ label, icon, to }) => {
        // FIX: Dashboard root must use exact match only — every other route
        // starts with "/dashboard/" so startsWith would always highlight it.
        const isActive =
          to === "/dashboard"
            ? location.pathname === to
            : location.pathname === to ||
              location.pathname.startsWith(to + "/");

        return (
          <Link
            key={label}
            to={to}
            onClick={onNavigate}
            className={`sidebar-link ${isActive ? "active" : ""}`}
          >
            <span className={isActive ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"}>
              {icon}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ walletId }: { walletId: string }) {
  return (
    <div className="mt-auto p-4">
      <div className="rounded-xl bg-[var(--color-primary)] p-4 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="h-4 w-4 text-white/80" />
          <p className="text-xs font-medium text-white/80">Wallet ID</p>
        </div>
        <p className="font-mono text-sm truncate">
          {walletId || "Loading..."}
        </p>
      </div>
    </div>
  );
}

// FIX: Single hook — called once at the layout level and passed down as a
// prop to both DesktopSidebar and MobileSidebar, preventing two API calls.
function useWalletId(): string {
  const [walletId, setWalletId] = useState("");
  useEffect(() => {
    getOverview()
      .then(({ data }) => setWalletId(data?.wallet?.wallet_id ?? ""))
      .catch(() => setWalletId(""));
  }, []);
  return walletId;
}

// FIX: Shared wrapper that fetches walletId ONCE and passes it to both sidebars.
export function Sidebars() {
  const walletId = useWalletId();
  return (
    <>
      <DesktopSidebar walletId={walletId} />
      <MobileSidebar walletId={walletId} />
    </>
  );
}

export function DesktopSidebar({ walletId }: { walletId: string }) {
  return (
    <aside className="relative hidden w-64 flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)] md:flex transition-colors">
      <div className="flex h-full flex-col">
        <Link to="/" className="flex h-16 items-center gap-3 px-5 border-b border-[var(--color-border)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold text-[var(--color-text-main)] tracking-tight">
            FinanceOS
          </span>
        </Link>
        <div className="flex-1 overflow-y-auto no-scrollbar py-2">
          <SidebarNav />
        </div>
        <SidebarFooter walletId={walletId} />
      </div>
    </aside>
  );
}

export function MobileSidebar({ walletId }: { walletId: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openH = () => setOpen(true);
    const closeH = () => setOpen(false);
    const toggleH = () => setOpen((v) => !v);
    document.addEventListener(OPEN_EVT, openH);
    document.addEventListener(CLOSE_EVT, closeH);
    document.addEventListener(TOGGLE_EVT, toggleH);
    return () => {
      document.removeEventListener(OPEN_EVT, openH);
      document.removeEventListener(CLOSE_EVT, closeH);
      document.removeEventListener(TOGGLE_EVT, toggleH);
    };
  }, []);

  const close = () => setOpen(false);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={close}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-[var(--color-surface)] shadow-xl transition-transform duration-300 md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5 border-b border-[var(--color-border)]">
          <Link to="/" className="flex items-center gap-3" onClick={close}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-[var(--color-text-main)]">FinanceOS</span>
          </Link>
          <button
            onClick={close}
            className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="py-2">
          <SidebarNav onNavigate={close} />
        </div>
        <SidebarFooter walletId={walletId} />
      </aside>
    </>
  );
}