"use client";

import { generateID } from "@/actions/generateid";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "./useToast";

export function useIdentity() {
  const [code, setCode] = useState<string | null>(null);
  const { toast } = useToast();
  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        let nextCode = localStorage.getItem("ft_code");
        if (!nextCode) {
          const result = await generateID();
          nextCode = result.id;
          localStorage.setItem("ft_code", nextCode);
        }
        if (active) setCode(nextCode);
      } catch {
        if (active) toast({ title: "خطا در ساخت شناسه" });
      }
    }
    initialize();
    return () => {
      active = false;
    };
  }, [toast]);
  const copyCode = useCallback(async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: "✨ کد آماده‌ست، بچسبونش هر جا دوست داری" });
    } catch {
      toast({ title: "کپی ناموفق بود", description: "دسترسی کلیپ‌بورد در دسترس نیست" });
    }
  }, [code, toast]);
  return { code, copyCode };
}
