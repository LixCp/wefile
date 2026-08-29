"use client";

import { FileDown } from "lucide-react";
import { Inbox } from "@/components/inbox/inbox";
import { UserIdentity } from "@/components/useridentity/useridentity";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SendFile } from "@/components/transfer/send-file";
import { useFileTransfer } from "@/hooks/useFileTransfer";
import { useIdentity } from "@/hooks/useIdentity";
import { useSocket } from "@/hooks/useSocket";

function formatSize(bytes: number) {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024) + " مگابایت";
}

export function TransferWorkspace() {
  const { connected, socket } = useSocket();
  const { code, registered, copyCode } = useIdentity(socket);
  const transfer = useFileTransfer(socket, code, registered);

  return (
    <>
      <UserIdentity code={code} copyCode={copyCode} />
      <SendFile
        disabled={transfer.busy}
        notReady={!connected || !registered}
        ownIdentity={code}
        onSend={transfer.sendFile}
      />
      {transfer.incomingOffer && (
        <Card className="my-10 border-cprimary/50 bg-night-slate shadow-[0_0_30px_rgba(79,227,193,0.08)]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-cprimary">
              <FileDown className="size-5" /> درخواست دریافت فایل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="break-all text-sm text-ctext">{transfer.incomingOffer.file.name}</p>
            <p className="mt-2 text-xs text-silver-mist">
              از <span dir="ltr" className="font-mono text-cprimary">{transfer.incomingOffer.from}</span> · {formatSize(transfer.incomingOffer.file.size)}
            </p>
            <p className="mt-3 text-xs leading-5 text-silver-mist">فقط فایل‌هایی را بپذیرید که فرستنده آن‌ها را می‌شناسید.</p>
            <div className="mt-4 flex gap-2">
              <Button type="button" onClick={transfer.acceptIncoming} className="flex-1 bg-cprimary text-cbg hover:bg-cprimary/80">پذیرش و دریافت</Button>
              <Button type="button" onClick={transfer.declineIncoming} variant="outline" className="flex-1 border-deep-teal bg-transparent text-silver-mist hover:bg-[#121821] hover:text-ctext">رد کردن</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Inbox transfers={transfer.transfers} onCancel={transfer.cancelTransfer} />
    </>
  );
}