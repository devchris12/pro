"use client";

import React, { useState } from "react";
import Input from "../input/Input";
import Button from "../input/Button";
import Link from "next/link";
import { useHomeStore } from "../../stores/home/useHomeStore";
import { useGoogleLogin } from "../../hooks/auth/useGoogleLogin";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setState } = useHomeStore();
  const { mutate: handleGoogleLogin, isPending: isLoadingGoogle } =
    useGoogleLogin();

  const onGoogleLogin = () => {
    handleGoogleLogin(undefined, {
      onSuccess: (data) => {
        window.location.href = data.redirect_url;
      },
      onError: (error) => {
        console.error("[v0] Google login error:", error);
      },
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-md items-center justify-center">
      <h1 className="text-2xl font-light">
        Login to <span className="font-semibold text-primary">MagByte</span>
      </h1>
      <Input
        containerClassName="w-full"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        containerClassName="w-full"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button className="w-full h-15">
        <span className="group-hover/button:scale-95 transition-all duration-300">
          Login
        </span>
      </Button>
      <div className="w-full flex items-center gap-2">
        <div className="flex-1 h-px bg-black/20" />
        <span className="text-xs text-black/60">or</span>
        <div className="flex-1 h-px bg-black/20" />
      </div>
      <Button
        onClick={onGoogleLogin}
        disabled={isLoadingGoogle}
        className="w-full h-15 bg-white border border-black/20 text-black hover:bg-black/5"
      >
        <span className="flex items-center justify-center gap-2">
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
          </svg>
          {isLoadingGoogle ? "Signing in..." : "Sign in with Google"}
        </span>
      </Button>
      <div className="text-sm text-black/80 flex flex-row items-center gap-1">
        <span>Don&apos;t have an account? </span>
        <Button
          className="bg-transparent text-sm text-black w-fit p-0"
          onClick={() => setState("signup")}
        >
          Sign up
        </Button>
      </div>
    </div>
  );
}
