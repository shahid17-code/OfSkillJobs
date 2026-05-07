// app/candidate/[id]/page.tsx
import CandidateProfileClient from "@/components/CandidateProfileClient";
import ProtectedRoute from "@/components/ProtectedRoute";

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ProtectedRoute role="company">
      <CandidateProfileClient candidateId={id} />
    </ProtectedRoute>
  );
}