import { ArrowLeft, FileQuestion } from "lucide-react";
import Link from "@/components/ui/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center px-5">
      <div className="max-w-md text-center">
        <FileQuestion className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-semibold">Không tìm thấy trang</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Nội dung không tồn tại hoặc đã được di chuyển.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Về trang chủ
          </Link>
        </Button>
      </div>
    </section>
  );
}
