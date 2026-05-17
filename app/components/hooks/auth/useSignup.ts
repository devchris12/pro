"use client";

import { useMutation } from "@tanstack/react-query";
import {
  signupUser,
  SignupBody,
  SignupSuccessResponse,
} from "@/lib/api/auth/signup";

export function useSignup() {
  return useMutation<SignupSuccessResponse, Error, SignupBody>({
    mutationFn: (body: SignupBody) => signupUser(body),
  });
}

