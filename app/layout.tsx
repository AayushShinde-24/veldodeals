import type { Metadata } from "next";
import { AppFrame } from "./app-frame";
import { Providers } from "./providers";
import { getCurrentProfile } from "@/lib/auth/server";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Veldo | AI Sales Team OS",
  description: "Autonomous B2B revenue-agent platform.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const profile = await getCurrentProfile();

  return (
    <html lang="en">
      <body>
        <Providers>
          <AppFrame profile={profile}>{children}</AppFrame>
        </Providers>
      </body>
    </html>
  );
}
