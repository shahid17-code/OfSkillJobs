import "./globals.css";
import Navbar from "../components/Navbar";
import Script from "next/script";
import Link from "next/link";

export const metadata = {
  title: "OfSkillJob",
  description: "Show Skills. Get Hired.",
  icons: {
    icon: "/favicon.png",      // ✅ correct public path
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

  return (
    <html lang="en">
      <head>
        <meta
          name="google-site-verification"
          content="qm2YrHvpcQ_F74UybKmfe7o45J8pmqKpgcwog4bJR-c"
        />
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}
      </head>
      <body style={{ margin: 0, background: "#f8fafc", fontFamily: "Inter, system-ui, sans-serif" }}>
        <Navbar />
        <main style={{ minHeight: "80vh", padding: "20px" }}>{children}</main>
        <footer
          style={{
            background: "#0f172a",
            color: "#cbd5e1",
            padding: "20px 16px",
            marginTop: "40px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "24px",
              marginBottom: "16px",
            }}
          >
            <Link href="/about" style={footerLinkStyle}>About</Link>
            <Link href="/contact" style={footerLinkStyle}>Contact</Link>
            <Link href="/privacy" style={footerLinkStyle}>Privacy</Link>
            <Link href="/terms" style={footerLinkStyle}>Terms</Link>
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "#94a3b8",
              display: "flex",
              justifyContent: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <span>© 2026 OfSkillJob – Show Skills. Get Hired.</span>
            <a href="mailto:ofskilljobs@gmail.com" style={footerLinkStyle}>
              ofskilljobs@gmail.com
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}

const footerLinkStyle: React.CSSProperties = {
  color: "#cbd5e1",
  textDecoration: "none",
  fontSize: "13px",
  transition: "color 0.2s",
  cursor: "pointer",
};