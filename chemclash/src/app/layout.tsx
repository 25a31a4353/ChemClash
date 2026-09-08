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
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 antialiased">
        {children}
        <footer className="fixed bottom-2 right-2 text-xs text-slate-400 hover:text-slate-600 transition-colors z-50 font-medium">
          Developed by M.Shanmukheswara, N.Varshith, S.V.S.Mohith
        </footer>
      </body>
    </html>
  );
}
