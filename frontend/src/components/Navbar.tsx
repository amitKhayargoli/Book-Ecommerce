"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useCart } from "./CartProvider";

const navLeft = ["Books", "Writers"];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { data: session } = useSession();
  const { count, bumpKey } = useCart();

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
          ? "bg-[#0B0B0C]/80 backdrop-blur-2xl border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-[1400px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        {/* Left nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLeft.map((item) => (
            <Link
              key={item}
              href="#"
              className="relative text-sm text-text-secondary hover:text-white transition-colors duration-300 group"
            >
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white group-hover:w-full transition-all duration-300" />
            </Link>
          ))}
        </div>

        {/* Center logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="grid grid-cols-2 gap-[3px]">
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
          </div>
        </Link>

        {/* Right nav */}
        <div className="flex items-center gap-6">
          {session?.user ? (
            <>
              <Link
                href="/wishlist"
                className="relative hidden md:block text-sm text-text-secondary hover:text-white transition-colors duration-300 group"
              >
                Wishlist
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

        </div>
      </nav>
    </motion.header>
  );
}
