import "./globals.css";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/Auth";
import { Nav } from "@/components/Nav";

export const metadata = {
  title: "VBOX — Watch web series",
  description: "VBOX streaming platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Nav />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
