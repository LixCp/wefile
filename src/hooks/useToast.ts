"use client";

import { toast as to } from "@/components/ui/toast";
type ToastProps = {
  title: string;
  description?: string | null;
};
export function useToast() {
  const toast = ({ title, description }: ToastProps) => {
    to.add({
      title,
      description : description || undefined,
    });
  };
  return {toast}
}
