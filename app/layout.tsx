import type { Metadata } from "next";
import "./globals.css";
import { NavLinks } from "@/components/NavLinks";
import { ThemeProvider } from "./providers";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Manor — Command Centre",
  description: "AI Agent Management Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
            <aside
              className="w-[220px] flex-shrink-0 flex flex-col"
              style={{ background: 'var(--sidebar-bg)', boxShadow: "2px 0 12px rgba(0,0,0,0.3)" }}
            >
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f5c518] to-[#e8b800] flex items-center justify-center text-lg"
                    style={{ boxShadow: "0 2px 8px rgba(245,197,24,0.3)" }}
                  >
                    🏰
                  </div>
                  <div>
                    <div className="font-semibold text-[17px] tracking-[-0.3px]" style={{ color: 'var(--text-primary)' }}>
                      Manor
                    </div>
                    <div className="text-[12px] tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                      Command Centre
                    </div>
                  </div>
                </div>
              </div>
              <NavLinks />
              <ThemeToggle />
            </aside>
            <main className="flex-1 overflow-hidden relative">
              {/* Glass background orbs — only visible in glass theme */}
              <div className="pointer-events-none fixed inset-0 overflow-hidden glass-orbs" aria-hidden>
                <div style={{
                  position: 'absolute', top: '15%', left: '20%',
                  width: 400, height: 400, borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
                  filter: 'blur(40px)',
                }} />
                <div style={{
                  position: 'absolute', top: '55%', right: '15%',
                  width: 320, height: 320, borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(245,197,24,0.08) 0%, transparent 70%)',
                  filter: 'blur(40px)',
                }} />
                <div style={{
                  position: 'absolute', bottom: '20%', left: '40%',
                  width: 280, height: 280, borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(59,158,255,0.09) 0%, transparent 70%)',
                  filter: 'blur(40px)',
                }} />
              </div>
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
