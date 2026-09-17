export type ParticipantNotification = {
  id: string;
  registrationId: string;
  kind: "registration" | "checkin";
  eventName: string;
  eventSlug: string;
  occurredAt: string;
  read: boolean;
};

export type NotificationInbox = {
  items: ParticipantNotification[];
  unreadCount: number;
  asOf: string;
};
