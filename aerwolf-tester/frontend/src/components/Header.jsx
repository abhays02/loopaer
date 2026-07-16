import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";
import { LogOut, User as UserIcon, BookOpen, Sun, Moon } from "lucide-react";

export default function Header() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <header data-testid="auth-header-nav" className="w-full sticky top-0 z-50 pt-4 flex justify-center px-4">
      <div className="pill w-full max-w-6xl h-14 px-4 sm:px-6 flex items-center justify-between">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2.5" data-testid="header-logo">
          <div className="w-7 h-7 rounded-[8px] bg-[color:var(--brand)] flex items-center justify-center">
            <span className="text-black font-bold text-[10px] tracking-tight">AER</span>
          </div>
          <span className="font-display text-[15px] font-bold tracking-tight">AERwolf</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            data-testid="theme-toggle-btn"
            onClick={toggle}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="p-1.5 rounded-[8px] text-white/60 hover:text-[color:var(--brand)] transition-colors"
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          {user ? (
            <>
              <Link to="/dashboard" data-testid="nav-dashboard-link" className="hidden sm:inline-block text-[13px] font-medium text-white/70 hover:text-white px-3 py-1.5 rounded-[8px] hover:bg-[color:var(--surface-200)] transition-colors">Dashboard</Link>
              <Link to="/notebook/new" data-testid="nav-notebook-link" className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-medium text-white/70 hover:text-white px-3 py-1.5 rounded-[8px] hover:bg-[color:var(--surface-200)] transition-colors">
                <BookOpen size={12} /> Notebook
              </Link>
              <Link to="/library" data-testid="nav-library-link" className="hidden sm:inline-block text-[13px] font-medium text-white/70 hover:text-white px-3 py-1.5 rounded-[8px] hover:bg-[color:var(--surface-200)] transition-colors">Library</Link>
              <Link to="/explore" data-testid="nav-explore-link" className="hidden md:inline-block text-[13px] font-medium text-white/70 hover:text-white px-3 py-1.5 rounded-[8px] hover:bg-[color:var(--surface-200)] transition-colors">Explore</Link>
              <Link to="/settings" data-testid="nav-settings-link" className="hidden md:inline-block text-[13px] font-medium text-white/70 hover:text-white px-3 py-1.5 rounded-[8px] hover:bg-[color:var(--surface-200)] transition-colors">Settings</Link>
              <div className="flex items-center gap-2 ml-1 sm:ml-2 pl-2 sm:pl-3 border-l border-[color:var(--border-strong)]">
                {user.picture ? (
                  <img src={user.picture} alt="" className="w-7 h-7 rounded-full border border-[color:var(--border-strong)]" data-testid="header-user-avatar" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[color:var(--surface-200)] flex items-center justify-center"><UserIcon size={13} className="text-white/70" /></div>
                )}
                <button data-testid="header-logout-btn" onClick={logout} title="Logout" className="p-1.5 rounded-[8px] text-white/60 hover:text-[color:var(--brand)] transition-colors">
                  <LogOut size={13} />
                </button>
              </div>
            </>
          ) : (
            <button data-testid="header-login-btn" onClick={handleLogin} className="btn-primary">Sign in</button>
          )}
        </nav>
      </div>
    </header>
  );
}
