"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useCart } from "./CartProvider";

const adminLinks = [
  { label: "Dashboard", href: "/admin" },
  { label: "Books", href: "/admin/books" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Audit Logs", href: "/admin/audit-logs" },
  { label: "IP Access", href: "/admin/ip-access" },
  { label: "Sessions", href: "/admin/sessions" },
];

const navLeft = ["Books", "Writers"];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { data: session } = useSession();
  const { count, bumpKey } = useCart();
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith("/admin");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#0B0B0C]/90 backdrop-blur-2xl border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-[1400px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        {/* Left nav - show admin links or user links based on current page */}
        <div className="hidden md:flex items-center gap-8">
          {isAdminPage
            ? adminLinks.map((link) => {
                const isActive = pathname === link.href ||
                  (link.href !== "/admin" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative text-sm transition-colors duration-300 group ${
                      isActive ? "text-white" : "text-text-secondary hover:text-white"
                    }`}
                  >
                    {link.label}
                    {isActive && (
                      <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-white" />
                    )}
                    {!isActive && (
                      <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white group-hover:w-full transition-all duration-300" />
                    )}
                  </Link>
                );
              })
            : navLeft.map((item) => {
                const href = item === "Books" ? "/books" : "#";
                return (
                  <Link
                    key={item}
                    href={href}
                    className="relative text-sm text-text-secondary hover:text-white transition-colors duration-300 group"
                  >
                    {item}
                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white group-hover:w-full transition-all duration-300" />
                  </Link>
                );
              })}
        </div>

        {/* Center logo */}
        <Link href={isAdminPage ? "/admin" : "/"} className="flex items-center gap-2 ml-40">
          <div className="grid grid-cols-2 gap-[3px]">
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
          </div>
        </Link>

        {/* Right nav */}
        <div className="flex items-center gap-6">
          {isAdminPage ? (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="relative hidden md:block text-sm text-text-secondary hover:text-white transition-colors duration-300 group"
            >
              Logout
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white group-hover:w-full transition-all duration-300" />
            </button>
          ) : (
            <>
              {session?.user ? (
                <>
                  <Link
                    href="/wishlist"
                    className="relative hidden md:block text-sm text-text-secondary hover:text-white transition-colors duration-300 group"
                  >
                    Wishlist
                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white group-hover:w-full transition-all duration-300" />
                  </Link>
                  <Link
                    href="/addresses"
                    className="relative hidden md:block text-sm text-text-secondary hover:text-white transition-colors duration-300 group"
                  >
                    Addresses
                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white group-hover:w-full transition-all duration-300" />
                  </Link>
                  <Link
                    href="/orders"
                    className="relative hidden md:block text-sm text-text-secondary hover:text-white transition-colors duration-300 group"
                  >
                    Orders
                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white group-hover:w-full transition-all duration-300" />
                  </Link>
                  <Link
                    href="/profile"
                    className="relative hidden md:block text-sm text-text-secondary hover:text-white transition-colors duration-300 group"
                  >
                    Profile
                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white group-hover:w-full transition-all duration-300" />
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="relative hidden md:block text-sm text-text-secondary hover:text-white transition-colors duration-300 group"
                  >
                    Logout
                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white group-hover:w-full transition-all duration-300" />
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="relative hidden md:block text-sm text-text-secondary hover:text-white transition-colors duration-300 group"
                  >
                    Login
                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white group-hover:w-full transition-all duration-300" />
                  </Link>
                  <Link
                    href="/signup"
                    className="relative hidden md:block text-sm text-text-secondary hover:text-white transition-colors duration-300 group"
                  >
                    Register
                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white group-hover:w-full transition-all duration-300" />
                  </Link>
                </>
              )}
              <Link
                href="/cart"
                className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-white transition-colors duration-300"
              >
                <span>Cart</span>
                <motion.span
                  key={bumpKey}
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.22, 1] }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="inline-flex min-w-6 h-6 px-2 items-center justify-center rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-white"
                >
                  {count}
                </motion.span>
              </Link>
            </>
          )}
        </div>
      </nav>
    </motion.header>
  );
}
