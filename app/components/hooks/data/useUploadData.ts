"use client";

import { useMutation } from "@tanstack/react-query";
import {
  uploadData,
  DataUploadInput,
  DataUploadSuccess,
} from "@/lib/api/data/upload-data";

export function useUploadData() {
  return useMutation<DataUploadSuccess, Error, DataUploadInput>({
    mutationFn: (input) => uploadData(input),
  });
}
