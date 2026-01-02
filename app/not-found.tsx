import Image from 'next/image';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl text-center">
        <Image
          src="/feeling.png"
          alt="Page not found"
          width={520}
          height={360}
          className="mx-auto mb-8 h-auto w-full max-w-md"
          priority
        />

        <h1 className="text-3xl sm:text-4xl font-bold text-[#0F2940] mb-3">404 — Page Not Found</h1>
        <p className="text-[#475569] mb-8">
          The page you’re looking for doesn’t exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center h-11 px-6 rounded-md bg-black text-white font-semibold hover:bg-[#29292a]"
          >
            Go Home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center h-11 px-6 rounded-md border border-[#E2E8F0] bg-white text-[#0F2940] font-semibold hover:bg-[#F8FAFC]"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
