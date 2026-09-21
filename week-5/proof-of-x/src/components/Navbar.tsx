"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCcc, useSigner } from "@ckb-ccc/connector-react";
import { ShieldCheck, PlusCircle, Search, Wallet, ExternalLink, KeyRound } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { open, wallet } = useCcc();
  const signer = useSigner();
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (signer) {
      signer.getRecommendedAddress().then((addr) => {
        if (mounted) setAddress(addr);
      }).catch(() => {
        if (mounted) setAddress(null);
      });
    } else {
      setAddress(null);
    }
    return () => {
      mounted = false;
    };
  }, [signer]);

  const navLinks = [
    { href: "/", label: "Overview", icon: ShieldCheck },
    { href: "/issue", label: "Issue Attestation", icon: PlusCircle },
    { href: "/verify", label: "Verify Proof", icon: Search },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#090d16]/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00CC9B] to-emerald-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight flex items-center gap-2">
                <span>Proof of X</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-[#00CC9B] border border-emerald-500/20">
                  CKB Native
                </span>
              </div>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-slate-800 text-[#00CC9B]"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Network Badge & Wallet Button */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#00CC9B] animate-pulse"></span>
            <span>CKB Testnet (Pudge)</span>
          </div>

          <button
            onClick={() => open()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 hover:border-emerald-500/40 shadow-sm"
          >
            <Wallet className="w-4 h-4 text-[#00CC9B]" />
            {address ? (
              <span className="font-mono text-xs text-emerald-400">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            ) : (
              <span>Connect Wallet</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
