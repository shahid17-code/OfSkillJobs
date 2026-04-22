// app/about/page.tsx
export default function AboutUs() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">About Us</h1>
          <p className="text-gray-500">Show Skills. Get Hired.</p>
        </div>

        {/* Our Mission */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Our Mission</h2>
          <p className="text-gray-700 leading-relaxed">
            At OfSkillJob, we believe hiring should be based on what you can actually do, not just 
            what's written on a resume. Our mission is to connect talented developers with companies 
            through skill-based assessments, real-world projects, and transparent hiring processes.
          </p>
        </div>

        {/* What We Do */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">What We Do</h2>
          <p className="text-gray-700 mb-3">
            OfSkillJob is a two-sided platform that helps developers showcase their abilities and 
            companies find the right talent. Here's how:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li><strong>For Developers:</strong> Build a CV-style profile, complete skill challenges, earn points and badges, and apply to jobs that match your skills.</li>
            <li><strong>For Companies:</strong> Post jobs with custom tasks, review candidate profiles and submissions, and shortlist the best talent.</li>
            <li><strong>Real-time tracking:</strong> Both sides can track applications, view profiles, and communicate seamlessly.</li>
          </ul>
        </div>

        {/* Why Choose Us */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Why Choose OfSkillJob</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <div>
              <h3 className="font-medium text-gray-800">🎯 Skill-Based Hiring</h3>
              <p className="text-sm text-gray-600">We focus on demonstrated skills, not just degrees or years of experience.</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">📊 Real-time Tracking</h3>
              <p className="text-sm text-gray-600">Know exactly where your application stands at every step.</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">🏆 Gamified Learning</h3>
              <p className="text-sm text-gray-600">Earn points and badges by completing challenges and building projects.</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">🔒 Privacy First</h3>
              <p className="text-sm text-gray-600">Your data is secure with Row Level Security and encryption.</p>
            </div>
          </div>
        </div>

        {/* Our Values */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Our Values</h2>
          <ul className="list-disc pl-6 space-y-1 text-gray-700">
            <li><strong>Transparency:</strong> Clear processes, honest communication, and no hidden fees.</li>
            <li><strong>Meritocracy:</strong> Opportunities based on ability and effort, not connections.</li>
            <li><strong>Community:</strong> We're building a platform where developers help each other grow.</li>
            <li><strong>Innovation:</strong> Constantly improving our tools to make hiring better for everyone.</li>
          </ul>
        </div>

        {/* Who We Are */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Who We Are</h2>
          <p className="text-gray-700">
            OfSkillJob was founded by a team of developers and recruiters who saw the gap between 
            traditional hiring and actual skill assessment. We're passionate about creating equal 
            opportunities for talent worldwide, regardless of background or formal education.
          </p>
          <p className="text-gray-700 mt-3">
            Today, we're a small but dedicated team working remotely to make skill-based hiring the 
            new standard. We're proud to serve a growing community of developers and companies who 
            believe in fair, transparent recruitment.
          </p>
        </div>

        {/* Contact */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Get in Touch</h2>
          <p className="text-gray-700">Have questions, feedback, or partnership ideas? We'd love to hear from you.</p>
          <ul className="list-none pl-0 mt-2 space-y-1 text-gray-700">
            <li>📧 <strong>Email:</strong> ofskilljobs@gmail.com</li>
            <li>🌐 <strong>Website:</strong> ofskilljobs.vercel.app</li>
          </ul>
        </div>

        {/* Footer Note */}
        <div className="border-t border-gray-200 pt-6 mt-6 text-center text-gray-400 text-sm">
          © 2026 OfSkillJob - Show Skills. Get Hired.
        </div>
      </div>
    </div>
  );
}