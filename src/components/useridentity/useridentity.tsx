"use client";

import { Copy } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useToast } from "@/hooks/useToast";
import { useIdentity } from "@/hooks/useIdentitiy";
export function UserIdentity() {
  const {toast} = useToast()
  const {code , copyCode} = useIdentity()
  const displayCode = code ?? "--------";

  return (
    <Card className="my-10 border-deep-teal bg-night-slate">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-silver-mist text-sm">
          <span className="w-1 h-4 rounded-sm bg-cprimary"></span>
          شناسه شما
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div dir="ltr" className="flex justify-center gap-1.5 my-1.5">
          {displayCode.split("").map((digit, index) => (
            <div key={index} className="h-12 w-9 flex items-center justify-center rounded-lg border border-deep-teal bg-[#121821] font-mono text-2xl font-bold text-cprimary [text-shadow:0_0_12px_rgba(79,227,193,0.45)">
              {digit}
            </div>
          ))}
        </div>
        <div className="flex justify-center">
          <Button
            onClick={copyCode}
            variant="outline"
            size="sm"
            className="gap-2 border-deep-teal bg-transparent text-silver-mist hover:bg-[#121821] hover:text-[#e7edf3]"
          >
            <Copy className="size-4" />
            کپی در کلیپ بورد
          </Button>
        </div>
        <p className="mt-5 text-center text-xs text-silver-mist">
          این کد رو به کسی که می‌خواد فایل برات بفرسته بده
        </p>
      </CardContent>
    </Card>
  );
}
