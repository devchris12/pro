"use client";

import React, { useState } from "react";
import Input from "../input/Input";
import Button from "../input/Button";
import { useHomeStore } from "../../stores/home/useHomeStore";
import { useGoogleLogin } from "../../hooks/auth/useGoogleLogin";

export default function SignUp() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateField, setStateField] = useState("");
  const [country, setCountry] = useState("");
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
        Sign up to <span className="font-semibold text-primary">MagByte</span>
      </h1>
      <Input
        containerClassName="w-full"
        placeholder="First Name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
      />
      <Input
        containerClassName="w-full"
        placeholder="Last Name"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
      />
      <Input
        containerClassName="w-full"
        placeholder="Email"
        type="email"
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
      <Input
        label="Date of Birth"
        labelClassName="text-xs font-medium text-primary/80"
        containerClassName="w-full"
        placeholder="Date of Birth"
        type="date"
        value={dateOfBirth}
        onChange={(e) => setDateOfBirth(e.target.value)}
      />
      <Input
        containerClassName="w-full"
        placeholder="Phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <Input
        containerClassName="w-full"
        placeholder="Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <Input
        containerClassName="w-full"
        placeholder="City"
        value={city}
        onChange={(e) => setCity(e.target.value)}
      />
      <Input
        containerClassName="w-full"
        placeholder="State"
        value={stateField}
        onChange={(e) => setStateField(e.target.value)}
      />
      <Input
        containerClassName="w-full"
        placeholder="Country"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
      />
      <Button className="w-full h-15">
        <span className="group-hover/button:scale-95 transition-all duration-300">
          Sign up
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
          {isLoadingGoogle ? "Signing in..." : "Sign up with Google"}
        </span>
      </Button>
      <div className="text-sm text-black/80 flex flex-row items-center gap-1">
        <span>Already have an account? </span>
        <Button
          className="bg-transparent text-sm text-black w-fit p-0"
          onClick={() => setState("login")}
        >
          Login
        </Button>
      </div>
    </div>
  );
}
