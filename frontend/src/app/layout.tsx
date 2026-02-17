import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import LayoutShell from "@/components/layout/LayoutShell";

export const metadata: Metadata = {
  title: "Parchi.ai — AI Medical Records",
  description: "AI-powered medical record system for small clinics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('darkMode')==='true'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                document.fonts.ready.then(function() {
                  var hasMaterialFont = document.fonts.check('400 24px "Material Symbols Outlined"');
                  if (!hasMaterialFont) {
                    document.documentElement.classList.add('no-material-icons');
                  }
                }).catch(function() {
                  document.documentElement.classList.add('no-material-icons');
                });
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased font-sans flex min-h-screen bg-bg">
        <Sidebar />
        <LayoutShell>
          <Header />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </LayoutShell>
      </body>
    </html>
  );
}

