"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportMenu({ eventId }: { eventId: string }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline"><Download className="h-4 w-4" />Xuất dữ liệu</Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" className="z-50 min-w-44 rounded-md border bg-background p-1 shadow-lg">
          <DropdownMenu.Item asChild>
            <a className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-muted focus:bg-muted" href={`/api/admin/events/${eventId}/export?format=xlsx`}>
              <FileSpreadsheet className="h-4 w-4" />Excel (.xlsx)
            </a>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <a className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-muted focus:bg-muted" href={`/api/admin/events/${eventId}/export?format=csv`}>
              <FileText className="h-4 w-4" />CSV (.csv)
            </a>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
