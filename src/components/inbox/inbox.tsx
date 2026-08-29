"use client";

import { Download, FileArchive, FileImage, FileText, InboxIcon, X } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import type { TransferRecord, TransferStatus } from "@/hooks/useFileTransfer";

const STATUS_LABELS: Record<TransferStatus, string> = {
  waiting: "منتظر تأیید",
  connecting: "در حال اتصال",
  transferring: "در حال انتقال",
  completed: "تکمیل شد",
  declined: "رد شد",
  cancelled: "لغو شد",
  failed: "ناموفق",
};

function formatSize(bytes: number) {
  if (bytes === 0) return "۰ بایت";
  const units = ["بایت", "کیلوبایت", "مگابایت", "گیگابایت"];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(bytes / 1024 ** unit)} ${units[unit]}`;
}

function FileTypeIcon({ type }: { type: string }) {
  const className = "size-5 text-cprimary";
  if (type.startsWith("image/")) return <FileImage className={className} />;
  if (type.includes("zip") || type.includes("compressed")) return <FileArchive className={className} />;
  return <FileText className={className} />;
}

export function Inbox({ transfers, onCancel }: { transfers: TransferRecord[]; onCancel: () => void }) {
  return (
    <Card className="my-10 border-deep-teal bg-night-slate">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xs text-silver-mist font-vazir-matn">
          <span className="h-4 w-1 rounded-sm bg-cprimary" />
          انتقال‌ها
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transfers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-deep-teal py-10 text-center text-silver-mist">
            <InboxIcon className="size-8 text-cprimary/70" />
            <div>
              <p className="text-sm text-ctext">هنوز فایلی منتقل نشده</p>
              <p className="mt-1 text-xs">فایل‌های ارسالی و دریافتی اینجا نمایش داده می‌شوند.</p>
            </div>
          </div>
        ) : (
          <div dir="ltr" className="flex flex-col gap-2">
            {transfers.map((transfer) => (
              <div key={transfer.id} className="flex items-center gap-3 rounded-xl border border-deep-teal bg-[#121821] p-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-deep-teal bg-night-slate">
                  <FileTypeIcon type={transfer.type} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-ctext">{transfer.name}</p>
                    <Badge className="shrink-0 rounded-full bg-cprimary/15 text-[10px] text-cprimary">
                      {transfer.direction === "incoming" ? "دریافتی" : "ارسالی"}
                    </Badge>
                  </div>
                  <p dir="rtl" className="mt-0.5 truncate text-xs text-silver-mist">
                    {formatSize(transfer.size)} · <span className="font-mono text-cprimary">{transfer.peer}</span> · {STATUS_LABELS[transfer.status]}
                  </p>
                  {["connecting", "waiting", "transferring"].includes(transfer.status) && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-deep-teal">
                      <div className="h-full rounded-full bg-cprimary transition-[width] duration-200" style={{ width: `${transfer.status === "transferring" ? transfer.progress : 5}%` }} />
                    </div>
                  )}
                  {transfer.error && <p dir="rtl" className="mt-1 text-xs text-cred">{transfer.error}</p>}
                </div>
                {transfer.downloadUrl ? (
                  <Button render={<a href={transfer.downloadUrl} download={transfer.name} />} variant="ghost" size="sm" className="text-cprimary hover:bg-deep-teal hover:text-cprimary">
                    <Download className="size-4" /> دریافت
                  </Button>
                ) : ["waiting", "connecting", "transferring"].includes(transfer.status) ? (
                  <Button type="button" onClick={onCancel} variant="ghost" size="icon-sm" aria-label="لغو انتقال" className="text-silver-mist hover:bg-deep-teal hover:text-cred">
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
