"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application render error", {
      digest: error.digest
    });
  }, [error]);

  return (
    <section className="flex min-h-[60vh] items-center justify-center px-5">
      <div className="max-w-md text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-destructive" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-semibold">Không thể tải trang</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Đã xảy ra lỗi tạm thời. Bạn có thể thử tải lại nội dung.
        </p>
        <Button className="mt-6" onClick={reset}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Thử lại
        </Button>
      </div>
    </section>
  );
}
