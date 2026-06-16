"use client";

import { motion } from "framer-motion";
import { User, Mail, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { handleRegister } from "../actions/auth-action";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    setError(null);

    const registerResult = await handleRegister({
      name,
      email,
      password,
    });

    if (!registerResult.success) {
      setError(registerResult.error || "Failed to register user.");
      setIsLoading(false);
      return;
    }

    const isAdmin = registerResult.data?.user.role === "ADMIN";
    const callbackUrl = isAdmin ? "/admin" : "/";

    const loginResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setIsLoading(false);

    if (!loginResult || loginResult.error) {
      setError("Account created, but auto sign in failed. Please sign in manually.");
      return;
    }

    router.push(loginResult.url ?? callbackUrl);
    router.refresh();
  };

  const handleGoogleSignUp = () => {
    signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="min-h-[calc(100vh-100px)] pt-24 pb-12 flex flex-col justify-center items-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[60vw] h-[60vw] min-w-[500px] opacity-30 mix-blend-screen" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-fantasy) 0%, transparent 65%)' }} />
        <div className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] min-w-[500px] opacity-25 mix-blend-screen" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-scifi) 0%, transparent 65%)' }} />
        <div className="absolute top-[30%] left-[20%] w-[70vw] h-[70vw] min-w-[600px] opacity-15 mix-blend-screen" style={{ backgroundImage: 'radial-gradient(circle at center, var(--color-adventure) 0%, transparent 65%)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md px-6 z-10"
      >
        <div className="mb-10 text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-block mb-4"
          >
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Create an account
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-text-secondary font-sans text-lg"
          >
            Join us and start your journey.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="bg-black/40 backdrop-blur-[40px] border border-white/[0.08] rounded-[2rem] p-8 md:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden"
        >
          {/* Subtle top shine */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />

          {/* Google Signup Button */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            className="w-full relative group overflow-hidden bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/[0.08] hover:border-white/20 rounded-xl h-14 flex items-center justify-center font-medium font-sans mb-8"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-300" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="relative z-10">Sign up with Google</span>
          </button>

          <div className="flex items-center gap-4 mb-8">
            <div className="h-px bg-white/5 flex-1" />
            <span className="text-xs font-medium text-text-secondary/60 uppercase tracking-widest">Or</span>
            <div className="h-px bg-white/5 flex-1" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5 relative">
              <label 
                htmlFor="name" 
                className={`text-sm font-medium transition-colors duration-300 ${focusedInput === 'name' ? 'text-white' : 'text-text-secondary'}`}
              >
                Full Name
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className={`w-5 h-5 transition-colors duration-300 ${focusedInput === 'name' ? 'text-white' : 'text-text-secondary/50'}`} strokeWidth={1.5} />
                </div>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  disabled={isLoading}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setFocusedInput('name')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="John Doe"
                  className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-text-secondary/30 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-sans"
                />
              </div>
            </div>

            <div className="space-y-1.5 relative pt-1">
              <label 
                htmlFor="email" 
                className={`text-sm font-medium transition-colors duration-300 ${focusedInput === 'email' ? 'text-white' : 'text-text-secondary'}`}
              >
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className={`w-5 h-5 transition-colors duration-300 ${focusedInput === 'email' ? 'text-white' : 'text-text-secondary/50'}`} strokeWidth={1.5} />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  disabled={isLoading}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="name@example.com"
                  className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-text-secondary/30 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-sans"
                />
              </div>
            </div>

            <div className="space-y-1.5 relative pt-1">
              <label 
                htmlFor="password" 
                className={`text-sm font-medium transition-colors duration-300 ${focusedInput === 'password' ? 'text-white' : 'text-text-secondary'}`}
              >
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className={`w-5 h-5 transition-colors duration-300 ${focusedInput === 'password' ? 'text-white' : 'text-text-secondary/50'}`} strokeWidth={1.5} />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  disabled={isLoading}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="••••••••"
                  className="w-full bg-black/50 border border-white/[0.08] rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-text-secondary/30 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all font-sans"
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-400 mt-2"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-black font-semibold font-sans rounded-xl h-14 mt-6 flex items-center justify-center group hover:bg-white/90 transition-all duration-300 relative overflow-hidden disabled:opacity-70"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/5 to-transparent opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-700" />
              {isLoading ? "Creating account..." : "Sign Up"}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform duration-300" strokeWidth={2} />
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-text-secondary text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-white hover:underline underline-offset-4 font-medium transition-all duration-300">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
