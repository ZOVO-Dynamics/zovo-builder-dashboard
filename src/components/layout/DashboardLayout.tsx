import Sidebar from "./Sidebar";
import UsageWidget from "@/components/usage/UsageWidget";
import CreditsWidget from "../CreditsWidget";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import SupportChatWidget from "../SupportChatWidget";

const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-display" });
const body = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${display.variable} ${body.variable} ${mono.variable} flex min-h-screen bg-[#0A0A0C]`}>
      <Sidebar />

      <main className="flex-1 p-8 pt-24 text-[#F5F1E8] md:pt-8" style={{ fontFamily: "var(--font-body)" }}>
        <UsageWidget />
        <CreditsWidget />
        <SupportChatWidget />

        {children}
      </main>
    </div>
  );
}
