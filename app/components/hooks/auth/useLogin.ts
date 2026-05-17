"use client";

import { useMutation } from "@tanstack/react-query";
import { loginUser, LoginBody, LoginSuccessResponse } from "@/lib/api/auth/login";

export function useLogin() {
  return useMutation<LoginSuccessResponse, Error, LoginBody>({
    mutationFn: (body: LoginBody) => loginUser(body),
  });
}

