"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EventsError({ reset }: { reset: () => void }) {
  return (
    <div className="border-y py-16 text-center">
      <h2 className="text-lg font-semibold">Không thể tải dữ liệu sự kiện</h2>
      <p className="mt-2 text-sm text-muted-foreground">Kiểm tra kết nối cơ sở dữ liệu rồi thử lại.</p>
      <Button className="mt-5" variant="outline" onClick={reset}>
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Thử lại
      </Button>
    </div>
  );
}

