// app/terms/page.tsx
export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-500">Last updated: April 21, 2026</p>
        </div>

        {/* Introduction */}
        <div className="mb-8">
          <p className="text-gray-700 leading-relaxed">
            Welcome to OfSkillJob ("we," "our," or "us"). By accessing or using our platform, website, 
            and services (collectively, the "Service"), you agree to be bound by these Terms of Service 
            ("Terms"). If you do not agree to these Terms, please do not use the Service.
          </p>
        </div>

        {/* Section 1 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Eligibility</h2>
          <p className="text-gray-700 mb-3">To use the Service, you must:</p>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li>Be at least 16 years old (or the age of majority in your jurisdiction).</li>
            <li>Have the legal capacity to enter into a binding agreement.</li>
            <li>Provide accurate, current, and complete information during registration.</li>
            <li>Not be prohibited from using the Service under applicable laws.</li>
          </ul>
        </div>

        {/* Section 2 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Account Registration</h2>
          <p className="text-gray-700 mb-3">When you create an account with us, you agree to:</p>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li>Provide truthful and accurate information.</li>
            <li>Maintain the security and confidentiality of your login credentials.</li>
            <li>Notify us immediately of any unauthorized use of your account.</li>
            <li>Accept responsibility for all activities that occur under your account.</li>
            <li>Not create multiple accounts or impersonate others.</li>
          </ul>
          <p className="text-gray-700 mt-3">We reserve the right to suspend or terminate accounts that violate these Terms.</p>
        </div>

        {/* Section 3 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. User Roles</h2>
          
          <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">3.1 Developers</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
            <li>You can create a professional profile showcasing your skills, experience, and projects.</li>
            <li>You can apply to job postings and submit challenge solutions.</li>
            <li>You grant companies permission to view your public profile when you apply to their jobs.</li>
            <li>You are responsible for the accuracy of information in your profile.</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">3.2 Companies</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li>You can post job opportunities and review applications.</li>
            <li>You agree to provide accurate job descriptions, salary ranges, and company information.</li>
            <li>You will not post fake jobs, collect applicant data for unauthorized purposes, or discriminate illegally.</li>
            <li>You are responsible for verifying candidate qualifications and conducting your own background checks.</li>
          </ul>
        </div>

        {/* Section 4 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Job Applications</h2>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li>When you apply to a job, your profile information and application materials are shared with the company.</li>
            <li>Companies may view, download, and store your application data for recruitment purposes.</li>
            <li>We do not guarantee that you will receive a response or job offer from any company.</li>
            <li>We are not responsible for hiring decisions made by companies.</li>
            <li>Companies may update your application status (reviewed, shortlisted, rejected).</li>
          </ul>
        </div>

        {/* Section 5 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Prohibited Conduct</h2>
          <p className="text-gray-700 mb-3">You agree NOT to:</p>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li>Post false, misleading, or fraudulent information.</li>
            <li>Impersonate another person or entity.</li>
            <li>Upload malware, viruses, or harmful code.</li>
            <li>Scrape, copy, or collect user data without permission.</li>
            <li>Spam, harass, or abuse other users.</li>
            <li>Post illegal content or promote illegal activities.</li>
            <li>Attempt to bypass our security measures or access unauthorized areas.</li>
            <li>Use the Service for any unlawful purpose.</li>
          </ul>
        </div>

        {/* Section 6 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Content Ownership and License</h2>
          
          <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">6.1 Your Content</h3>
          <p className="text-gray-700 mb-3">
            You retain ownership of all content you post (profile information, resumes, project submissions, etc.). 
            By posting content, you grant us a non-exclusive, worldwide, royalty-free license to:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li>Host, store, and display your content on the Service.</li>
            <li>Share your content with companies when you apply to their jobs.</li>
            <li>Use aggregated, anonymized data to improve the Service.</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">6.2 Our Content</h3>
          <p className="text-gray-700">
            All content provided by us (designs, logos, text, graphics, software) is owned by OfSkillJob 
            and protected by copyright and intellectual property laws. You may not copy, modify, or 
            distribute our content without permission.
          </p>
        </div>

        {/* Section 7 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Points, Badges, and Gamification</h2>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li>Points are awarded for completing actions (profile completion, job applications, challenge submissions, login streaks).</li>
            <li>Badges are earned automatically when reaching point milestones.</li>
            <li>Points and badges have no monetary value and cannot be exchanged for real currency.</li>
            <li>We reserve the right to adjust point values or badge criteria at any time.</li>
            <li>We may remove points or badges if we detect fraudulent activity.</li>
          </ul>
        </div>

        {/* Section 8 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Termination and Suspension</h2>
          <p className="text-gray-700 mb-3">We may terminate or suspend your account immediately, without notice, if you:</p>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li>Violate these Terms of Service.</li>
            <li>Engage in fraudulent or harmful behavior.</li>
            <li>Post illegal or prohibited content.</li>
          </ul>
          <p className="text-gray-700 mt-3">
            You may delete your account at any time by contacting us. Upon termination, your profile 
            and data will be deleted within 30 days, except for information we must retain for legal reasons.
          </p>
        </div>

        {/* Section 9 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Disclaimer of Warranties</h2>
          <p className="text-gray-700">
            The Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, 
            either express or implied. We do not warrant that:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-700 mt-2">
            <li>The Service will be uninterrupted, secure, or error-free.</li>
            <li>You will receive a job offer through the platform.</li>
            <li>The information provided by users is accurate or complete.</li>
            <li>Any errors will be corrected.</li>
          </ul>
        </div>

        {/* Section 10 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Limitation of Liability</h2>
          <p className="text-gray-700">
            To the maximum extent permitted by law, OfSkillJob and its affiliates shall not be liable for:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-700 mt-2">
            <li>Any indirect, incidental, special, consequential, or punitive damages.</li>
            <li>Loss of profits, data, or business opportunities.</li>
            <li>Damages arising from your use or inability to use the Service.</li>
            <li>Any conduct or content of third parties on the platform.</li>
          </ul>
          <p className="text-gray-700 mt-3">
            Our total liability to you shall not exceed the amount you paid us (if any) or $100, 
            whichever is less.
          </p>
        </div>

        {/* Section 11 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Indemnification</h2>
          <p className="text-gray-700">
            You agree to indemnify and hold harmless OfSkillJob, its officers, employees, and agents 
            from any claims, damages, losses, or expenses (including legal fees) arising from:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-700 mt-2">
            <li>Your use of the Service.</li>
            <li>Your violation of these Terms.</li>
            <li>Your violation of any third-party rights (e.g., intellectual property, privacy).</li>
            <li>Any content you post on the platform.</li>
          </ul>
        </div>

        {/* Section 12 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Third-Party Links</h2>
          <p className="text-gray-700">
            The Service may contain links to third-party websites (GitHub, LinkedIn, Google Drive, etc.). 
            We are not responsible for their content, privacy practices, or terms. You access them at your own risk.
          </p>
        </div>

        {/* Section 13 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Modifications to the Service</h2>
          <p className="text-gray-700">
            We reserve the right to modify, suspend, or discontinue any part of the Service at any time, 
            without notice. We are not liable to you for any such changes.
          </p>
        </div>

        {/* Section 14 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Changes to These Terms</h2>
          <p className="text-gray-700 mb-3">
            We may update these Terms from time to time. We will notify you of material changes by:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li>Posting the new Terms on this page with an updated "Last updated" date.</li>
            <li>Sending an email to registered users (if you have provided one).</li>
            <li>Displaying a notice on the platform.</li>
          </ul>
          <p className="text-gray-700 mt-3">Your continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
        </div>

        {/* Section 15 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">15. Governing Law</h2>
          <p className="text-gray-700">
            These Terms shall be governed by and construed in accordance with the laws of India, 
            without regard to its conflict of law provisions. Any disputes arising under these Terms 
            shall be subject to the exclusive jurisdiction of the courts in India.
          </p>
        </div>

        {/* Section 16 - Contact */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">16. Contact Us</h2>
          <p className="text-gray-700">If you have questions about these Terms, please contact us:</p>
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