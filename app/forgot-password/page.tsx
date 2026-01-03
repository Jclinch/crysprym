"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: err } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo,
      });
      if (err) {
        setError(err.message || "Failed to send reset email.");
      } else {
        setMessage(
          "If an account exists for this email, we've sent a password reset link. Please check your inbox."
        );
      }
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e !== null && 'message' in e
            ? String((e as { message: unknown }).message)
            : 'Unexpected error. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* LEFT IMAGE PANEL (matches sign-in style) */}
      <div className="hidden lg:flex lg:w-[50%] items-center justify-center px-10">
        <div className="w-[692px] h-[898px] rounded-4xl shadow-xl overflow-hidden border border-[#E6E7EB] bg-white">
          <Image
            src="/illustrator.png"
            alt="Illustrator Image"
            width={692}
            height={998}
            className="object-cover"
          />
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-[50%] flex items-center justify-center">
        <div className="w-full max-w-[602px]">
          {/* LOGO */}
          <div className="-ml-9">
            <Image src="/logo.png" alt="cryspryms Pro Logo" width={160} height={160} />
          </div>

          {/* HEADINGS */}
          <div className="mb-7">
            <h1 className="text-[28px] font-bold text-black mb-2">Forgot Password</h1>
            <p className="text-[14px] text-gray-500 leading-relaxed">
              Enter your email and we’ll send you a reset link.
            </p>
          </div>

          {/* ALERTS */}
          {message && (
            <div className="mb-5 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-gray-950 mb-2">Email</label>
              <div className="relative">
                <svg
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-800 w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <input
                  className="w-full pl-11 pr-4 h-11 text-[14px] bg-white border rounded-[10px] border-gray-300 transition-all focus:ring-2 focus:ring-[#3B3E56] focus:border-transparent"
                  placeholder="olivia@untitled.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[50px] bg-linear-to-r from-[#3B3E56] to-[#14151c] hover:from-[#14151c] hover:to-[#3B3E56] text-white font-semibold rounded-[10px] shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-60"
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <p className="mt-8 text-center text-[14px] text-gray-600">
            Remembered your password?{" "}
            <Link href="/signin" className="text-[#3B3E56] font-semibold hover:text-[#14151c]">
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
