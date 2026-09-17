"use client";

import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fromDateTimeLocal, toDateTimeLocal } from "@/lib/time/format";
import { slugify } from "@/lib/utils/normalize";
import { useToast } from "@/components/ui/toast-provider";

const fieldTypes = [
  ["TEXT", "Văn bản ngắn"],
  ["NUMBER", "Số"],
  ["EMAIL", "Email"],
  ["PHONE", "Số điện thoại"],
  ["SELECT", "Danh sách chọn"],
  ["RADIO", "Một lựa chọn"],
  ["CHECKBOX", "Nhiều lựa chọn"],
  ["TEXTAREA", "Văn bản dài"]
] as const;

type FieldType = (typeof fieldTypes)[number][0];

type EditableField = {
  clientId: string;
  id?: string;
  label: string;
  fieldKey: string;
  type: FieldType;
  required: boolean;
  options: string;
  isActive: boolean;
};

export type EventFormInitial = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string;
  registrationOpenAt: string;
  registrationCloseAt: string;
  checkinOpenAt: string;
  checkinCloseAt: string;
  capacity: number | null;
  codePrefix: string;
  collectPhone: boolean;
  requirePhone: boolean;
  collectFaculty: boolean;
  requireFaculty: boolean;
  activeRegistrationCount: number;
  fields: Array<{
    id: string;
    label: string;
    fieldKey: string;
    type: FieldType;
    required: boolean;
    options: string[];
    isActive: boolean;
  }>;
};

function newField(index: number): EditableField {
  return {
    clientId: crypto.randomUUID(),
    label: "",
    fieldKey: `field_${index + 1}`,
    type: "TEXT",
    required: false,
    options: "",
    isActive: true
  };
}

export function EventForm({ initial }: { initial?: EventFormInitial }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(initial));
  const [fields, setFields] = useState<EditableField[]>(
    initial?.fields.map((field) => ({
      ...field,
      clientId: field.id,
      options: field.options.join(", ")
    })) ?? []
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(clientId: string, patch: Partial<EditableField>) {
    setFields((current) =>
      current.map((field) => (field.clientId === clientId ? { ...field, ...patch } : field))
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const publishAfterCreate = submitter?.value === "publish";
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();
    const nullable = (key: string) => value(key) || null;

    try {
      const capacityValue = value("capacity");
      const data = {
        name,
        slug,
        description: nullable("description"),
        location: nullable("location"),
        startTime: fromDateTimeLocal(value("startTime")),
        endTime: fromDateTimeLocal(value("endTime")),
        registrationOpenAt: fromDateTimeLocal(value("registrationOpenAt")),
        registrationCloseAt: fromDateTimeLocal(value("registrationCloseAt")),
        checkinOpenAt: fromDateTimeLocal(value("checkinOpenAt")),
        checkinCloseAt: fromDateTimeLocal(value("checkinCloseAt")),
        capacity: capacityValue ? Number(capacityValue) : null,
        codePrefix: value("codePrefix").toUpperCase(),
        collectPhone: form.has("collectPhone"),
        requirePhone: form.has("requirePhone"),
        collectFaculty: form.has("collectFaculty"),
        requireFaculty: form.has("requireFaculty"),
        fields: fields.map((field, index) => ({
          id: field.id,
          label: field.label,
          fieldKey: field.fieldKey,
          type: field.type,
          required: field.required,
          isActive: field.isActive,
          order: index,
          options: field.options
            .split(",")
            .map((option) => option.trim())
            .filter(Boolean)
        }))
      };

      const response = await fetch(
        initial ? `/api/admin/events/${initial.id}` : "/api/admin/events",
        {
          method: initial ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(initial ? { action: "UPDATE", data } : data)
        }
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Không thể lưu sự kiện.");

      if (!initial) {
        const createdEventId = payload.data.event.id as string;
        if (publishAfterCreate) {
          const publishResponse = await fetch(`/api/admin/events/${createdEventId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "PUBLISH" })
          });
          const publishPayload = await publishResponse.json();
          if (!publishResponse.ok) {
            throw new Error(
              publishPayload.error?.message ??
                "Đã tạo bản nháp nhưng chưa thể xuất bản."
            );
          }
        }
        showToast({
          title: publishAfterCreate ? "Tạo và xuất bản sự kiện thành công" : "Đã tạo bản nháp",
          description: name
        });
        router.push(`/admin/events/${createdEventId}/edit`);
        return;
      }
      showToast({ title: "Đã lưu thay đổi", description: name });
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Không thể lưu sự kiện.";
      setError(message);
      showToast({ title: "Không thể lưu sự kiện", description: message, variant: "error" });
    } finally {
      setPending(false);
    }
  }

  const dateDefault = (value: string | undefined) => (value ? toDateTimeLocal(value) : "");

  return (
    <form onSubmit={submit} className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" type="button">
          <Link href="/admin/events">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Danh sách sự kiện
          </Link>
        </Button>
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {pending ? "Đang lưu" : initial ? "Lưu thay đổi" : "Tạo bản nháp"}
        </Button>
      </div>

      {error ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {initial && initial.activeRegistrationCount > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Sự kiện đã có {initial.activeRegistrationCount} lượt đăng ký đang hoạt động.
          Sức chứa không thể thấp hơn con số này; trường đã có câu trả lời sẽ được
          ngừng sử dụng thay vì xóa khỏi dữ liệu.
        </div>
      ) : null}

      <fieldset className="space-y-5 border-t pt-6">
        <legend className="pr-3 text-lg font-semibold">Thông tin chung</legend>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Tên sự kiện</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!slugEdited) setSlug(slugify(event.target.value));
              }}
              required
              minLength={3}
              maxLength={180}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(event) => {
                setSlugEdited(true);
                setSlug(slugify(event.target.value));
              }}
              required
              minLength={3}
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="codePrefix">Tiền tố mã đăng ký</Label>
            <Input
              id="codePrefix"
              name="codePrefix"
              defaultValue={initial?.codePrefix}
              placeholder="CTD2026"
              pattern="[A-Za-z0-9]{3,8}"
              maxLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Địa điểm</Label>
            <Input id="location" name="location" defaultValue={initial?.location ?? ""} maxLength={300} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="capacity">Sức chứa</Label>
            <Input id="capacity" name="capacity" type="number" min={1} defaultValue={initial?.capacity ?? ""} placeholder="Không giới hạn" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea id="description" name="description" defaultValue={initial?.description ?? ""} maxLength={10000} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t pt-6">
        <legend className="pr-3 text-lg font-semibold">Thời gian</legend>
        <p className="text-sm text-muted-foreground">Tất cả mốc giờ được nhập theo giờ Việt Nam (UTC+7).</p>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            ["startTime", "Bắt đầu sự kiện", initial?.startTime],
            ["endTime", "Kết thúc sự kiện", initial?.endTime],
            ["registrationOpenAt", "Mở đăng ký", initial?.registrationOpenAt],
            ["registrationCloseAt", "Đóng đăng ký", initial?.registrationCloseAt],
            ["checkinOpenAt", "Mở check-in", initial?.checkinOpenAt],
            ["checkinCloseAt", "Đóng check-in", initial?.checkinCloseAt]
          ].map(([id, label, defaultValue]) => (
            <div className="space-y-2" key={id}>
              <Label htmlFor={id}>{label}</Label>
              <Input id={id} name={id} type="datetime-local" defaultValue={dateDefault(defaultValue)} required />
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t pt-6">
        <legend className="pr-3 text-lg font-semibold">Thông tin người tham dự</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["collectPhone", "Thu thập số điện thoại", initial?.collectPhone ?? true],
            ["requirePhone", "Bắt buộc số điện thoại", initial?.requirePhone ?? false],
            ["collectFaculty", "Thu thập Khoa/Viện", initial?.collectFaculty ?? true],
            ["requireFaculty", "Bắt buộc Khoa/Viện", initial?.requireFaculty ?? false]
          ].map(([id, label, checked]) => (
            <label key={String(id)} className="flex items-center gap-3 text-sm font-medium">
              <input className="h-4 w-4 accent-primary" type="checkbox" id={String(id)} name={String(id)} defaultChecked={Boolean(checked)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <legend className="pr-3 text-lg font-semibold">Trường đăng ký tùy chỉnh</legend>
          <Button type="button" variant="outline" size="sm" onClick={() => setFields((current) => [...current, newField(current.length)])}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Thêm trường
          </Button>
        </div>
        {fields.length === 0 ? (
          <p className="border-y py-6 text-sm text-muted-foreground">Chưa có trường tùy chỉnh.</p>
        ) : (
          <div className="grid gap-4">
            {fields.map((field) => {
              const hasOptions = ["SELECT", "RADIO", "CHECKBOX"].includes(field.type);
              return (
                <div key={field.clientId} className="rounded-md border bg-background p-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
                    <div className="space-y-2">
                      <Label htmlFor={`${field.clientId}-label`}>Nhãn</Label>
                      <Input id={`${field.clientId}-label`} value={field.label} onChange={(event) => updateField(field.clientId, { label: event.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${field.clientId}-key`}>Mã trường</Label>
                      <Input id={`${field.clientId}-key`} value={field.fieldKey} onChange={(event) => updateField(field.clientId, { fieldKey: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${field.clientId}-type`}>Loại</Label>
                      <select id={`${field.clientId}-type`} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={field.type} onChange={(event) => updateField(field.clientId, { type: event.target.value as FieldType })}>
                        {fieldTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                      </select>
                    </div>
                    <div className="flex items-end justify-end">
                      <Button type="button" size="icon" variant="ghost" title="Xóa trường" aria-label={`Xóa trường ${field.label || field.fieldKey}`} onClick={() => setFields((current) => current.filter((item) => item.clientId !== field.clientId))}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-5">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-primary" checked={field.required} onChange={(event) => updateField(field.clientId, { required: event.target.checked })} />Bắt buộc</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-primary" checked={field.isActive} onChange={(event) => updateField(field.clientId, { isActive: event.target.checked })} />Đang sử dụng</label>
                  </div>
                  {hasOptions ? (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor={`${field.clientId}-options`}>Các lựa chọn, phân cách bằng dấu phẩy</Label>
                      <Input id={`${field.clientId}-options`} value={field.options} onChange={(event) => updateField(field.clientId, { options: event.target.value })} placeholder="Lựa chọn 1, Lựa chọn 2" required />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </fieldset>

      <div className="flex justify-end border-t pt-6">
        {!initial ? (
          <Button
            className="mr-2"
            type="submit"
            name="intent"
            value="publish"
            variant="secondary"
            disabled={pending}
          >
            {pending ? "Đang xử lý" : "Tạo và xuất bản"}
          </Button>
        ) : null}
        <Button type="submit" name="intent" value="draft" disabled={pending}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {pending ? "Đang lưu" : initial ? "Lưu thay đổi" : "Tạo bản nháp"}
        </Button>
      </div>
    </form>
  );
}
