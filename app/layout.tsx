import "./globals.css";
import Navbar from "../components/Navbar";
import Script from "next/script";

export const metadata = {
  title: "OfSkillJob",
  description: "Show Skills. Get Hired.",
  icons: {
    icon: "/favicon.ico",
  },
};

// ✅ Move viewport to a separate export
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
        {/* Google Search Console verification */}
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
            textAlign: "center",
            padding: "25px",
            background: "#0f172a",
            color: "#cbd5e1",
            marginTop: "40px",
          }}
        >
          © 2026 OfSkillJob - Show Skills. Get Hired.
        </footer>
      </body>
    </html>
  );
}