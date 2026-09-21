"use client";

import React, { ReactNode } from "react";
import { ccc } from "@ckb-ccc/connector-react";

export function CccProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <ccc.Provider
      name="Proof of X"
      icon="https://cryptologos.cc/logos/nervos-network-ckb-logo.png"
    >
      {children}
    </ccc.Provider>
  );
}
