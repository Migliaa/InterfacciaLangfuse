import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Ultima Parola — revisione preventivi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <header className="intestazione">
          <strong>Ultima Parola</strong>
          <span className="sottotitolo">controllo umano su output generati da agenti</span>
        </header>
        {children}
      </body>
    </html>
  );
}
