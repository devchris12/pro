import React, { useState } from "react";
import Input from "../input/Input";
import Button from "../input/Button";
import Link from "next/link";
import { useHomeStore } from "../../stores/home/useHomeStore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setState } = useHomeStore();
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
