"use client";

import { ArrowLeft, Send } from "lucide-react";
import Link from "@/components/ui/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";

type PublicField = {
  id: string;
  label: string;
  fieldKey: string;
  type: "TEXT" | "NUMBER" | "EMAIL" | "PHONE" | "SELECT" | "RADIO" | "CHECKBOX" | "TEXTAREA";
  required: boolean;
  options: string[];
};

type RegistrationFormProps = {
  account: { id: string; name: string; email: string };
  event: {
    id: string;
    slug: string;
    name: string;
    collectPhone: boolean;
    requirePhone: boolean;
    collectFaculty: boolean;
    requireFaculty: boolean;
    fields: PublicField[];
  };
};

export function RegistrationForm({ event, account }: RegistrationFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    const form = new FormData(submitEvent.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const answers = Object.fromEntries(
      event.fields.map((field) => {
        const name = `custom-${field.fieldKey}`;
        return [
          field.fieldKey,
          field.type === "CHECKBOX" ? form.getAll(name).map(String) : text(name)
        ];
      })
    );

    try {
      const response = await fetch(`/api/events/${event.id}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: text("fullName"),
          studentId: text("studentId"),
          email: text("email"),
          phone: event.collectPhone ? text("phone") || null : null,
          faculty: event.collectFaculty ? text("faculty") || null : null,
          answers
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Không thể đăng ký.");

      showToast({
        title: "Đăng ký thành công",
        description: "Mã QR check-in của bạn đã sẵn sàng."
      });
      router.push(`/events/${event.slug}/registration/success`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể đăng ký.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <Button asChild variant="ghost" type="button">
        <Link href={`/events/${event.slug}`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Quay lại sự kiện
        </Link>
      </Button>

      {error ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <fieldset className="space-y-5 border-t pt-6">
        <legend className="pr-3 text-lg font-semibold">Thông tin cá nhân</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="fullName">Họ và tên *</Label>
            <Input id="fullName" name="fullName" autoComplete="name" defaultValue={account.name} minLength={2} maxLength={150} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="studentId">MSSV *</Label>
            <Input id="studentId" name="studentId" autoComplete="off" minLength={4} maxLength={30} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" name="email" type="email" autoComplete="email" value={account.email} readOnly required />
          </div>
          {event.collectPhone ? (
            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại{event.requirePhone ? " *" : ""}</Label>
              <Input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={30} required={event.requirePhone} />
            </div>
          ) : null}
          {event.collectFaculty ? (
            <div className="space-y-2">
              <Label htmlFor="faculty">Khoa/Viện{event.requireFaculty ? " *" : ""}</Label>
              <Input id="faculty" name="faculty" maxLength={150} required={event.requireFaculty} />
            </div>
          ) : null}
        </div>
      </fieldset>

      {event.fields.length > 0 ? (
        <fieldset className="space-y-5 border-t pt-6">
          <legend className="pr-3 text-lg font-semibold">Thông tin bổ sung</legend>
          {event.fields.map((field) => {
            const name = `custom-${field.fieldKey}`;
            return (
              <div className="space-y-2" key={field.id}>
                <Label htmlFor={name}>{field.label}{field.required ? " *" : ""}</Label>
                {field.type === "TEXTAREA" ? (
                  <Textarea id={name} name={name} required={field.required} maxLength={2000} />
                ) : field.type === "SELECT" ? (
                  <select id={name} name={name} required={field.required} defaultValue="" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                    <option value="" disabled>Chọn một lựa chọn</option>
                    {field.options.map((option) => <option value={option} key={option}>{option}</option>)}
                  </select>
                ) : field.type === "RADIO" || field.type === "CHECKBOX" ? (
                  <div className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
                    {field.options.map((option, index) => (
                      <label className="flex items-center gap-2 text-sm" key={option}>
                        <input
                          id={index === 0 ? name : undefined}
                          className="h-4 w-4 accent-primary"
                          type={field.type === "RADIO" ? "radio" : "checkbox"}
                          name={name}
                          value={option}
                          required={field.required && field.type === "RADIO"}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                ) : (
                  <Input
                    id={name}
                    name={name}
                    type={field.type === "NUMBER" ? "number" : field.type === "EMAIL" ? "email" : field.type === "PHONE" ? "tel" : "text"}
                    required={field.required}
                    maxLength={field.type === "NUMBER" ? undefined : 2000}
                  />
                )}
              </div>
            );
          })}
        </fieldset>
      ) : null}

      <label className="flex items-start gap-3 border-t pt-6 text-sm leading-6">
        <input className="mt-1 h-4 w-4 accent-primary" type="checkbox" required />
        Tôi xác nhận các thông tin đã cung cấp là chính xác.
      </label>

      <Button className="w-full sm:w-auto" type="submit" disabled={pending}>
        <Send className="h-4 w-4" aria-hidden="true" />
        {pending ? "Đang đăng ký" : "Hoàn tất đăng ký"}
      </Button>
    </form>
  );
}
