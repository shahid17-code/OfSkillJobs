// app/privacy/page.tsx
export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-500">Last updated: April 21, 2026</p>
        </div>

        {/* Introduction */}
        <div className="mb-8">
          <p className="text-gray-700 leading-relaxed">
            At OfSkillJob ("we," "our," or "us"), your privacy matters. This Privacy Policy explains 
            how we collect, use, disclose, and safeguard your information when you use our platform, 
            website, and services (collectively, the "Service").
          </p>
        </div>

        {/* Section 1 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Information We Collect</h2>
          
          <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">1.1 Personal Information You Provide</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
            <li><strong>Account Information:</strong> Name, email address, password, profile picture, username, role (developer/company).</li>
            <li><strong>Profile Information:</strong> Bio, headline, location, phone number, skills, languages, work experience, education, intro video URL, GitHub/LinkedIn/website links.</li>
            <li><strong>Application Data:</strong> Resume/CV uploads, Google Drive links, cover letters, job applications, and communication notes.</li>
            <li><strong>Project Submissions:</strong> Challenge solutions, code repositories, project descriptions.</li>
            <li><strong>Communications:</strong> Messages sent through the platform, support inquiries.</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">1.2 Automatically Collected Information</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
            <li><strong>Usage Data:</strong> Pages visited, time spent, clicks, scrolls, and interactions.</li>
            <li><strong>Device & Browser:</strong> IP address, browser type, operating system, device identifiers.</li>
            <li><strong>Location Data:</strong> Approximate location derived from IP address.</li>
            <li><strong>Cookies & Tracking:</strong> We use cookies and similar technologies (see Section 7).</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">1.3 Information from Third Parties</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li><strong>Google OAuth:</strong> When you sign up with Google, we receive your name, email address, and profile picture (subject to your Google privacy settings).</li>
            <li><strong>Google Drive (optional):</strong> If you link a Google Drive folder for job applications, we access only the files you choose to share.</li>
            <li><strong>GitHub/LinkedIn (optional):</strong> Public profile data from links you provide.</li>
          </ul>
        </div>

        {/* Section 2 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li>Provide, operate, and improve the Service.</li>
            <li>Match developers with relevant job opportunities.</li>
            <li>Process job applications and share them with companies you apply to.</li>
            <li>Track application status (submitted, reviewed, shortlisted, rejected).</li>
            <li>Calculate profile completion scores, points, and award badges.</li>
            <li>Display leaderboards and public developer profiles (for companies).</li>
            <li>Send notifications about application updates, new jobs, or challenges.</li>
            <li>Prevent fraud, abuse, and unauthorized access.</li>
            <li>Analyze usage trends to improve user experience.</li>
            <li>Comply with legal obligations.</li>
          </ul>
        </div>

        {/* Section 3 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Legal Basis for Processing (GDPR Compliance)</h2>
          <p className="text-gray-700 mb-3">If you are in the European Economic Area (EEA), we process your information based on:</p>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li><strong>Contract performance:</strong> To provide our services under your user agreement.</li>
            <li><strong>Legitimate interests:</strong> To improve our platform, prevent fraud, and market similar services.</li>
            <li><strong>Consent:</strong> For optional features (e.g., Google Drive linking, cookies).</li>
            <li><strong>Legal obligation:</strong> To comply with applicable laws.</li>
          </ul>
        </div>

        {/* Section 4 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Sharing Your Information</h2>
          <p className="text-gray-700 mb-3">We do not sell your personal information. We share data only in these circumstances:</p>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li><strong>With Companies You Apply To:</strong> When you submit a job application, your profile (name, skills, experience, resume, etc.) is shared with that company.</li>
            <li><strong>Service Providers:</strong> Supabase (database & auth), Vercel (hosting), Google Analytics (analytics). These providers are contractually bound to protect your data.</li>
            <li><strong>Legal Requirements:</strong> If required by law, court order, or to protect our rights/safety.</li>
            <li><strong>Business Transfers:</strong> In case of merger, acquisition, or asset sale (you will be notified).</li>
            <li><strong>With Your Consent:</strong> For any other purpose you explicitly approve.</li>
          </ul>
        </div>

        {/* Section 5 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Public Information</h2>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li><strong>Developer Profiles:</strong> Companies can view your public profile at <code className="bg-gray-100 px-1 rounded">/candidate/[id]</code> (includes name, skills, experience, projects, bio).</li>
            <li><strong>Company Profiles:</strong> Developers can view company profiles at <code className="bg-gray-100 px-1 rounded">/company/[username]</code>.</li>
            <li><strong>Leaderboard:</strong> Your points, username, and projects count are publicly visible.</li>
            <li><strong>Challenge Submissions:</strong> If marked public, other users can view your project submissions.</li>
          </ul>
          <p className="text-gray-700 mt-3">You can control what appears on your public profile by editing your profile settings.</p>
        </div>

        {/* Section 6 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Retention</h2>
          <p className="text-gray-700 mb-3">We retain your information as long as your account is active. If you delete your account, we will delete or anonymize your personal information within 30 days, except:</p>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li>Job applications already submitted to companies (companies may retain copies).</li>
            <li>Information we must keep for legal, tax, or fraud prevention purposes.</li>
          </ul>
        </div>

        {/* Section 7 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Cookies & Tracking Technologies</h2>
          <p className="text-gray-700 mb-3">We use cookies and similar technologies to:</p>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li>Keep you logged in (session cookies).</li>
            <li>Remember your preferences (e.g., dark/light mode).</li>
            <li>Analyze traffic via Google Analytics (see Section 8).</li>
            <li>Prevent fraud and improve security.</li>
          </ul>
          <p className="text-gray-700 mt-3">You can disable cookies in your browser settings, but some features may not work properly.</p>
        </div>

        {/* Section 8 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Google Analytics</h2>
          <p className="text-gray-700 mb-3">We use Google Analytics to understand how users interact with our platform. Google Analytics collects:</p>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li>Pages visited, time on site, clicks, scroll depth.</li>
            <li>Approximate geographic location (city/country level).</li>
            <li>Device and browser information.</li>
          </ul>
          <p className="text-gray-700 mt-3">Google Analytics does <strong>not</strong> collect your name, email, or other direct identifiers. You can opt out by installing the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Analytics Opt-out Browser Add-on</a>.</p>
        </div>

        {/* Section 9 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Your Rights (GDPR, CCPA, and Other Privacy Laws)</h2>
          <p className="text-gray-700 mb-3">Depending on your location, you may have the right to:</p>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li><strong>Access:</strong> Request a copy of your personal data.</li>
            <li><strong>Correction:</strong> Update inaccurate or incomplete information.</li>
            <li><strong>Deletion:</strong> Request deletion of your data (subject to legal exceptions).</li>
            <li><strong>Restriction:</strong> Limit how we use your data.</li>
            <li><strong>Portability:</strong> Receive your data in a machine-readable format.</li>
            <li><strong>Objection:</strong> Opt out of certain processing (e.g., direct marketing).</li>
            <li><strong>Withdraw Consent:</strong> For optional features (e.g., cookies).</li>
          </ul>
          <p className="text-gray-700 mt-3">To exercise these rights, contact us at <strong className="text-blue-600">ofskilljobs@gmail.com</strong>. We will respond within 30 days.</p>
        </div>

        {/* Section 10 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Data Security</h2>
          <p className="text-gray-700 mb-3">We implement industry-standard security measures, including:</p>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li>Encryption in transit (TLS/SSL) and at rest (Supabase).</li>
            <li>Row Level Security (RLS) policies on Supabase to prevent unauthorized access.</li>
            <li>Regular security updates and dependency scanning.</li>
            <li>Password hashing (bcrypt).</li>
          </ul>
          <p className="text-gray-700 mt-3">However, no method of transmission over the internet is 100% secure. You use the Service at your own risk.</p>
        </div>

        {/* Section 11 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Children's Privacy</h2>
          <p className="text-gray-700">The Service is not intended for individuals under 16. We do not knowingly collect personal information from children under 16. If you believe a child has provided us with data, please contact us, and we will delete it.</p>
        </div>

        {/* Section 12 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Third-Party Links</h2>
          <p className="text-gray-700">Our platform may contain links to external sites (GitHub, LinkedIn, Google Drive, etc.). We are not responsible for their privacy practices. Please review their privacy policies before sharing data.</p>
        </div>

        {/* Section 13 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Changes to This Privacy Policy</h2>
          <p className="text-gray-700 mb-3">We may update this policy from time to time. We will notify you of material changes by:</p>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li>Posting the new policy on this page with an updated "Last updated" date.</li>
            <li>Sending an email to registered users (if you have provided one).</li>
            <li>Displaying a notice on the platform.</li>
          </ul>
          <p className="text-gray-700 mt-3">Your continued use of the Service after changes constitutes acceptance of the updated policy.</p>
        </div>

        {/* Section 14 - Contact */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Contact Us</h2>
          <p className="text-gray-700">If you have questions, concerns, or requests regarding this Privacy Policy, please contact us:</p>
          <ul className="list-none pl-0 mt-2 space-y-1 text-gray-700">
            <li>📧 <strong>Email:</strong> ofskilljobs@gmail.com</li>
            <li>🌐 <strong>Website:</strong> ofskilljobs.vercel.app</li>
          </ul>
        </div>

        {/* Footer Note */}
        <div className="border-t border-gray-200 pt-6 mt-6 text-center text-gray-400 text-sm">
          © 2026 OfSkillJob. All rights reserved.
        </div>
      </div>
    </div>
  );
}