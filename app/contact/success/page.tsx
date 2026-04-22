// app/contact/success/page.tsx
import Link from 'next/link';

export default function ContactSuccess() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-6xl mb-4">📧</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Message Sent!</h1>
        <p className="text-gray-600 mb-6">
          Thank you for reaching out. We've received your message and will get back to you within 24‑48 hours.
        </p>
        <Link
          href="/"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}