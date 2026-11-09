"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { verifyAccessCode } from "@/lib/auth/access-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "signin" | "signup";

const envReady =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!envReady) {
      toast.error("Supabase is not configured yet. Add keys to .env.local (see SETUP.md).");
      return;
    }
    setLoading(true);
    setNotice(null);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { ok } = await verifyAccessCode(accessCode);
        if (!ok) {
          toast.error("Invalid access code.");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              typeof window !== "undefined" ? `${window.location.origin}/auth/confirm` : undefined,
          },
        });
        if (error) throw error;
        // If email confirmation is on, there is no active session yet.
        if (!data.session) {
          setNotice("Check your email to confirm your account, then sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.refresh();
      router.replace("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-5" noValidate>
      <h2 className="font-display text-2xl font-extrabold tracking-[-0.03em]">
        {mode === "signup" ? "Create your account" : "Sign in"}
      </h2>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
        />
      </div>

      {mode === "signup" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="access-code">Access code</Label>
          <Input
            id="access-code"
            type="text"
            inputMode="text"
            autoComplete="off"
            required
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="Invite code"
          />
          <p className="text-xs text-muted-foreground">
            Temper is invite only during the beta.
          </p>
        </div>
      )}

      {notice && (
        <p className="text-sm text-muted-foreground" role="status">
          {notice}
        </p>
      )}

      <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
        {loading
          ? mode === "signup"
            ? "Creating account"
            : "Signing in"
          : mode === "signup"
            ? "Create account"
            : "Sign in"}
      </Button>

      <p className="text-sm text-muted-foreground">
        {mode === "signup" ? "Already have an account?" : "Have an invite?"}{" "}
        <button
          type="button"
          className="inline-flex min-h-10 items-center font-medium text-foreground underline decoration-1 underline-offset-4 hover:decoration-2"
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setNotice(null);
          }}
        >
          {mode === "signup" ? "Sign in" : "Create an account"}
        </button>
      </p>

      {!envReady && (
        <p className="border-l-2 border-border pl-3 text-xs text-muted-foreground">
          Supabase isn&apos;t configured. Copy <code>.env.example</code> to{" "}
          <code>.env.local</code> and add your project URL and anon key (see SETUP.md).
        </p>
      )}
    </form>
  );
}
