// Root layout for every page: global CSS, the Geist font (next/font downloads it at
// build time, so no request goes to Google at runtime) and the tooltip provider that
// shadcn/Base UI tooltips (used by the collapsed sidebar) need.

import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { TimeZoneCookie } from "@/components/time-zone-cookie";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "SMB CRM",
  description: "CRM, outreach, nurturing, ads and websites for small businesses.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <TimeZoneCookie />
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
