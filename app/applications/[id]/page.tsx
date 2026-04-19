"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";

type Application = {
  id: string;
  status: string;
  created_at: string;
  drive_opened_at: string | null;
  resume_opened_at: string | null;
  profile_viewed_at: string | null;
  last_communication_at: string | null;
  communication_note: string | null;
  job_id: string;
  job?: {
    title: string;
    slug: string;
    company?: {
      company_name: string;
      logo_url: string | null;
    };
  };
};

export default function ApplicationsByIdPage() {
  return (
    <ProtectedRoute role="developer">
      <ApplicationsByIdInner />
    </ProtectedRoute>
  );
}

function ApplicationsByIdInner() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) loadApplications();
  }, [userId]);

  async function loadApplications() {
    setLoading(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    const currentUser = userData?.user;
    if (currentUser?.id !== userId) {
      setError("You can only view your own applications.");
      setLoading(false);
      return;
    }

    const { data: rawApps, error: rawError } = await supabase
      .from("job_applications")
      .select("*")
      .eq("applicant_id", userId)
      .order("created_at", { ascending: false });

    if (rawError) {
      setError("Failed to load applications.");
      setLoading(false);
      return;
    }

    if (!rawApps || rawApps.length === 0) {
      setApplications([]);
      setLoading(false);
      return;
    }

    const jobIds = rawApps.map(app => app.job_id).filter(Boolean);
    const { data: jobsData } = await supabase
      .from("jobs")
      .select("id, title, slug, company_id")
      .in("id", jobIds);
    
    const companyIds = jobsData?.map(job => job.company_id).filter(Boolean) || [];
    const { data: companiesData } = await supabase
      .from("users")
      .select("id, company_name, logo_url")
      .in("id", companyIds);

    const jobsMap = new Map(jobsData?.map(j => [j.id, j]) || []);
    const companiesMap = new Map(companiesData?.map(c => [c.id, c]) || []);

    const enrichedApps = rawApps.map(app => {
      const job = jobsMap.get(app.job_id);
      const company = job ? companiesMap.get(job.company_id) : null;
      return {
        ...app,
        job: job ? {
          title: job.title,
          slug: job.slug,
          company: company ? {
            company_name: company.company_name,
            logo_url: company.logo_url,
          } : undefined,
        } : undefined,
      };
    });

    setApplications(enrichedApps as any);
    setLoading(false);
  }

  const getStatusMessage = (status: string, isShortlisted: boolean, isRejected: boolean) => {
    if (isShortlisted) {
      return {
        title: "🎉 Congratulations! You've been shortlisted.",
        body: "The company is impressed with your skills. Expect further communication regarding next steps (interview, test, or call).",
        color: "text-green-700",
        bg: "bg-green-50",
        border: "border-green-200"
      };
    }
    if (isRejected) {
      return {
        title: "💔 Not selected this time.",
        body: "We know this isn't easy, but every rejection is a redirection. Keep improving your skills – the right opportunity is waiting for you.",
        color: "text-red-700",
        bg: "bg-red-50",
        border: "border-red-200"
      };
    }
    if (status === "reviewed") {
      return {
        title: "📋 Your application has been reviewed.",
        body: "The recruiter has evaluated your profile. You're still in consideration – a decision is coming soon.",
        color: "text-purple-700",
        bg: "bg-purple-50",
        border: "border-purple-200"
      };
    }
    return {
      title: "⏳ Application submitted successfully!",
      body: "Your application is now with the company. They will review your skills and task submission. We'll notify you as soon as there's an update.",
      color: "text-yellow-700",
      bg: "bg-yellow-50",
      border: "border-yellow-200"
    };
  };

  const formatDate = (date: string) => new Date(date).toLocaleString();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  const totalApps = applications.length;
  const reviewedApps = applications.filter(a => a.status === "reviewed").length;
  const shortlistedApps = applications.filter(a => a.status === "shortlisted").length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans">
      {/* Header with stats */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl shadow-xl p-6 mb-8 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">📬 Application Tracker</h1>
            <p className="text-blue-100 mt-1 text-sm">Real‑time updates on every job you've applied for</p>
          </div>
          <button
            onClick={loadApplications}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-5 py-2 rounded-xl text-sm font-medium transition"
          >
            🔄 Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{totalApps}</div>
            <div className="text-sm text-blue-100">Total Applications</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{reviewedApps}</div>
            <div className="text-sm text-blue-100">Reviewed</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{shortlistedApps}</div>
            <div className="text-sm text-blue-100">Shortlisted</div>
          </div>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-gray-400 text-5xl mb-4">📭</div>
          <h3 className="text-xl font-semibold text-gray-700">No applications yet</h3>
          <p className="text-gray-500 mt-2">You haven't applied to any jobs. Start exploring!</p>
          <button
            onClick={() => router.push("/jobs")}
            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
          >
            Browse Jobs
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {applications.map((app) => {
            const isRejected = app.status === "rejected";
            const isShortlisted = app.status === "shortlisted";
            const statusMsg = getStatusMessage(app.status, isShortlisted, isRejected);
            
            // Determine step completion for horizontal timeline
            const steps = ["Submitted", "Reviewed", "Decision"];
            let currentStep = 0;
            if (app.status === "reviewed") currentStep = 1;
            if (isShortlisted || isRejected) currentStep = 2;

            return (
              <div key={app.id} className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden transition-all hover:shadow-lg">
                {/* Header with company info */}
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div className="flex items-center gap-4">
                      {app.job?.company?.logo_url ? (
                        <img
                          src={app.job.company.logo_url}
                          alt="Logo"
                          className="w-12 h-12 rounded-full object-cover border shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                          {app.job?.company?.company_name?.charAt(0) || "C"}
                        </div>
                      )}
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">{app.job?.title || "Unknown Job"}</h2>
                        <p className="text-gray-500 text-sm">{app.job?.company?.company_name || "Unknown Company"}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${statusMsg.bg} ${statusMsg.color} border ${statusMsg.border}`}>
                      {app.status === "shortlisted" ? "⭐ Shortlisted" :
                       app.status === "reviewed" ? "📋 Reviewed" :
                       app.status === "rejected" ? "❌ Rejected" :
                       "⏳ Submitted"}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">📅 Applied on {formatDate(app.created_at)}</p>
                </div>

                {/* Horizontal timeline */}
                <div className="px-6 py-5 bg-gray-50 border-b border-gray-100">
                  <div className="relative flex items-center justify-between">
                    {steps.map((step, idx) => {
                      let stepClass = "flex flex-col items-center relative z-10";
                      let circleClass = "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all";
                      let lineClass = "";
                      let isActive = idx <= currentStep;
                      
                      if (isActive && idx === currentStep && !isRejected && !isShortlisted && app.status !== "reviewed") {
                        circleClass += " bg-blue-500 text-white ring-4 ring-blue-200";
                      } else if (isActive && idx === currentStep && app.status === "reviewed") {
                        circleClass += " bg-purple-500 text-white ring-4 ring-purple-200";
                      } else if (isActive && idx === currentStep && isShortlisted) {
                        circleClass += " bg-green-500 text-white ring-4 ring-green-200";
                      } else if (isActive && idx === currentStep && isRejected) {
                        circleClass += " bg-red-500 text-white ring-4 ring-red-200";
                      } else if (isActive && idx < currentStep) {
                        circleClass += " bg-green-500 text-white";
                      } else {
                        circleClass += " bg-gray-300 text-gray-500";
                      }
                      
                      if (idx < steps.length - 1) {
                        lineClass = "absolute h-0.5 bg-gray-300 top-4 left-1/2 transform -translate-x-1/2";
                        if (idx < currentStep) lineClass += " bg-green-500";
                        else if (idx === currentStep && currentStep < 2 && !isRejected && !isShortlisted) lineClass += " bg-blue-300";
                      }
                      
                      return (
                        <div key={idx} className="flex-1 relative">
                          <div className={stepClass}>
                            <div className={circleClass}>
                              {idx < currentStep ? "✓" : idx + 1}
                            </div>
                            <div className="mt-2 text-xs font-medium text-gray-600">{step}</div>
                          </div>
                          {idx < steps.length - 1 && (
                            <div className={`${lineClass} w-[calc(100%-2rem)] left-1/2 -translate-x-1/2`} style={{ width: "calc(100% - 2rem)" }}></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-center text-gray-500 mt-4">
                    {currentStep === 0 && "⏳ Your application is in the queue. The recruiter will review it soon."}
                    {currentStep === 1 && "📖 Your application has been reviewed. A decision is coming."}
                    {currentStep === 2 && isShortlisted && "🎉 Shortlisted! Next steps will be communicated."}
                    {currentStep === 2 && isRejected && "😔 Not selected. Don't give up – keep applying!"}
                  </p>
                </div>

                {/* Status message card */}
                <div className={`mx-6 mt-4 p-4 rounded-xl ${statusMsg.bg} border ${statusMsg.border}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{statusMsg.title.split(" ")[0]}</span>
                    <div>
                      <h4 className={`font-bold ${statusMsg.color}`}>{statusMsg.title}</h4>
                      <p className="text-sm text-gray-700 mt-1">{statusMsg.body}</p>
                    </div>
                  </div>
                </div>

                {/* Activity timeline with connecting lines */}
                <div className="p-6">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-5 flex items-center gap-2">
                    <span>📋</span> Activity timeline
                  </h3>
                  <div className="relative pl-6 border-l-2 border-gray-200 ml-2 space-y-6">
                    {/* Application submitted */}
                    <div className="relative">
                      <div className="absolute -left-[29px] top-1 w-4 h-4 rounded-full bg-green-500 ring-4 ring-white"></div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-green-600 text-lg">✅</span>
                          <p className="text-sm font-semibold text-gray-800">Application submitted</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(app.created_at)}</p>
                      </div>
                    </div>

                    {/* Profile viewed */}
                    {app.profile_viewed_at && (
                      <div className="relative">
                        <div className="absolute -left-[29px] top-1 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-white"></div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600 text-lg">👁️</span>
                            <p className="text-sm font-semibold text-gray-800">Profile viewed by company</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{formatDate(app.profile_viewed_at)}</p>
                        </div>
                      </div>
                    )}

                    {/* Drive opened */}
                    {app.drive_opened_at && (
                      <div className="relative">
                        <div className="absolute -left-[29px] top-1 w-4 h-4 rounded-full bg-indigo-500 ring-4 ring-white"></div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-indigo-600 text-lg">📂</span>
                            <p className="text-sm font-semibold text-gray-800">Google Drive folder opened</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{formatDate(app.drive_opened_at)}</p>
                        </div>
                      </div>
                    )}

                    {/* Resume viewed */}
                    {app.resume_opened_at && (
                      <div className="relative">
                        <div className="absolute -left-[29px] top-1 w-4 h-4 rounded-full bg-purple-500 ring-4 ring-white"></div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-purple-600 text-lg">📄</span>
                            <p className="text-sm font-semibold text-gray-800">Resume viewed/downloaded</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{formatDate(app.resume_opened_at)}</p>
                        </div>
                      </div>
                    )}

                    {/* Application reviewed */}
                    {app.status === "reviewed" && (
                      <div className="relative">
                        <div className="absolute -left-[29px] top-1 w-4 h-4 rounded-full bg-purple-500 ring-4 ring-white"></div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-purple-600 text-lg">📋</span>
                            <p className="text-sm font-semibold text-gray-800">Application reviewed</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Status updated by company</p>
                        </div>
                      </div>
                    )}

                    {/* Shortlisted */}
                    {isShortlisted && (
                      <div className="relative">
                        <div className="absolute -left-[29px] top-1 w-4 h-4 rounded-full bg-green-600 ring-4 ring-white"></div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-green-600 text-lg">⭐</span>
                            <p className="text-sm font-semibold text-gray-800">Shortlisted!</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Congratulations! Next steps coming soon.</p>
                        </div>
                      </div>
                    )}

                    {/* Rejected */}
                    {isRejected && (
                      <div className="relative">
                        <div className="absolute -left-[29px] top-1 w-4 h-4 rounded-full bg-red-500 ring-4 ring-white"></div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-red-600 text-lg">❌</span>
                            <p className="text-sm font-semibold text-gray-800">Not selected</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">The company has moved forward with other candidates.</p>
                        </div>
                      </div>
                    )}

                    {/* Communication from company */}
                    {app.last_communication_at && (
                      <div className="relative">
                        <div className="absolute -left-[29px] top-1 w-4 h-4 rounded-full bg-orange-500 ring-4 ring-white"></div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-orange-600 text-lg">📞</span>
                            <p className="text-sm font-semibold text-gray-800">Company contacted you</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{app.communication_note || "No details"}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatDate(app.last_communication_at)}</p>
                        </div>
                      </div>
                    )}

                    {/* No activity yet */}
                    {!app.profile_viewed_at && !app.drive_opened_at && !app.resume_opened_at && app.status !== "reviewed" && !isShortlisted && !isRejected && (
                      <div className="relative opacity-60">
                        <div className="absolute -left-[29px] top-1 w-4 h-4 rounded-full bg-gray-300 ring-4 ring-white"></div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-lg">⏳</span>
                            <p className="text-sm text-gray-500">Awaiting company action</p>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">The recruiter will review your application soon</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl">
                  <button
                    onClick={() => router.push(`/jobs/${app.job?.slug}`)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium transition flex items-center gap-1"
                  >
                    View job details <span>→</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}