import { EventFieldType } from "@prisma/client";
import { z } from "zod";

const isoDate = z.string().datetime({ offset: true });
const choiceFieldTypes = new Set<EventFieldType>([
  "SELECT",
  "RADIO",
  "CHECKBOX"
]);

export const eventFieldInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    label: z.string().trim().min(1, "Tên trường là bắt buộc.").max(120),
    fieldKey: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        /^[a-z][a-z0-9_]{1,49}$/,
        "Mã trường phải gồm 2-50 ký tự a-z, 0-9 hoặc dấu gạch dưới."
      ),
    type: z.nativeEnum(EventFieldType),
    required: z.boolean().default(false),
    options: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
    order: z.number().int().min(0).max(1000),
    isActive: z.boolean().default(true)
  })
  .superRefine((field, context) => {
    if (!choiceFieldTypes.has(field.type)) return;

    const uniqueOptions = new Set(field.options.map((option) => option.toLowerCase()));
    if (field.options.length < 2 || uniqueOptions.size !== field.options.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "Trường lựa chọn cần ít nhất 2 lựa chọn không trùng nhau."
      });
    }
  });

const eventInputObject = z.object({
  name: z.string().trim().min(3, "Tên sự kiện cần ít nhất 3 ký tự.").max(180),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug không hợp lệ."),
  description: z.string().trim().max(10000).nullable().default(null),
  location: z.string().trim().max(300).nullable().default(null),
  startTime: isoDate,
  endTime: isoDate,
  registrationOpenAt: isoDate,
  registrationCloseAt: isoDate,
  checkinOpenAt: isoDate.optional(),
  checkinCloseAt: isoDate.optional(),
  capacity: z.number().int().positive().nullable().default(null),
  codePrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{3,8}$/, "Mã đăng ký phải gồm 3-8 ký tự A-Z hoặc 0-9."),
  collectPhone: z.boolean().default(true),
  requirePhone: z.boolean().default(false),
  collectFaculty: z.boolean().default(true),
  requireFaculty: z.boolean().default(false),
  fields: z.array(eventFieldInputSchema).max(30).default([])
});

export const eventInputSchema = eventInputObject
  .transform((event) => ({
    ...event,
    checkinOpenAt:
      event.checkinOpenAt ??
      new Date(new Date(event.startTime).getTime() - 30 * 60 * 1000).toISOString(),
    checkinCloseAt: event.checkinCloseAt ?? event.endTime
  }))
  .superRefine((event, context) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const registrationOpen = new Date(event.registrationOpenAt);
    const registrationClose = new Date(event.registrationCloseAt);
    const checkinOpen = new Date(event.checkinOpenAt);
    const checkinClose = new Date(event.checkinCloseAt);

    if (start >= end) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "Thời gian kết thúc phải sau thời gian bắt đầu."
      });
    }
    if (registrationOpen >= registrationClose) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["registrationCloseAt"],
        message: "Thời gian đóng đăng ký phải sau thời gian mở."
      });
    }
    if (registrationClose > start) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["registrationCloseAt"],
        message: "Đăng ký phải đóng trước hoặc đúng lúc sự kiện bắt đầu."
      });
    }
    if (checkinOpen >= checkinClose) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["checkinCloseAt"],
        message: "Thời gian đóng check-in phải sau thời gian mở."
      });
    }
    if (event.requirePhone && !event.collectPhone) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requirePhone"],
        message: "Phải bật thu thập số điện thoại trước khi đặt bắt buộc."
      });
    }
    if (event.requireFaculty && !event.collectFaculty) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requireFaculty"],
        message: "Phải bật thu thập Khoa/Viện trước khi đặt bắt buộc."
      });
    }

    const keys = event.fields.map((field) => field.fieldKey);
    if (new Set(keys).size !== keys.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fields"],
        message: "Mã trường tùy chỉnh không được trùng nhau."
      });
    }
  });

export const eventPatchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("UPDATE"), data: eventInputSchema }),
  z.object({ action: z.literal("PUBLISH") }),
  z.object({ action: z.literal("CANCEL") })
]);

export type EventInput = z.infer<typeof eventInputSchema>;
export type EventFieldInput = z.infer<typeof eventFieldInputSchema>;

