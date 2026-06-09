// Root layout is intentionally a pass-through; the real <html>/<body>
// live inside app/[locale]/layout.tsx so next-intl can scope by locale.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
