"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCcc, useSigner } from "@ckb-ccc/connector-react";
import { Address, Hex, ClientPublicTestnet } from "@ckb-ccc/core";
import {
  discoverLiveAttestationCell,
  buildRevokeAttestationTx,
  AttestationCellInfo,
  DEFAULT_PROTOCOL_CONFIG,
  ATTESTATION_STATUS_VALID,
  ATTESTATION_STATUS_REVOKED,
} from "@/protocol";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Share2,
  Copy,
  Check,
  RotateCcw,
  Loader2,
  Clock,
  User,
  Link2,
  Lock,
} from "lucide-react";

export default function AttestationDetailPage() {
  const params = useParams();
  const rawId = params?.id as string;
  const attestationId = (rawId?.startsWith("0x") ? rawId : `0x${rawId}`) as Hex;

  const { open } = useCcc();
  const signer = useSigner();

  const [loading, setLoading] = useState(true);
  const [cellInfo, setCellInfo] = useState<AttestationCellInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [isIssuer, setIsIssuer] = useState(false);

  const [revoking, setRevoking] = useState(false);
  const [revokeTxHash, setRevokeTxHash] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadAttestation = async () => {
    try {
      setLoading(true);
      setError(null);
      const client = new ClientPublicTestnet();
      const liveCell = await discoverLiveAttestationCell({
        client,
        attestationId,
      });

      if (!liveCell) {
        setError("Attestation Cell not found on CKB Testnet.");
      } else {
        setCellInfo(liveCell);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load attestation cell from CKB node.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (attestationId) {
      loadAttestation();
    }
  }, [attestationId]);

  useEffect(() => {
    let mounted = true;
    if (signer && cellInfo) {
      signer.getRecommendedAddress().then(async (addr) => {
        if (!mounted) return;
        setConnectedAddress(addr);
        try {
          const addrObj = await Address.fromString(addr, signer.client);
          const signerLockHash = addrObj.script.hash().toLowerCase();
          // Check if connected signer is the authorized issuer
          const issuerLockHash = cellInfo.typeScript.args.toLowerCase();
          setIsIssuer(signerLockHash === issuerLockHash);
        } catch {
          setIsIssuer(false);
        }
      }).catch(() => {
        if (mounted) {
          setConnectedAddress(null);
          setIsIssuer(false);
        }
      });
    }
    return () => {
      mounted = false;
    };
  }, [signer, cellInfo]);

  const handleRevoke = async () => {
    if (!signer || !cellInfo) return;

    try {
      setRevoking(true);
      setRevokeError(null);
      setRevokeTxHash(null);

      const { tx } = await buildRevokeAttestationTx({
        signer,
        liveCell: cellInfo,
      });

      const hash = await signer.sendTransaction(tx);
      setRevokeTxHash(hash);
      // Reload attestation status after revoke
      setTimeout(() => {
        loadAttestation();
      }, 4000);
    } catch (err: any) {
      setRevokeError(err?.message || "Failed to revoke attestation.");
    } finally {
      setRevoking(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center space-y-4">
        <Loader2 className="w-8 h-8 text-[#00CC9B] animate-spin mx-auto" />
        <p className="text-slate-400 text-sm">Querying CKB Testnet Indexer...</p>
      </div>
    );
  }

  if (error || !cellInfo) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="glass-card p-8 rounded-2xl border-rose-500/30 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Attestation Not Found</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {error || `No active cell found with attestation_id ${attestationId}`}
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={loadAttestation}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Retry
            </button>
            <Link
              href="/"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-semibold"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isRevoked = cellInfo.data.status === ATTESTATION_STATUS_REVOKED;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Proof of Contribution
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                !isRevoked
                  ? "bg-emerald-500/10 text-[#00CC9B] border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}
            >
              {!isRevoked ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>VALID</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>REVOKED</span>
                </>
              )}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
            Attestation Details
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Share"}</span>
          </button>

          <Link
            href={`/verify/${attestationId}`}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-semibold transition"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verify Audit</span>
          </Link>
        </div>
      </div>

      {/* Main Card */}
      <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-6">
        {/* Claim Block */}
        <div className="space-y-2 pb-6 border-b border-slate-800">
          <div className="text-xs uppercase font-semibold text-slate-400">Contribution Claim</div>
          <div className="text-xl font-medium text-slate-100 leading-relaxed">
            "{cellInfo.data.claim}"
          </div>
          {cellInfo.data.evidence && (
            <div className="pt-2 flex items-center gap-2 text-xs">
              <Link2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Evidence:</span>
              <a
                href={cellInfo.data.evidence}
                target="_blank"
                rel="noreferrer"
                className="text-[#00CC9B] hover:underline break-all"
              >
                {cellInfo.data.evidence}
              </a>
            </div>
          )}
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-slate-400 uppercase text-[10px]">Attestation ID (Stable)</div>
            <div className="text-slate-200 break-all">{cellInfo.data.attestation_id}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-slate-400 uppercase text-[10px]">Current Live OutPoint</div>
            <div className="text-slate-200 break-all">
              {cellInfo.outPoint.txHash}:{cellInfo.outPoint.index}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-slate-400 uppercase text-[10px]">Authorized Issuer Lock Hash</div>
            <div className="text-slate-200 break-all">{cellInfo.typeScript.args}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-slate-400 uppercase text-[10px]">Holder Lock Args</div>
            <div className="text-slate-200 break-all">{cellInfo.holderLock.args}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-slate-400 uppercase text-[10px]">Issued Timestamp / Block</div>
            <div className="text-slate-200">
              {new Date(cellInfo.data.issued_at * 1000).toLocaleString()} ({cellInfo.data.issued_at})
            </div>
          </div>

          {cellInfo.data.revoked_at && (
            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-1">
              <div className="text-rose-400 uppercase text-[10px]">Revoked Timestamp</div>
              <div className="text-rose-300">
                {new Date(cellInfo.data.revoked_at * 1000).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Issuer Revocation Panel */}
      {!isRevoked && (
        <div className="glass-card p-6 rounded-2xl border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Issuer Management</h3>
            </div>
            {isIssuer && (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Authorized Signer
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Only the authorized issuer whose lock hash is encoded in the Type Script args can transition this attestation to <code className="text-rose-400">REVOKED</code> state.
          </p>

          {isIssuer ? (
            <div className="space-y-3 pt-2">
              {revokeError && (
                <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
                  {revokeError}
                </div>
              )}
              {revokeTxHash && (
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs">
                  Revoke transaction sent: {revokeTxHash}
                </div>
              )}
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white font-semibold text-xs transition disabled:opacity-50"
              >
                {revoking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing Revocation Transaction...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Revoke This Attestation</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic">
              Connect the authorized issuer wallet to perform revocation.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
