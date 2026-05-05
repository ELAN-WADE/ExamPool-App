import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "../hooks/useAuth";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Exampool LAN",
  description: "Offline-first LAN examination platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none';"
        />
      </head>
      <body className="font-system">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
