"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ShieldCheck, ArrowRight, HelpCircle } from "lucide-react";

export default function VerifyPortalPage() {
  const [attestationId, setAttestationId] = useState("");
  const router = useRouter();

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (attestationId.trim()) {
      router.push(`/verify/${attestationId.trim()}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-[#00CC9B] mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Verify Proof of Contribution
        </h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Enter a 32-byte <code className="text-[#00CC9B]">attestation_id</code> to run independent on-chain verification directly against CKB node indexer.
        </p>
      </div>

      <div className="glass-card p-8 rounded-2xl space-y-6">
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Attestation ID (0x...)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                placeholder="0xd419fb2cfdf221988b858560c224539ad54dbc448634c21321caf0e3a9ffbdcc"
                value={attestationId}
                onChange={(e) => setAttestationId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-[#00CC9B] focus:ring-1 focus:ring-[#00CC9B] text-slate-100 text-sm font-mono placeholder-slate-600 outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#00CC9B] to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 transition"
          >
            <span>Run 7-Point Cryptographic Audit</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs text-slate-400">
        <div className="flex items-center gap-2 text-slate-200 font-semibold">
          <HelpCircle className="w-4 h-4 text-[#00CC9B]" />
          <span>How does verification work?</span>
        </div>
        <p className="leading-relaxed">
          The verifier does not call any central server. Instead, it directly contacts the CKB node indexer to discover the latest live Cell carrying the specified <code className="text-slate-300">attestation_id</code>, then evaluates Type Script code hash, authorized issuer lock hash args, holder lock scripts, and cell data payload.
        </p>
      </div>
    </div>
  );
}
