"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Hex, ClientPublicTestnet } from "@ckb-ccc/core";
import {
  verifyAttestation,
  VerificationReport,
  DEFAULT_PROTOCOL_CONFIG,
} from "@/protocol";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Lock,
  User,
  FileText,
  Database,
  Search,
  RefreshCw,
} from "lucide-react";

export default function VerifyPage() {
  const params = useParams();
  const rawId = params?.id as string;
  const attestationId = (rawId?.startsWith("0x") ? rawId : `0x${rawId}`) as Hex;

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [expectedHolder, setExpectedHolder] = useState<string>("");

  const runVerification = async () => {
    try {
      setLoading(true);
      const client = new ClientPublicTestnet();
      const res = await verifyAttestation({
        client,
        attestationId,
        expectedHolderAddress: expectedHolder.trim() || undefined,
      });
      setReport(res);
    } catch (err: any) {
      console.error("Verification error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (attestationId) {
      runVerification();
    }
  }, [attestationId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center space-y-4">
        <Loader2 className="w-10 h-10 text-[#00CC9B] animate-spin mx-auto" />
        <h2 className="text-xl font-bold text-white">Running On-Chain Cryptographic Audit</h2>
        <p className="text-slate-400 text-xs font-mono">
          Querying CKB Testnet Indexer & Auditing Type Script State Invariants...
        </p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <p className="text-slate-400">Failed to load verification report.</p>
      </div>
    );
  }

  const isFullyValid = report.isValid;
  const isRevoked = report.status === "REVOKED";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Audit Banner */}
      <div
        className={`p-6 sm:p-8 rounded-2xl border transition-all ${
          isFullyValid
            ? "bg-emerald-950/20 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
            : isRevoked
            ? "bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-500/10"
            : "bg-rose-950/20 border-rose-500/50 shadow-lg shadow-rose-500/10"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                isFullyValid
                  ? "bg-emerald-500/20 text-[#00CC9B]"
                  : isRevoked
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-rose-500/20 text-rose-400"
              }`}
            >
              {isFullyValid ? (
                <ShieldCheck className="w-7 h-7" />
              ) : isRevoked ? (
                <AlertTriangle className="w-7 h-7" />
              ) : (
                <XCircle className="w-7 h-7" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-mono tracking-wider text-slate-400">
                  Verification Verdict
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                    isFullyValid
                      ? "bg-emerald-500/20 text-emerald-300"
                      : isRevoked
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  {report.status}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                {isFullyValid
                  ? "Attestation Cryptographically Verified"
                  : isRevoked
                  ? "Attestation On-Chain Status: REVOKED"
                  : "Attestation Verification Failed"}
              </h1>
            </div>
          </div>

          <button
            onClick={runVerification}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs font-semibold text-slate-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#00CC9B]" />
            <span>Re-Verify</span>
          </button>
        </div>

        {report.failureReason && (
          <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-300">
            <strong>Audit Note:</strong> {report.failureReason}
          </div>
        )}
      </div>

      {/* Target Attestation Summary */}
      {report.cellInfo && (
        <div className="glass-card p-6 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-slate-400">Audited Claim</span>
            <Link
              href={`/attestations/${attestationId}`}
              className="text-xs text-[#00CC9B] hover:underline"
            >
              View Holder Details →
            </Link>
          </div>
          <p className="text-lg font-medium text-slate-100">"{report.cellInfo.data.claim}"</p>
          {report.cellInfo.data.evidence && (
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <span>Evidence:</span>
              <a
                href={report.cellInfo.data.evidence}
                target="_blank"
                rel="noreferrer"
                className="text-[#00CC9B] hover:underline break-all"
              >
                {report.cellInfo.data.evidence}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Holder Optional Claim Check */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center gap-3">
        <User className="w-5 h-5 text-slate-400 shrink-0 hidden sm:block" />
        <input
          type="text"
          placeholder="Optional: Verify against specific Holder Address (ckt1q...)"
          value={expectedHolder}
          onChange={(e) => setExpectedHolder(e.target.value)}
          className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none font-mono"
        />
        <button
          onClick={runVerification}
          className="px-4 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-[#00CC9B] text-xs font-semibold shrink-0 whitespace-nowrap"
        >
          Check Holder
        </button>
      </div>

      {/* 7-Point On-Chain Verification Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">7-Point Cryptographic Check Breakdown</h2>
          <span className="text-xs text-slate-400 font-mono">
            {report.checks.filter((c) => c.passed).length} / {report.checks.length} Passed
          </span>
        </div>

        <div className="space-y-3">
          {report.checks.map((chk, idx) => (
            <div
              key={chk.id}
              className={`p-4 rounded-xl border transition-all ${
                chk.passed
                  ? "bg-slate-900/60 border-slate-800"
                  : "bg-rose-950/20 border-rose-500/40"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {chk.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">
                        {idx + 1}. {chk.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{chk.detail}</p>
                  </div>
                </div>

                {chk.onChainReference && (
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase font-mono text-slate-500">
                      {chk.onChainReference.label}
                    </div>
                    {chk.onChainReference.url ? (
                      <a
                        href={chk.onChainReference.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs text-[#00CC9B] hover:underline"
                      >
                        <span>{chk.onChainReference.value.slice(0, 12)}...</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <div className="font-mono text-xs text-slate-300">
                        {chk.onChainReference.value.length > 20
                          ? `${chk.onChainReference.value.slice(0, 10)}...${chk.onChainReference.value.slice(-6)}`
                          : chk.onChainReference.value}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Raw On-Chain Cell Inspector */}
      {report.cellInfo && (
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#00CC9B]" />
              <h3 className="text-sm font-semibold text-white">Live Cell Raw Data</h3>
            </div>
            <a
              href={`${DEFAULT_PROTOCOL_CONFIG.explorerUrl}/transaction/${report.cellInfo.outPoint.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-[#00CC9B] hover:underline"
            >
              <span>View On CKB Explorer</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <pre className="p-4 rounded-xl bg-[#060910] border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto">
            {JSON.stringify(
              {
                outPoint: report.cellInfo.outPoint,
                capacity: `${Number(report.cellInfo.capacity) / 10 ** 8} CKB`,
                typeScript: report.cellInfo.typeScript,
                holderLock: report.cellInfo.holderLock,
                data: report.cellInfo.data,
              },
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
