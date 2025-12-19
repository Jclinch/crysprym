// ============================================
// FILE: app/signin/page.tsx
// Path: /signin
// Sign In Page with pixel-perfect Bold Reach design
// ============================================
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SignInSchema } from "@/lib/auth";
import Image from "next/image";

export default function SignInPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    const result = SignInSchema.safeParse({
      email: formData.email,
      password: formData.password,
      rememberMe,
    });

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        newErrors[err.path[0] as string] = err.message;
      });
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    const res = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.data),
    });
    // If the API responded with a redirect, follow it client-side
    const contentType = res.headers.get("content-type") || "";
    if (res.redirected) {
      // NextResponse.redirect returns the final URL in res.url
      router.replace(res.url);
      return;
    }

    // If not redirected, expect JSON
    if (!res.ok) {
      // Try to parse JSON error; if response is HTML, show generic error
      let message = "Sign in failed";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        message = data.error || message;
      }
      setErrors({ submit: message });
      setIsLoading(false);
      return;
    }

    if (contentType.includes("application/json")) {
      const data = await res.json();
      const userRole = data.user?.role || 'user';
      if (userRole === 'admin') {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }
    } else {
      // Non-JSON successful response; fallback to dashboard
      router.push("/dashboard");
    }
  };

  const handleGoogle = () => {};
  const handleApple = () => {};

  return (
    <div className="min-h-screen flex bg-white">
      {/* LEFT IMAGE PANEL (pixel perfect proportions) */}
      <div className="hidden lg:flex lg:w-[50%]  items-center justify-center px-10">
        <div className="w-[692px] h-[898px] rounded-4xl shadow-xl overflow-hidden border border-[#E6E7EB] bg-white">
          <Image
            src="/illustrator.png"
            alt="Illustrator Image"
            width={692}
            height={998}
            className=" object-cover"
          />
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-[50%] flex items-center justify-center">
        <div className="w-full max-w-[602px]">
          {/* LOGO */}
          <div className="-ml-9">
            <Image
              src="/logo.png"
              alt="cryspryms Pro Logo"
              width={160}
              height={160}
            />
          </div>

          {/* HEADINGS */}
          <div className="mb-7">
            <h1 className="text-[28px] font-bold text-black mb-2">
              Hello, Welcome
            </h1>
            <p className="text-[14px] text-gray-500 leading-relaxed">
              Lets log in now to access exclusive logistic service
            </p>
          </div>

          {/* GLOBAL ERROR */}
          {errors.submit && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              {errors.submit}
            </div>
          )}

          {/* FORM FIELDS */}
          <div className="space-y-5">
            {/* EMAIL */}
            <div>
              <label className="block text-[13px] font-medium text-gray-950 mb-2">
                Email
              </label>

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
                  className={`w-full pl-11 pr-4 h-[44px] text-[14px] bg-white border rounded-[10px] transition-all focus:ring-2 focus:ring-[#3B3E56] focus:border-transparent ${
                    errors.email
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300"
                  }`}
                  placeholder="olivia@untitled.com"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-[13px] font-medium text-gray-950 mb-2">
                Password
              </label>

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
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>

                <input
                  className={`w-full pl-11 pr-12 h-[44px] text-[14px] border rounded-[10px] transition-all focus:ring-2 focus:ring-[#3B3E56] ${
                    errors.password
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300"
                  }`}
                  type={showPassword ? "text" : "password"}
                  placeholder="***********"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                />

                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {showPassword ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    )}
                  </svg>
                </button>
              </div>

              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            {/* REMEMBER + FORGOT */}
            <div className="flex items-center justify-between ">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 border-2 rounded-full ${
                    rememberMe
                      ? "bg-[#3B3E56] border-[#3B3E56]"
                      : "border-gray-300"
                  } relative`}
                >
                  {rememberMe && (
                    <svg
                      className="w-3 h-3 text-white absolute top-0.6 left-0.6 "
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span className="ml-2 text-[13px] text-gray-700">
                  Remember me
                </span>
              </label>

              <Link
                href="/forgot-password"
                className="text-[13px] font-medium text-[#3B3E56] hover:text-orange-800 cursor-pointer"
              >
                Forgot Password?
              </Link>
            </div>

            {/* SIGN IN BUTTON */}
            <button
              type="submit"
              onClick={handleSubmit}
              className="w-full h-[50px] bg-linear-to-r from-[#3B3E56] to-[#14151c] hover:from-[#14151c] hover:to-[#3B3E56] text-white font-semibold rounded-[10px] shadow-sm hover:shadow-md transition-all"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
          </div>

         

          {/* SIGN UP LINK */}
          <p className="mt-8 text-center text-[14px] text-gray-600">
            Don’t have an account?{" "}
            <Link
              href="/signup"
              className="text-[#3B3E56] font-semibold hover:text-[#14151c] cursor-pointer"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
