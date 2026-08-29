# WeFile

اشتراک‌گذاری مستقیم فایل بین دو نفر با شناسه اختصاصی — Next.js 16 + React 19 + Socket.IO + WebRTC.

## How it works

- هر مرورگر یک شناسه ۸ نویسی می‌گیرد و با رویداد ``identity:register`` روی سرور ثبتش می‌کند (``server.ts``).
- سرور فقط نقش **signaling** دارد: ثبت شناسه، رله‌ی SDP offer/answer و ICE candidates. هیچ فایلی از سرور عبور نمی‌کند.
- فایل‌ها بین دو مرورگر روی یک ``RTCDataChannel`` رمزنگاری‌شده منتقل می‌شوند (chunked با backpressure)، منطق در ``src/hooks/useFileTransfer.ts``.
- گیرنده پنل پذیرش/رد شدن می‌بیند؛ پیشرفت انتقال در فهرست «انتقال‌ها» نمایش داده می‌شود و خروجی لینک دانلود می‌شود.

## Getting started

````
pnpm install
pnpm dev        # tsx watch server.ts — custom server + Socket.IO on port 3000
````

````
pnpm build
pnpm start      # NODE_ENV=production tsx server.ts
pnpm lint       # eslint
pnpm typecheck  # tsc --noEmit
node scripts/smoke-signaling.mjs 3000   # signaling end-to-end test (needs running server)
````

## WebRTC notes

- ترافیک فایل مستقیماً P2P است؛ اگر یکی از طرف‌ها پشت NAT سخت‌گیرانه باشد به **TURN server** نیاز دارید. لیست ICE servers را در ``ICE_SERVERS`` داخل ``src/hooks/useFileTransfer.ts`` تنظیم کنید (مثلاً coturn خودتان).
- فایل در حافظه‌ی مرورگر گیرنده مونتاژ می‌شود؛ محدودیت فعلی ۵۱۲ مگابایت است (``MAX_FILE_SIZE``).