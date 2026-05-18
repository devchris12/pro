"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTokenStore } from "../components/stores/auth/useTokenStore";
import { handleGoogleOAuthCallback } from "@/lib/api/auth/google-oauth-callback";
import { checkSession } from "@/lib/api/establish-session";

function OAuth2Callback() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const router = useRouter();
  const queryClient = useQueryClient();
  const establishSession = useTokenStore((s) => s.establishSession);

  useEffect(() => {
    if (!code) {
      router.push("/");
      return;
    }

    handleGoogleOAuthCallback(code)
      .then(async ({ access_token, new_user }) => {
        await establishSession(access_token);
        const sessionOk = await checkSession();
        if (!sessionOk) {
          throw new Error("Session cookie was not set");
        }
        await queryClient.invalidateQueries({ queryKey: ["data-analyzed"] });
        if (new_user) {
          router.push("/dashboard/user/update");
        } else {
          router.push("/dashboard");
        }
      })
      .catch(() => {
        router.push("/");
      });
  }, [code, router, establishSession, queryClient]);

  return (
    <main className="flex min-h-svh w-screen items-center justify-center bg-slate-800">
      <img
        src="/MagByteIcon.png"
        alt="MagByte — signing you in"
        className="logo-breathe w-24 h-24 object-contain select-none"
        draggable={false}
      />
    </main>
  );
}

export default function OAuth2CallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-svh w-screen items-center justify-center bg-slate-800">
          <img
            src="/MagByteIcon.png"
            alt="MagByte — signing you in"
            className="logo-breathe w-24 h-24 object-contain select-none"
            draggable={false}
          />
        </main>
      }
    >
      <OAuth2Callback />
    </Suspense>
  );
}
