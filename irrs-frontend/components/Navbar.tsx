"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getUserFromCookie, clearAuthCookie, clearUserCookie } from "@/lib/api";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUserFromCookie();

  function handleLogout() {
    clearAuthCookie();
    clearUserCookie();
    router.push("/login");
  }

  function navLink(href: string, label: string) {
    const isActive = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        className={`text-sm font-semibold px-3 py-1 transition ${
          isActive
            ? "text-gray-900 border-l-2 border-red-600 pl-2"
            : "text-gray-500 hover:text-gray-900"
        }`}
      >
        {label}
      </Link>
    );
  }

  return (
    <nav className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-6">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4">
        <span className="text-red-600 font-semibold text-lg tracking-tight">
          DHL
        </span>
        <span className="text-gray-400 text-xs font-semibold">IRRS</span>
      </div>

      {/* Nav links */}
      <div className="flex items-center gap-2">
        {navLink("/dashboard", "Dashboard")}
        {navLink("/incidents", "Incidents")}
        {navLink("/upload", "Upload")}
        {user?.role === "admin" && navLink("/logs", "Logs")}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User + logout */}
      <div className="flex items-center gap-3">
        {user && (
          <span className="text-xs text-gray-500 font-semibold">
            {user.username}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="text-xs font-semibold text-gray-500 hover:text-red-600 border border-gray-200 px-3 py-1 rounded-lg transition"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
