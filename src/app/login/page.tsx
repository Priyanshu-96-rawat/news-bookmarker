"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeSlash, HiOutlineNewspaper } from "react-icons/hi2";

export default function LoginPage() {
    const { logIn, signInWithGoogle, user } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Redirect if already logged in
    if (user) {
        router.push("/");
        return null;
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await logIn(email, password);
            router.push("/");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Login failed. Please try again.";
            if (message.includes("invalid-credential") || message.includes("wrong-password")) {
                setError("Invalid email or password.");
            } else if (message.includes("user-not-found")) {
                setError("No account found with this email.");
            } else if (message.includes("too-many-requests")) {
                setError("Too many attempts. Please try again later.");
            } else {
                setError(message);
            }
        }
        setLoading(false);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#1a1d20] px-4">
            <div className="w-full max-w-sm animate-slide-up">
                {/* Card */}
                <div className="bg-white dark:bg-[#24272b] rounded-lg p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                    {/* Logo & Header */}
                    <div className="mb-8 flex flex-col items-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-sm bg-[#2bb24c]">
                            <HiOutlineNewspaper className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-2">Welcome back to NewsMarker</h1>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sign in to your account</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-6 rounded-md bg-red-50 dark:bg-rose-900/20 border border-red-200 dark:border-rose-800/50 px-4 py-3">
                            <p className="text-sm font-medium text-red-600 dark:text-rose-400">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label htmlFor="email" className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Email
                            </label>
                            <div className="relative">
                                <HiOutlineEnvelope className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="input-field pl-10"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="password" className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Password
                            </label>
                            <div className="relative">
                                <HiOutlineLockClosed className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="input-field pl-10 pr-10"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                >
                                    {showPassword ? <HiOutlineEyeSlash className="h-5 w-5" /> : <HiOutlineEye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary mt-6">
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    Signing in...
                                </span>
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>

                    {/* Social Login */}
                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 text-xs font-medium text-slate-400 bg-white dark:bg-[#24272b]">OR</span>
                            </div>
                        </div>

                        <div className="flex">
                            <button
                                type="button"
                                onClick={async () => {
                                    try {
                                        setError("");
                                        setLoading(true);
                                        await signInWithGoogle();
                                        router.push("/");
                                    } catch (err: unknown) {
                                        const message = err instanceof Error ? err.message : "Google sign in failed.";
                                        setError(message);
                                        setLoading(false);
                                    }
                                }}
                                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                            >
                                <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                                    <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
                                    <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
                                    <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
                                    <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853" />
                                </svg>
                                Continue with Google
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <p className="text-[13px] text-slate-500 dark:text-slate-400">
                            Don&apos;t have an account?{" "}
                            <Link href="/signup" className="font-semibold text-[#2bb24c] hover:text-[#269d43] transition-colors">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
