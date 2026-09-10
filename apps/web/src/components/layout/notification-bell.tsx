"use client";

import {
  Bell,
  CalendarHeart,
  CheckCheck,
  MessageSquareText,
  Package,
  ShieldCheck,
  ShieldX,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { NotificationDTO, NotificationListDTO, NotificationType } from "@mimo/types";

const ICON: Record<NotificationType, ReactNode> = {
  ORDER_CONFIRMED: <Package className="size-4" />,
  ORDER_IN_PROGRESS: <Package className="size-4" />,
  ORDER_OUT_FOR_DELIVERY: <Package className="size-4" />,
  ORDER_DELIVERED: <Package className="size-4" />,
  ORDER_CANCELLED: <Package className="size-4" />,
  IMPORTANT_DATE_REMINDER: <CalendarHeart className="size-4" />,
  BUSINESS_APPROVED: <ShieldCheck className="size-4" />,
  BUSINESS_SUSPENDED: <ShieldX className="size-4" />,
  REVIEW_RECEIVED: <MessageSquareText className="size-4" />,
  PROMOTION: <Tag className="size-4" />,
  SYSTEM: <Bell className="size-4" />,
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

function NotificationRow({ notification, onRead }: { notification: NotificationDTO; onRead: () => void }) {
  const content = (
    <div
      className={`flex gap-3 rounded-xl px-3 py-2.5 transition-colors ${
        notification.isRead ? "" : "bg-brand-soft/40"
      }`}
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
        {ICON[notification.type]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-900">{notification.title}</p>
        <p className="line-clamp-2 text-xs text-neutral-500">{notification.body}</p>
        <p className="mt-0.5 text-[11px] text-neutral-400">{timeAgo(notification.createdAt)}</p>
      </div>
      {!notification.isRead && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />}
    </div>
  );

  if (notification.linkHref) {
    return (
      <Link href={notification.linkHref} onClick={onRead} className="block hover:bg-neutral-50 rounded-xl">
        {content}
      </Link>
    );
  }
  return (
    <button onClick={onRead} className="block w-full text-left hover:bg-neutral-50 rounded-xl">
      {content}
    </button>
  );
}

export function NotificationBell({ variant = "icon" }: { variant?: "icon" | "tab" }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationListDTO | null>(null);

  function load() {
    fetch("/api/notificaciones")
      .then((response) => response.json())
      .then((body) => {
        if (body.success) setData(body.data);
      });
  }

  useEffect(load, []);

  async function markRead(id: string) {
    if (!data) return;
    setData({
      items: data.items.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
      unreadCount: Math.max(0, data.unreadCount - 1),
    });
    await fetch(`/api/notificaciones/${id}`, { method: "PATCH" });
  }

  async function markAllRead() {
    if (!data) return;
    setData({ items: data.items.map((item) => ({ ...item, isRead: true })), unreadCount: 0 });
    await fetch("/api/notificaciones", { method: "PATCH" });
  }

  const unreadCount = data?.unreadCount ?? 0;

  return (
    <Sheet open={open} onOpenChange={(next) => { setOpen(next); if (next) load(); }}>
      {variant === "tab" ? (
        <button
          onClick={() => setOpen(true)}
          className="relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-neutral-400"
          aria-label="Ver notificaciones"
        >
          <Bell className="size-5" strokeWidth={1.75} />
          Avisos
          {unreadCount > 0 && (
            <span className="absolute top-1 right-[calc(50%-18px)] flex size-4 items-center justify-center rounded-full bg-brand text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="relative flex size-9 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100"
          aria-label="Ver notificaciones"
        >
          <Bell className="size-5" strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-brand text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      )}
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="flex-row items-center justify-between space-y-0">
          <SheetTitle>Notificaciones</SheetTitle>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-900"
            >
              <CheckCheck className="size-3.5" />
              Marcar todas
            </button>
          )}
        </SheetHeader>

        {!data || data.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
            <Bell className="size-8 text-neutral-300" />
            <p className="text-sm text-neutral-500">Todavía no tenés notificaciones.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-2">
            <div className="flex flex-col gap-1">
              {data.items.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onRead={() => {
                    if (!notification.isRead) markRead(notification.id);
                    setOpen(false);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
