"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { CSSProperties, ChangeEvent } from "react";

const INDIAN_INDUSTRIES = [
  "Information Technology (IT)", "Healthcare & Pharmaceuticals", "Banking & Finance (BFSI)",
  "Manufacturing", "E-commerce & Retail", "Education (EdTech)", "Real Estate & Construction",
  "Telecommunications", "Automobile", "Other (Custom)"
];

// Bucket fallbacks for robustness
const LOGO_BUCKETS = ["company-logos", "company-assets", "public"];
const COVER_BUCKETS = ["company-covers", "company-assets", "public"];

export default function CompanyProfileEdit() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [isCustomIndustry, setIsCustomIndustry] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data, error } = await supabase.from("users").select("*").eq("id", user.id).single();
      if (!error) {
        setIsCustomIndustry(!INDIAN_INDUSTRIES.includes(data.industry || "") && !!data.industry);
        setProfile({
          ...data,
          specialties: Array.isArray(data?.specialties) ? data.specialties : []
        });
      }
    } finally { setLoading(false); }
  }

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // File Upload Logic
  async function handleFileUpload(file: File, buckets: string[], setStatus: (b: boolean) => void, field: string) {
    if (!file) return;
    setStatus(true);
    let uploadedUrl = null;

    for (const bucket of buckets) {
      try {
        const path = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
        const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file);
        if (uploadError) continue;

        const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
        uploadedUrl = publicData?.publicUrl;
        if (uploadedUrl) break;
      } catch (e) { continue; }
    }

    if (uploadedUrl) {
      setProfile({ ...profile, [field]: uploadedUrl });
      showToast("Image uploaded!", "success");
    } else {
      showToast("Upload failed. Check storage buckets.", "error");
    }
    setStatus(false);
  }

  async function handleSave() {
    if (!profile.phone || !profile.location || !profile.industry || !profile.about) {
      return showToast("Please fill all required (*) fields", "error");
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("users").update({
        company_name: profile.company_name,
        phone: profile.phone,
        location: profile.location,
        industry: profile.industry,
        about: profile.about,
        founded_date: profile.founded_date,
        company_size: profile.company_size,
        website: profile.website,
        linkedin: profile.linkedin,
        twitter: profile.twitter,
        logo_url: profile.logo_url,
        cover_url: profile.cover_url,
        specialties: profile.specialties,
      }).eq("id", user?.id);

      if (error) throw error;
      
      showToast("Profile saved successfully! Redirecting...", "success");
      
      // Automatic Redirection to profile page
      setTimeout(() => {
        router.push(`/company/${profile.username || user?.id}`);
      }, 1500);

    } catch (err: any) {
      showToast(err.message || "Save failed", "error");
    } finally { setSaving(false); }
  }

  if (loading) return <div style={{textAlign:'center', padding:50}}>Loading Workspace...</div>;

  return (
    <div style={pageWrapper}>
      <div style={topBar}>
        <h1 style={mainTitle}>Company Settings</h1>
        <button onClick={handleSave} disabled={saving} style={btnPrimary}>
          {saving ? "Saving..." : "💾 Save Changes"}
        </button>
      </div>

      <div style={dashboardGrid}>
        <div style={column}>
          <div style={card}>
            <h2 style={cardTitle}>🏢 Core Identity</h2>
            <div style={grid2}>
              <Field label="Company Name *">
                <input style={input} value={profile.company_name || ""} onChange={e => setProfile({...profile, company_name: e.target.value})} />
              </Field>
              <Field label="Email (Locked)">
                <input style={{...input, background:'#f1f5f9', cursor: 'not-allowed'}} value={profile.email || ""} readOnly />
                <p style={{fontSize: 10, color: '#94a3b8', marginTop: 4}}>Email cannot be changed once entered. Contact support to update.</p>
              </Field>
            </div>
            
            <div style={grid2}>
              <Field label="Phone Number *">
                <input style={input} value={profile.phone || ""} onChange={e => setProfile({...profile, phone: e.target.value})} />
              </Field>
              <Field label="Location *">
                <input style={input} value={profile.location || ""} onChange={e => setProfile({...profile, location: e.target.value})} />
              </Field>
            </div>

            <div style={grid2}>
              <Field label="Founded Date">
                <input type="date" style={input} value={profile.founded_date || ""} onChange={e => setProfile({...profile, founded_date: e.target.value})} />
              </Field>
              <Field label="Company Size">
                <input placeholder="e.g. 50-100" style={input} value={profile.company_size || ""} onChange={e => setProfile({...profile, company_size: e.target.value})} />
              </Field>
            </div>

            <Field label="Industry *">
              <select style={input} value={isCustomIndustry ? "Other (Custom)" : (profile.industry || "")} onChange={e => {
                if(e.target.value === "Other (Custom)") { setIsCustomIndustry(true); setProfile({...profile, industry: ""}); }
                else { setIsCustomIndustry(false); setProfile({...profile, industry: e.target.value}); }
              }}>
                <option value="">Select Industry</option>
                {INDIAN_INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
              {isCustomIndustry && <input style={{...input, marginTop:10}} placeholder="Type industry..." value={profile.industry || ""} onChange={e => setProfile({...profile, industry: e.target.value})} />}
            </Field>

            <Field label="About the Company *">
              <textarea style={{...input, height:100, resize: 'none'}} value={profile.about || ""} onChange={e => setProfile({...profile, about: e.target.value})} />
            </Field>
          </div>

          <div style={card}>
            <h2 style={cardTitle}>🌐 Social Links</h2>
            <div style={grid2}>
              <Field label="Website"><input style={input} value={profile.website || ""} onChange={e => setProfile({...profile, website: e.target.value})} /></Field>
              <Field label="LinkedIn"><input style={input} value={profile.linkedin || ""} onChange={e => setProfile({...profile, linkedin: e.target.value})} /></Field>
            </div>
            <Field label="X (Twitter)">
              <input style={input} value={profile.twitter || ""} onChange={e => setProfile({...profile, twitter: e.target.value})} />
            </Field>
          </div>
        </div>

        <div style={column}>
          <div style={card}>
            <h2 style={cardTitle}>🎨 Media Assets</h2>
            
            {/* LOGO SECTION */}
            <div style={{marginBottom: 25}}>
              <label style={fieldLabel}>Company Logo</label>
              <div style={logoPreviewBox}>
                {profile.logo_url ? <img src={profile.logo_url} style={fullImg} /> : <span style={{color:'#cbd5e1', fontWeight:800, fontSize:20}}>{profile.company_name?.charAt(0)}</span>}
              </div>
              <div style={{display:'flex', gap:8, marginTop:10}}>
                <button onClick={() => document.getElementById('logoFile')?.click()} style={btnUpload}>
                  {logoUploading ? "..." : "Upload Logo"}
                </button>
                {profile.logo_url && <button onClick={() => setProfile({...profile, logo_url: null})} style={btnRemove}>Remove</button>}
              </div>
              <input type="file" id="logoFile" hidden onChange={(e) => handleFileUpload(e.target.files?.[0]!, LOGO_BUCKETS, setLogoUploading, 'logo_url')} />
            </div>

            {/* COVER SECTION */}
            <div>
              <label style={fieldLabel}>Cover Banner</label>
              <div style={coverPreviewBox}>
                {profile.cover_url ? <img src={profile.cover_url} style={fullImg} /> : <span style={{color:'#94a3b8', fontSize:12}}>No Banner Uploaded</span>}
              </div>
              <div style={{display:'flex', gap:8, marginTop:10}}>
                <button onClick={() => document.getElementById('coverFile')?.click()} style={btnUpload}>
                  {coverUploading ? "..." : "Upload Cover"}
                </button>
                {profile.cover_url && <button onClick={() => setProfile({...profile, cover_url: null})} style={btnRemove}>Remove</button>}
              </div>
              <input type="file" id="coverFile" hidden onChange={(e) => handleFileUpload(e.target.files?.[0]!, COVER_BUCKETS, setCoverUploading, 'cover_url')} />
            </div>
          </div>

          <div style={card}>
            <h2 style={cardTitle}>🎯 Specialties (Tags)</h2>
            <div style={{display:'flex', flexWrap:'wrap', gap:8, marginBottom:10}}>
              {profile.specialties.map((t:string, i:number) => (
                <span key={i} style={tagStyle}>
                  {t} <button onClick={() => setProfile({...profile, specialties: profile.specialties.filter((_:any,idx:number)=>idx!==i)})} style={tagClose}>×</button>
                </span>
              ))}
            </div>
            <div style={{display:'flex', gap:8}}>
              <input style={input} value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Add specialty..." onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), (newTag.trim() && setProfile({...profile, specialties:[...profile.specialties, newTag.trim()]})) , setNewTag(""))} />
              <button style={{...btnPrimary, padding: '0 15px'}} onClick={() => { if(newTag.trim()){ setProfile({...profile, specialties:[...profile.specialties, newTag.trim()]}); setNewTag(""); } }}>Add</button>
            </div>
          </div>
        </div>
      </div>
      {toast && <div style={{...toastStyle, background: toast.type === "success" ? "#10b981" : "#ef4444"}}>{toast.msg}</div>}
    </div>
  );
}

// Sub-components
function Field({label, children}: any) {
  return <div style={{marginBottom:15}}><label style={fieldLabel}>{label}</label>{children}</div>;
}

// Shared Styles
const fieldLabel: CSSProperties = { display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 5, color: '#475569' };
const pageWrapper: CSSProperties = { maxWidth: 1050, margin: "30px auto", padding: 20, fontFamily: 'sans-serif' };
const topBar: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: 'center', marginBottom: 25 };
const mainTitle: CSSProperties = { fontSize: 26, fontWeight: 800, color: '#1e293b' };
const dashboardGrid: CSSProperties = { display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24 };
const column: CSSProperties = { display: "flex", flexDirection: "column", gap: 24 };
const card: CSSProperties = { background: "#fff", padding: 25, borderRadius: 20, border: "1px solid #f1f5f9", boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const cardTitle: CSSProperties = { fontSize: 17, fontWeight: 800, marginBottom: 20, color: '#334155' };
const grid2: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };
const input: CSSProperties = { width: "100%", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0", boxSizing: 'border-box', fontSize: 14, background: '#f8fafc', outline: 'none' };
const btnPrimary: CSSProperties = { background: "#2563eb", color: "#fff", padding: "12px 24px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 700 };
const btnUpload: CSSProperties = { background: "#f1f5f9", color: "#475569", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12 };
const btnRemove: CSSProperties = { background: "#fff1f2", color: "#e11d48", padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12 };
const tagStyle: CSSProperties = { background: "#eff6ff", color: "#2563eb", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 };
const tagClose: CSSProperties = { border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 16, fontWeight: 900 };
const toastStyle: CSSProperties = { position: "fixed", bottom: 30, right: 30, padding: "16px 24px", borderRadius: 12, color: "white", zIndex: 1000, fontWeight: 700, boxShadow: '0 10px 15px rgba(0,0,0,0.1)' };
const logoPreviewBox: CSSProperties = { width: 90, height: 90, borderRadius: 12, background: '#f8fafc', border: '2px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' };
const coverPreviewBox: CSSProperties = { width: '100%', height: 110, borderRadius: 12, background: '#f8fafc', border: '2px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' };
const fullImg: CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' };