"use client";

import { toast as to } from "@/components/ui/toast";
import { useCallback } from "react";
type ToastProps = {
  title: string;
  description?: string | null;
};
export function useToast() {
  const toast = useCallback(({ title, description }: ToastProps) => {
    to.add({
      title,
      description : description || undefined,
    });
  }, []);
  return {toast}
}
