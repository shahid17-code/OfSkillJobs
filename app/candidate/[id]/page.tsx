"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";

function safeParseArray(v: any): any[] {
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v) || []; } catch { return []; }
}

export default function EliteProfileView() {
  return (
    <ProtectedRoute role="company">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #f1f5f9; margin: 0; color: #1e293b; }
        
        /* THE STRICTOR PRINT FIX */
        @media print { 
          /* Hide EVERYTHING marked no-print */
          .no-print, 
          nav, 
          footer, 
          button,
          [role="navigation"] { 
            display: none !important; 
          }

          body { background: white !important; padding: 0 !important; }
          
          .resume-wrapper { 
            box-shadow: none !important; 
            margin: 0 !important; 
            width: 100% !important; 
            max-width: 100% !important;
            border-radius: 0 !important;
            border: none !important;
          }
          
          .container-outer { padding: 0 !important; margin: 0 !important; }
          
          /* Ensure text colors are forced to black for printing */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
      <CandidateLayout />
    </ProtectedRoute>
  );
}

function CandidateLayout() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      if (!id) return;
      const { data: user } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
      if (user) {
        user.skills = safeParseArray(user.skills);
        user.experience = safeParseArray(user.experience);
        user.education = safeParseArray(user.education);
        const { data: projects } = await supabase.from("submissions").select("*").eq("user_id", id);
        setData({ ...user, projects: projects || [] });
      }
      setLoading(false);
    }
    fetchAll();
  }, [id]);

  if (loading) return <div style={s.loader}>Finalizing Profile Report...</div>;
  if (!data) return <div style={s.loader}>Error: Profile data unavailable</div>;

  return (
    <div style={s.container} className="container-outer">
      {/* TOP ACTION BAR - HIDE ON PRINT */}
      <div style={s.actionBar} className="no-print">
        <button onClick={() => router.back()} style={s.btnGhost}>← Back to Dashboard</button>
        <button onClick={() => window.print()} style={s.btnPrint}>Download Official CV</button>
      </div>

      <div style={s.resumeWrapper} className="resume-wrapper">
        {/* LEFT SIDEBAR */}
        <aside style={s.sidebar}>
          <img 
            src={data.avatar_url || `https://ui-avatars.com/api/?background=334155&color=fff&name=${data.full_name}`} 
            style={s.avatar} 
          />
          
          <div style={s.sideSection}>
            <h4 style={s.sideLabel}>Contact Details</h4>
            <p style={s.sideText}>📧 {data.email}</p>
            {data.phone && <p style={s.sideText}>📞 {data.phone}</p>}
            {data.location && <p style={s.sideText}>📍 {data.location}</p>}
          </div>

          <div style={s.sideSection}>
            <h4 style={s.sideLabel}>Digital Footprint</h4>
            <div style={s.linkGrid} className="no-print">
                {data.github && <a href={data.github} target="_blank" style={s.sideButton}>View GitHub</a>}
                {data.linkedin && <a href={data.linkedin} target="_blank" style={s.sideButton}>View LinkedIn</a>}
                {data.website && <a href={data.website} target="_blank" style={s.sideButton}>Visit Portfolio</a>}
            </div>
            {/* Simple text version for Print only */}
            <div className="print-only" style={{ display: 'none' }}>
               {data.github && <p style={s.sideText}>GitHub: {data.github}</p>}
               {data.linkedin && <p style={s.sideText}>LinkedIn: {data.linkedin}</p>}
            </div>
          </div>

          <div style={s.sideSection}>
            <h4 style={s.sideLabel}>Top Capabilities</h4>
            <div style={s.skillBox}>
              {data.skills.map((s_item: string) => <span key={s_item} style={s.skillPill}>{s_item}</span>)}
            </div>
          </div>
        </aside>

        {/* MAIN BODY */}
        <main style={s.mainBody}>
          <header style={s.header}>
            <h1 style={s.name}>{data.full_name}</h1>
            <h2 style={s.headline}>{data.headline || "Professional Candidate"}</h2>
            <div style={s.line} />
          </header>

          <section style={s.section}>
            <h3 style={s.sectionTitle}>Executive Summary</h3>
            <p style={s.bodyText}>{data.bio || "No summary provided."}</p>
          </section>

          <section style={s.section}>
            <h3 style={s.sectionTitle}>Professional Experience</h3>
            <div style={s.timeline}>
              {data.experience?.map((exp: any, i: number) => (
                <div key={i} style={s.timeItem}>
                  <div style={s.itemHead}>
                    <strong style={s.itemTitle}>{exp.title} — {exp.company}</strong>
                    <span style={s.itemDate}>{exp.startDate} – {exp.endDate || "Present"}</span>
                  </div>
                  <p style={s.itemDesc}>{exp.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section style={s.section}>
            <h3 style={s.sectionTitle}>Education</h3>
            {data.education?.map((edu: any, i: number) => (
              <div key={i} style={s.timeItem}>
                <div style={s.itemHead}>
                  <strong style={s.itemTitle}>{edu.degree}</strong>
                  <span style={s.itemDate}>{edu.startDate} – {edu.endDate || "N/A"}</span>
                </div>
                <div style={s.itemSubTitle}>{edu.school}</div>
                {edu.description && <p style={s.itemDesc}>{edu.description}</p>}
              </div>
            ))}
          </section>

          <section style={s.section}>
            <h3 style={s.sectionTitle}>Verified Project Portfolio</h3>
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Project</th>
                    <th style={s.th}>Description</th>
                    <th style={s.th} className="no-print">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {data.projects.map((p: any) => (
                    <tr key={p.id}>
                      <td style={s.tdStrong}>{p.title}</td>
                      <td style={s.td}>{p.description}</td>
                      <td style={s.td} className="no-print">
                        <a href={p.repo_url} target="_blank" style={s.tableLink}>Source</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { padding: "40px 20px" },
  actionBar: { maxWidth: 1050, margin: "0 auto 20px", display: "flex", justifyContent: "space-between" },
  resumeWrapper: { 
    maxWidth: 1050, margin: "0 auto", background: "#fff", display: "flex", 
    boxShadow: "0 20px 40px rgba(0,0,0,0.1)", borderRadius: "12px", overflow: "hidden" 
  },
  sidebar: { width: 320, background: "#0f172a", color: "#fff", padding: "40px 30px" },
  avatar: { width: "100%", borderRadius: "8px", marginBottom: "30px", border: "1px solid rgba(255,255,255,0.1)" },
  sideLabel: { fontSize: "11px", textTransform: "uppercase", letterSpacing: "1.5px", color: "#94a3b8", marginBottom: "15px" },
  sideSection: { marginBottom: "35px" },
  sideText: { fontSize: "14px", margin: "8px 0", color: "#cbd5e1" },
  
  linkGrid: { display: "flex", flexDirection: "column", gap: "10px" },
  sideButton: { 
    display: "block", background: "rgba(255,255,255,0.05)", color: "#fff", 
    textDecoration: "none", fontSize: "13px", padding: "10px", borderRadius: "6px", 
    fontWeight: "600", textAlign: "center", border: "1px solid rgba(255,255,255,0.1)"
  },

  skillBox: { display: "flex", flexWrap: "wrap", gap: "8px" },
  skillPill: { background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: "4px", fontSize: "12px", border: "1px solid rgba(255,255,255,0.1)" },

  mainBody: { flex: 1, padding: "60px" },
  header: { marginBottom: "40px" },
  name: { fontSize: "42px", fontWeight: "800", margin: 0, letterSpacing: "-1.5px", color: "#0f172a" },
  headline: { fontSize: "20px", color: "#64748b", marginTop: "5px", fontWeight: "500" },
  line: { width: "50px", height: "5px", background: "#0f172a", marginTop: "25px" },
  section: { marginBottom: "45px" },
  sectionTitle: { fontSize: "14px", textTransform: "uppercase", fontWeight: "800", letterSpacing: "1px", color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px", marginBottom: "20px" },
  bodyText: { lineHeight: "1.7", color: "#475569", fontSize: "15px" },
  
  timeline: { display: "flex", flexDirection: "column", gap: "25px" },
  timeItem: { marginBottom: "10px" },
  itemHead: { display: "flex", justifyContent: "space-between", alignItems: "baseline" },
  itemTitle: { fontSize: "17px", color: "#0f172a" },
  itemDate: { fontSize: "14px", fontWeight: "800", color: "#0f172a" },
  itemSubTitle: { color: "#64748b", fontWeight: "600", fontSize: "15px", marginTop: "2px" },
  itemDesc: { fontSize: "14px", color: "#475569", marginTop: "8px", lineHeight: "1.6" },

  tableWrap: { overflow: "hidden", border: "1px solid #e2e8f0", borderRadius: "8px" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", background: "#f8fafc", padding: "12px", fontSize: "12px", textTransform: "uppercase", color: "#94a3b8" },
  td: { padding: "15px 12px", borderBottom: "1px solid #f1f5f9", fontSize: "14px", color: "#475569" },
  tdStrong: { padding: "15px 12px", borderBottom: "1px solid #f1f5f9", fontSize: "14px", fontWeight: "700", color: "#0f172a" },
  tableLink: { color: "#0f172a", fontWeight: "700", textDecoration: "underline" },

  btnGhost: { background: "#fff", border: "1px solid #e2e8f0", padding: "8px 16px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" },
  btnPrint: { background: "#0f172a", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" },
  loader: { display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", fontWeight: "600", color: "#64748b" }
};