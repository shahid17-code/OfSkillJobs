import "./globals.css";
import Navbar from "../components/Navbar";

export const metadata = {
  title: "OfSkillJob",
  description: "Show Skills. Get Hired.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main style={{ minHeight: "80vh" }}>{children}</main>
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