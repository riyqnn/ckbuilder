import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CccProviderWrapper } from "@/components/CccProviderWrapper";

export const metadata: Metadata = {
  title: "Proof of X — CKB-Native Attestation Primitive",
  description:
    "A minimal CKB-native protocol representing verifiable attestations as owned CKB Cells with Type Script enforced on-chain state transitions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col antialiased">
        <CccProviderWrapper>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <Footer />
        </CccProviderWrapper>
      </body>
    </html>
  );
}
