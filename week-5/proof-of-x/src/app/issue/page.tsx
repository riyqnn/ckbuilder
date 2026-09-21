"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useCcc, useSigner } from "@ckb-ccc/connector-react";
import {
  MAX_CLAIM_LENGTH,
  MAX_EVIDENCE_LENGTH,
  buildIssueAttestationTx,
  DEFAULT_PROTOCOL_CONFIG,
} from "@/protocol";
import {
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  ShieldCheck,
  UserCheck,
  FileText,
  Link2,
} from "lucide-react";

export default function IssuePage() {
  const { open } = useCcc();
  const signer = useSigner();

  const [issuerAddress, setIssuerAddress] = useState<string | null>(null);
  const [holderAddress, setHolderAddress] = useState("");
  const [claim, setClaim] = useState("");
  const [evidence, setEvidence] = useState("");

  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [attestationId, setAttestationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (signer) {
      signer.getRecommendedAddress().then((addr) => {
        setIssuerAddress(addr);
      }).catch(() => {
        setIssuerAddress(null);
      });
    } else {
      setIssuerAddress(null);
    }
  }, [signer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer) {
      open();
      return;
    }

    if (!holderAddress.trim()) {
      setError("Please specify the recipient holder address.");
      return;
    }

    if (!claim.trim()) {
      setError("Please provide a claim description.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);
      setAttestationId(null);

      // Build Issue Attestation Transaction via CCC
      const result = await buildIssueAttestationTx({
        signer,
        holderAddress: holderAddress.trim(),
        claim: claim.trim(),
        evidence: evidence.trim() || undefined,
      });

      // Sign and send transaction to CKB Testnet
      const hash = await signer.sendTransaction(result.tx);

      setTxHash(hash);
      setAttestationId(result.attestationId);
    } catch (err: any) {
      console.error("Issuance failed:", err);
      setError(err?.message || "Failed to build and broadcast attestation transaction.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#00CC9B] text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Authorized Issuer Workflow</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Issue Proof of Contribution
        </h1>
        <p className="text-sm text-slate-400">
          Create an on-chain attestation Cell owned by the recipient's Lock Script and authorized by the Type Script.
        </p>
      </div>

      {/* Connection Banner */}
      {!signer ? (
        <div className="glass-card p-6 rounded-2xl border-amber-500/30 bg-amber-950/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-sm text-slate-300">
              Please connect your CKB wallet to authorize and sign the issuance transaction.
            </div>
          </div>
          <button
            onClick={() => open()}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs whitespace-nowrap shadow"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#00CC9B]" />
            <span className="text-slate-400">Connected Issuer:</span>
            <span className="font-mono text-slate-200">
              {issuerAddress ? `${issuerAddress.slice(0, 10)}...${issuerAddress.slice(-8)}` : "Loading..."}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] border border-emerald-500/20">
            Signer Active
          </span>
        </div>
      )}

      {/* Form Card */}
      <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Holder Address */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Holder CKB Address (Owner Lock Script) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsq..."
              value={holderAddress}
              onChange={(e) => setHolderAddress(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-[#00CC9B] focus:ring-1 focus:ring-[#00CC9B] text-slate-100 text-sm font-mono placeholder-slate-600 outline-none transition"
            />
            <p className="text-[11px] text-slate-500">
              The recipient CKB lock script that will hold and own the attestation cell capacity.
            </p>
          </div>

          {/* Claim */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Contribution Claim <span className="text-rose-400">*</span>
              </label>
              <span className={`text-[11px] font-mono ${claim.length > MAX_CLAIM_LENGTH ? "text-rose-400" : "text-slate-500"}`}>
                {claim.length}/{MAX_CLAIM_LENGTH}
              </span>
            </div>
            <textarea
              required
              rows={3}
              maxLength={MAX_CLAIM_LENGTH}
              placeholder="e.g. Core contributor to CKB ecosystem open source tooling & CCC integration"
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-[#00CC9B] focus:ring-1 focus:ring-[#00CC9B] text-slate-100 text-sm placeholder-slate-600 outline-none transition resize-none"
            />
          </div>

          {/* Evidence URL */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Evidence URL (Optional)
              </label>
              <span className={`text-[11px] font-mono ${evidence.length > MAX_EVIDENCE_LENGTH ? "text-rose-400" : "text-slate-500"}`}>
                {evidence.length}/{MAX_EVIDENCE_LENGTH}
              </span>
            </div>
            <div className="relative">
              <Link2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="url"
                maxLength={MAX_EVIDENCE_LENGTH}
                placeholder="https://github.com/nervosnetwork/ckb/pull/123"
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-[#00CC9B] focus:ring-1 focus:ring-[#00CC9B] text-slate-100 text-sm placeholder-slate-600 outline-none transition"
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#00CC9B] to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Constructing & Broadcasting Transaction...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Sign & Issue Attestation on CKB</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Success Modal / Card */}
      {txHash && attestationId && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl border-emerald-500/50 bg-emerald-950/20 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-[#00CC9B]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Attestation Issued Successfully!</h3>
              <p className="text-xs text-slate-300">Transaction broadcasted to CKB Testnet.</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 font-mono text-xs">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-slate-400 text-[10px] uppercase">Attestation ID</div>
              <div className="text-emerald-400 break-all">{attestationId}</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-slate-400 text-[10px] uppercase">Transaction Hash</div>
              <div className="text-slate-200 break-all">{txHash}</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link
              href={`/verify/${attestationId}`}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition"
            >
              <span>View Verification Audit</span>
              <ShieldCheck className="w-4 h-4" />
            </Link>

            <Link
              href={`/attestations/${attestationId}`}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
            >
              <span>Holder View</span>
              <UserCheck className="w-4 h-4" />
            </Link>

            <a
              href={`${DEFAULT_PROTOCOL_CONFIG.explorerUrl}/transaction/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs transition"
            >
              <span>View on Explorer</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
