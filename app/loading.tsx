import { LoaderCircle } from "lucide-react";
import { NavigationIndicator } from "@/components/ui/navigation-indicator";

export default function Loading() {
  return (
    <>
      <NavigationIndicator />
      <div
        className="flex min-h-[60vh] items-center justify-center px-5"
        data-app-loading
      >
        <div className="text-center">
          <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-primary" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      </div>
    </>
  );
}
