import {
  EventStatus,
  Prisma,
  RegistrationStatus,
  type EventField
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { deriveEventState } from "@/lib/time/event-state";
import {
  eventInputSchema,
  eventPatchSchema,
  type EventFieldInput,
  type EventInput
} from "@/lib/validation/event";

const eventFieldsInclude = {
  fields: { orderBy: { order: "asc" as const } },
  _count: {
    select: {
      registrations: { where: { status: RegistrationStatus.REGISTERED } },
      checkins: true
    }
  }
};

function cleanNullable(value: string | null) {
  return value && value.length > 0 ? value : null;
}

function fieldData(field: EventFieldInput) {
  const supportsOptions = ["SELECT", "RADIO", "CHECKBOX"].includes(field.type);
  return {
    label: field.label,
    fieldKey: field.fieldKey,
    type: field.type,
    required: field.required,
    options: supportsOptions
      ? (field.options as Prisma.InputJsonValue)
      : Prisma.DbNull,
    order: field.order,
    isActive: field.isActive
  };
}

function eventData(input: EventInput) {
  return {
    name: input.name,
    slug: input.slug,
    description: cleanNullable(input.description),
    location: cleanNullable(input.location),
    startTime: new Date(input.startTime),
    endTime: new Date(input.endTime),
    registrationOpenAt: new Date(input.registrationOpenAt),
    registrationCloseAt: new Date(input.registrationCloseAt),
    checkinOpenAt: new Date(input.checkinOpenAt),
    checkinCloseAt: new Date(input.checkinCloseAt),
    capacity: input.capacity,
    codePrefix: input.codePrefix,
    collectPhone: input.collectPhone,
    requirePhone: input.requirePhone,
    collectFaculty: input.collectFaculty,
    requireFaculty: input.requireFaculty
  };
}

function mapPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Slug hoặc mã trường tùy chỉnh đã tồn tại.",
      409
    );
  }
  throw error;
}

type EventListInput = {
  search?: string;
  status?: EventStatus;
  page?: number;
  limit?: number;
};

export async function listAdminEvents(input: EventListInput = {}) {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(50, Math.max(1, input.limit ?? 10));
  const search = input.search?.trim();
  const where: Prisma.EventWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { slug: { contains: search, mode: "insensitive" } },
            { location: { contains: search, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const [events, total] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      include: eventFieldsInclude,
      orderBy: [{ startTime: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.event.count({ where })
  ]);

  return {
    events: events.map((event) => ({
      ...event,
      derivedState: deriveEventState({
        ...event,
        activeRegistrationCount: event._count.registrations
      })
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
}

export async function getAdminEvent(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: eventFieldsInclude
  });

  if (!event) {
    throw new AppError("EVENT_NOT_FOUND", "Không tìm thấy sự kiện.", 404);
  }

  return {
    ...event,
    derivedState: deriveEventState({
      ...event,
      activeRegistrationCount: event._count.registrations
    })
  };
}

export async function createEvent(createdBy: string, rawInput: unknown) {
  const input = eventInputSchema.parse(rawInput);

  try {
    return await prisma.event.create({
      data: {
        ...eventData(input),
        status: EventStatus.DRAFT,
        createdBy,
        fields: {
          create: input.fields.map(fieldData)
        }
      },
      include: eventFieldsInclude
    });
  } catch (error) {
    return mapPrismaError(error);
  }
}

async function syncFields(
  transaction: Prisma.TransactionClient,
  eventId: string,
  fields: EventFieldInput[],
  existingFields: Array<EventField & { _count: { answers: number } }>
) {
  const existingById = new Map(existingFields.map((field) => [field.id, field]));
  const submittedIds = new Set(fields.flatMap((field) => (field.id ? [field.id] : [])));

  for (const field of fields) {
    if (field.id && !existingById.has(field.id)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Có trường tùy chỉnh không thuộc sự kiện này.",
        422
      );
    }
  }

  for (const current of existingFields) {
    if (submittedIds.has(current.id)) continue;

    if (current._count.answers > 0) {
      await transaction.eventField.update({
        where: { id: current.id },
        data: { isActive: false }
      });
    } else {
      await transaction.eventField.delete({ where: { id: current.id } });
    }
  }

  for (const field of fields) {
    if (field.id) {
      await transaction.eventField.update({
        where: { id: field.id },
        data: fieldData(field)
      });
    } else {
      await transaction.eventField.create({
        data: { eventId, ...fieldData(field) }
      });
    }
  }
}

export async function updateEvent(eventId: string, rawInput: unknown) {
  const input = eventInputSchema.parse(rawInput);

  try {
    return await prisma.$transaction(async (transaction) => {
      const event = await transaction.event.findUnique({
        where: { id: eventId },
        include: {
          fields: { include: { _count: { select: { answers: true } } } },
          _count: {
            select: {
              registrations: { where: { status: RegistrationStatus.REGISTERED } }
            }
          }
        }
      });

      if (!event) {
        throw new AppError("EVENT_NOT_FOUND", "Không tìm thấy sự kiện.", 404);
      }
      if (input.capacity !== null && input.capacity < event._count.registrations) {
        throw new AppError(
          "VALIDATION_ERROR",
          `Sức chứa không thể thấp hơn ${event._count.registrations} lượt đăng ký đang hoạt động.`,
          422
        );
      }

      await transaction.event.update({
        where: { id: eventId },
        data: eventData(input)
      });
      await syncFields(transaction, eventId, input.fields, event.fields);

      return transaction.event.findUniqueOrThrow({
        where: { id: eventId },
        include: eventFieldsInclude
      });
    });
  } catch (error) {
    return mapPrismaError(error);
  }
}

export async function changeEventStatus(
  eventId: string,
  action: "PUBLISH" | "CANCEL"
) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new AppError("EVENT_NOT_FOUND", "Không tìm thấy sự kiện.", 404);
  }

  if (event.status === EventStatus.CANCELLED) {
    throw new AppError("EVENT_CANCELLED", "Sự kiện đã bị hủy.", 409);
  }
  if (action === "PUBLISH" && event.status !== EventStatus.DRAFT) {
    throw new AppError("VALIDATION_ERROR", "Chỉ sự kiện nháp mới có thể xuất bản.", 409);
  }

  return prisma.event.update({
    where: { id: eventId },
    data: {
      status: action === "PUBLISH" ? EventStatus.PUBLISHED : EventStatus.CANCELLED
    },
    include: eventFieldsInclude
  });
}

export async function patchEvent(eventId: string, rawInput: unknown) {
  const patch = eventPatchSchema.parse(rawInput);
  if (patch.action === "UPDATE") return updateEvent(eventId, patch.data);
  return changeEventStatus(eventId, patch.action);
}
