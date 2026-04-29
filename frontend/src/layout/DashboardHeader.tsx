import ThemeToggleButton from "@/components/ThemeToggleButton";
import { SidebarTrigger } from "./Sidebar";
import { Link } from "react-router-dom";
import { Send, Shield, WalletIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const DashboardHeader = () => {
    const { user } = useAuth();
    return (
        <div>
            <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur transition-colors">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-2">
                        <ThemeToggleButton />
                        <SidebarTrigger />
                        <div className="hidden text-sm text-[var(--color-text-muted)] md:block">
                            Good to see you, {user?.username || "Guest"} 👋
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link to="/dashboard/transfers/new" className="btn-secondary hidden md:inline-flex rounded-2xl">
                            <Send className="mr-2 h-4 w-4" />
                            Transfer
                        </Link>
                        <Link to="/dashboard/savings/new" className="btn-secondary hidden md:inline-flex rounded-2xl">
                            <Shield className="mr-2 h-4 w-4" />
                            New Goal
                        </Link>
                        <Link to="/dashboard/fund" className="btn-secondary hidden md:inline-flex rounded-2xl">
                            <WalletIcon className="mr-2 h-4 w-4" />
                            Fund Wallet
                        </Link>
                    </div>
                </div>
            </header>
        </div>
    );
};

export default DashboardHeader;
