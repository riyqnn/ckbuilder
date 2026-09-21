import React from "react";
import Link from "next/link";
import { ExternalLink, Terminal, Shield, Layers } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-[#060910] text-slate-400 py-12 text-sm mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Col 1 */}
        <div className="space-y-3 md:col-span-2">
          <div className="flex items-center gap-2 text-slate-100 font-bold text-base">
            <Shield className="w-5 h-5 text-[#00CC9B]" />
            <span>Proof of X — CKB-Native Attestation Primitive</span>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed max-w-md">
            An owned CKB Cell attestation protocol where state transitions (Issue → Revoke) are cryptographically enforced on-chain via Type Scripts. Zero off-chain database dependency.
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <Terminal className="w-3.5 h-3.5" />
            <span>Week 5 Milestone • Track: Builder</span>
          </div>
        </div>

        {/* Col 2: Navigation */}
        <div>
          <div className="text-slate-200 font-semibold text-xs uppercase tracking-wider mb-3">
            Navigation
          </div>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/" className="hover:text-[#00CC9B] transition-colors">Overview</Link>
            </li>
            <li>
              <Link href="/issue" className="hover:text-[#00CC9B] transition-colors">Issue Attestation</Link>
            </li>
            <li>
              <Link href="/verify" className="hover:text-[#00CC9B] transition-colors">Verification Engine</Link>
            </li>
          </ul>
        </div>

        {/* Col 3: CKB Ecosystem Links */}
        <div>
          <div className="text-slate-200 font-semibold text-xs uppercase tracking-wider mb-3">
            CKB Resources
          </div>
          <ul className="space-y-2 text-xs">
            <li>
              <a
                href="https://pudge.explorer.nervos.org"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 hover:text-[#00CC9B] transition-colors"
              >
                <span>CKB Pudge Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>
              <a
                href="https://docs.nervos.org"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 hover:text-[#00CC9B] transition-colors"
              >
                <span>Nervos CKB Docs</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>
              <a
                href="https://github.com/ckb-ecofund/ccc"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 hover:text-[#00CC9B] transition-colors"
              >
                <span>CCC SDK GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-8 border-t border-slate-900 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>Proof of X © 2026 • Built for CKB Community Builder Track</div>
        <div className="flex items-center gap-4">
          <span className="text-slate-400">Network: CKB Testnet (Pudge)</span>
        </div>
      </div>
    </footer>
  );
}
