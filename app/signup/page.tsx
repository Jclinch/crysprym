// app/signup/page.tsx
// Sign Up Page - app/page-path: /signup
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignUpSchema } from '@/lib/auth';
import Link from 'next/link';
import Image from 'next/image';

export default function SignUpPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGoogle = () => {
    console.log('Google Sign Up');
  };

  const handleApple = () => {
    console.log('Apple Sign Up');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      const result = SignUpSchema.safeParse({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        agreeToTerms,
      });

      if (!result.success) {
        const newErrors: Record<string, string> = {};
        result.error.errors.forEach((error) => {
          const field = error.path[0] as string;
          newErrors[field] = error.message;
        });
        setErrors(newErrors);
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      });

      if (!response.ok) {
        const data = await response.json();
        setErrors({ submit: data.error || 'Sign up failed' });
        setIsLoading(false);
        return;
      }

      router.push('/signin');
    } catch (error) {
      setErrors({ submit: 'An error occurred. Please try again.' });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-[50%] items-center justify-center px-10">
        <div className="w-[692px] h-[898px] rounded-4xl overflow-hidden shadow-xl border border-[#E6E7EB] bg-white">
          <Image
            src="/illustrator.png"
            alt="Illustrator"
            width={692}
            height={898}
            className="object-cover h-full w-full"
          />
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-[50%] flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[602px]">
          {/* LOGO */}
          <div className="flex justify-center sm:justify-start sm:-ml-9">
            <Image
              src="/logo.png"
              alt="Logo"
              width={160}
              height={160}
            />
          </div>

          {/* HEADINGS */}
          <div className="mb-7">
            <h1 className="text-[28px] font-bold text-black mb-2">
              Create an account
            </h1>
            <p className="text-[14px] text-gray-500 leading-relaxed">
              Let’s get you started with premium cryspryms access
            </p>
          </div>

          {/* GLOBAL ERROR */}
          {errors.submit && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              {errors.submit}
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* FULL NAME */}
            <div>
              <label className="block text-[13px] font-medium text-gray-950 mb-2">
                Full Name
              </label>

              <div className="relative">
                <svg
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>

                <input
                  className={`w-full pl-11 pr-4 h-[44px] text-[14px] border rounded-[10px] transition-all
                    ${errors.fullName ? "border-red-300 bg-red-50" : "border-gray-300"}
                    focus:ring-2 focus:ring-gray-500 focus:border-transparent`}
                  placeholder="Olivia Smith"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>

              {errors.fullName && (
                <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>
              )}
            </div>

            {/* EMAIL */}
            <div>
              <label className="block text-[13px] font-medium text-gray-950 mb-2">
                Email
              </label>

              <div className="relative">
                <svg
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>

                <input
                  className={`w-full pl-11 pr-4 h-[44px] text-[14px] border rounded-[10px] transition-all
                    ${errors.email ? "border-red-300 bg-red-50" : "border-gray-300"}
                    focus:ring-2 focus:ring-g-500 focus:border-transparent`}
                  placeholder="olivia@example.com"
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
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>

                <input
                  type={showPassword ? "text" : "password"}
                  className={`w-full pl-11 pr-12 h-[44px] text-[14px] border rounded-[10px] transition-all
                    ${errors.password ? "border-red-300 bg-red-50" : "border-gray-300"}
                    focus:ring-2 focus:ring-g-500`}
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    )}
                  </svg>
                </button>
              </div>

              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            {/* CONFIRM PASSWORD */}
            <div>
              <label className="block text-[13px] font-medium text-gray-950 mb-2">
                Confirm Password
              </label>

              <div className="relative">
                <svg
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>

                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className={`w-full pl-11 pr-12 h-[44px] text-[14px] border rounded-[10px] transition-all
                    ${errors.confirmPassword ? "border-red-300 bg-red-50" : "border-gray-300"}
                    focus:ring-2 focus:ring-g-500`}
                  placeholder="***********"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />

                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {showConfirmPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    )}
                  </svg>
                </button>
              </div>

              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* TERMS */}
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                className="sr-only"
              />

              <div
                className={`w-4 h-4 border-2 rounded-full flex items-center justify-center
                  ${agreeToTerms ? "bg-g-500 border-g-500" : "border-gray-300"} `}
              >
                {agreeToTerms && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3}
                      d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              <span className="ml-2 text-[13px] text-gray-700">
                I agree to the Terms & Privacy Policy
              </span>
            </label>

            {/* BUTTON */}
            <button
              type="submit"
              className="w-full h-[50px] bg-linear-to-r from-gray-500 to-gray-600 hover:from-g-600 hover:to-g-700 text-white font-semibold rounded-[10px] shadow-sm hover:shadow-md transition-all"
            >
              {isLoading ? "Creating Account..." : "Sign Up"}
            </button>
          </form>

          {/* DIVIDER */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-[1px] bg-gray-200" />
            <span className="px-4 text-[13px] text-gray-500 font-medium">
              Or Sign Up with
            </span>
            <div className="flex-1 h-[1px] bg-gray-200" />
          </div>

          {/* SOCIAL LOGINS */}
          <div className="space-y-3">
            <button
              onClick={handleGoogle}
              className="w-full h-[44px] flex items-center justify-center gap-3 border border-gray-300 rounded-[10px] hover:bg-gray-50 transition-all cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-[14px] text-gray-700 font-medium">
                Sign up with Google
              </span>
            </button>

            <button
              onClick={handleApple}
              className="w-full h-[44px] flex items-center justify-center gap-3 bg-black rounded-[10px] hover:bg-gray-900 transition-all cursor-pointer"
            >
              <Image src="/apple.png" alt="apple" width={20} height={20} />
              <span className="text-[14px] text-white font-medium">
                Sign up with Apple
              </span>
            </button>
          </div>

          {/* SIGN IN LINK */}
          <p className="mt-8 text-center text-[14px] text-gray-600">
            Already have an account?{" "}
            <Link href="/signin" className="text-g-500 font-semibold hover:text-g-600 cursor-pointer">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
