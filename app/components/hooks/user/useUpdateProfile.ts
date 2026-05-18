"use client";

import { useMutation } from "@tanstack/react-query";
import {
  updateUserProfile,
  UpdateUserProfileBody,
  UpdateUserProfileSuccess,
} from "@/lib/api/user/update-profile";

export function useUpdateProfile() {
  return useMutation<UpdateUserProfileSuccess, Error, UpdateUserProfileBody>({
    mutationFn: (body) => updateUserProfile(body),
  });
}
