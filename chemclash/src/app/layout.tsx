import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChemClash — Gamified Organic Chemistry",
  description: "Master organic chemistry through duels, mechanisms, and reactions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        {children}
        <footer className="fixed bottom-2 right-2 text-xs text-white/30 hover:text-white transition-colors z-50">
          Developed by M.Shanmukheswara, N.Varshith, S.V.S.Mohith
        </footer>
      </body>
    </html>
  );
}
