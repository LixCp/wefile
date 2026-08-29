"use client";

import { useRef, useState } from "react";
import { FileUp, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MAX_FILE_SIZE } from "@/hooks/useFileTransfer";
import { IDENTITY_PATTERN } from "@/lib/socket-events";

export function SendFile({ disabled, notReady, ownIdentity, onSend }: {
  disabled: boolean;
  notReady: boolean;
  ownIdentity: string | null;
  onSend: (target: string, file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedTarget = target.trim().toUpperCase();
    if (!IDENTITY_PATTERN.test(normalizedTarget)) return setError("شناسه گیرنده باید ۸ حرف یا عدد باشد");
    if (normalizedTarget === ownIdentity) return setError("نمی‌توانید برای خودتان فایل بفرستید");
    if (!file) return setError("ابتدا یک فایل انتخاب کنید");
    if (file.size > MAX_FILE_SIZE) return setError("حداکثر حجم فایل ۵۱۲ مگابایت است");
    setError(null);
    try {
      await onSend(normalizedTarget, file);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "ارسال فایل ناموفق بود");
    }
  };

  return (
    <Card className="my-10 border-deep-teal bg-night-slate">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xs text-silver-mist font-vazir-matn">
          <span className="h-4 w-1 rounded-sm bg-cprimary" /> ارسال فایل مستقیم
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="target-code" className="mb-2 block text-xs text-silver-mist">شناسه گیرنده</label>
            <input id="target-code" dir="ltr" value={target} onChange={(event) => setTarget(event.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 8))} placeholder="AB12CD34" autoComplete="off" className="h-10 w-full rounded-lg border border-deep-teal bg-[#121821] px-3 text-center font-mono tracking-[0.3em] text-ctext outline-none transition focus:border-cprimary focus:ring-2 focus:ring-cprimary/20" />
          </div>
          <div>
            <label htmlFor="file" className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-deep-teal bg-[#121821] px-4 py-6 text-sm text-silver-mist transition hover:border-cprimary/50 hover:text-cprimary">
              <FileUp className="size-5" /> {file ? file.name : "انتخاب فایل (حداکثر ۵۱۲ مگابایت)"}
            </label>
            <input ref={inputRef} id="file" type="file" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </div>
          {error && <p role="alert" className="text-xs text-cred">{error}</p>}
          <Button type="submit" disabled={disabled || notReady || !ownIdentity} className="w-full bg-cprimary text-cbg hover:bg-cprimary/80">
            <Send className="size-4" /> {notReady ? "در حال اتصال به سرور…" : disabled ? "یک انتقال در حال انجام است" : "ارسال امن با WebRTC"}
          </Button>
          <p className="text-center text-xs leading-5 text-silver-mist">فایل مستقیماً و رمزنگاری‌شده بین دو مرورگر منتقل می‌شود و روی سرور ذخیره نمی‌شود.</p>
        </form>
      </CardContent>
    </Card>
  );
}