"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "ready" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setStatus("ready");
      }
      if (event === "INITIAL_SESSION") {
        // If Supabase hydrates a session immediately, allow reset
        setStatus("ready");
      }
    });

    // Exchange the recovery code in the URL for a session (required in many setups)
    (async () => {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (data?.session && !error) {
          setStatus("ready");
        } else if (error) {
          // Fallback: if URL indicates recovery, still allow the form to show
          const url = window.location.href;
          if (url.includes("type=recovery") || url.includes("access_token")) {
            setStatus("ready");
          }
        }
      } catch {
        // Last resort fallback: if the URL looks like a recovery link, allow
        const url = window.location.href;
        if (url.includes("type=recovery") || url.includes("access_token")) {
          setStatus("ready");
        }
      }
    })();

    // Try to detect if we already have a session (sometimes Supabase sets it immediately)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setStatus("ready");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!password || password.length < 6) {
      setStatus("error");
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setStatus("error");
        setMessage(error.message || "Failed to update password.");
      } else {
        setStatus("success");
        setMessage("Your password has been updated successfully.");
      }
    } catch (e) {
      setStatus("error");
      const msg = e instanceof Error ? e.message : "Unexpected error. Please try again.";
      setMessage(msg);
    }
  };

  const disabled = status !== "ready" && status !== "error";

  return (
    <div className="min-h-screen flex bg-white">
      {/* LEFT IMAGE PANEL */}
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
            <h1 className="text-[28px] font-bold text-black mb-2">Reset Password</h1>
            <p className="text-[14px] text-gray-500 leading-relaxed">
              Choose a new password for your account.
            </p>
          </div>

          {status === "idle" && (
            <div className="mb-5 bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-3 rounded-lg">
              Checking recovery link…
            </div>
          )}

          {message && (
            <div
              className={`mb-5 text-sm px-4 py-3 rounded-lg border ${
                status === "success"
                  ? "bg-green-50 border-green-200 text-green-700"
                  : status === "error"
                  ? "bg-red-50 border-red-200 text-red-600"
                  : "bg-blue-50 border-blue-200 text-blue-700"
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-gray-950 mb-2">New Password</label>
              <input
                className="w-full pl-4 pr-4 h-11 text-[14px] bg-white border rounded-[10px] border-gray-300 transition-all focus:ring-2 focus:ring-[#3B3E56] focus:border-transparent"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={disabled}
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-950 mb-2">Confirm Password</label>
              <input
                className="w-full pl-4 pr-4 h-11 text-[14px] bg-white border rounded-[10px] border-gray-300 transition-all focus:ring-2 focus:ring-[#3B3E56] focus:border-transparent"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={disabled}
              />
            </div>

            <button
              type="submit"
              disabled={disabled}
              className="w-full h-[50px] bg-linear-to-r from-[#3B3E56] to-[#14151c] hover:from-[#14151c] hover:to-[#3B3E56] text-white font-semibold rounded-[10px] shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-60"
            >
              Update Password
            </button>
          </form>

          {status === "success" && (
            <p className="mt-8 text-center text-[14px] text-gray-600">
              You can now {" "}
              <Link href="/signin" className="text-[#3B3E56] font-semibold hover:text-[#14151c]">
                sign in
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
