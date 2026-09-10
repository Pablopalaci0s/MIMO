"use client";

import {
  Bell,
  CalendarHeart,
  CheckCheck,
  Loader2,
  MessageSquareText,
  Package,
  ShieldCheck,
  ShieldX,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-SV", { dateStyle: "medium", timeStyle: "short" });
}

function Row({ notification, onRead }: { notification: NotificationDTO; onRead: () => void }) {
  const content = (
    <div
      className={`flex gap-3 rounded-xl border px-4 py-3 transition-colors ${
        notification.isRead ? "border-neutral-200" : "border-brand/30 bg-brand-soft/40"
      }`}
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
        {ICON[notification.type]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-900">{notification.title}</p>
        <p className="text-sm text-neutral-500">{notification.body}</p>
        <p className="mt-1 text-xs text-neutral-400">{formatDate(notification.createdAt)}</p>
      </div>
      {!notification.isRead && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />}
    </div>
  );

  if (notification.linkHref) {
    return (
      <Link href={notification.linkHref} onClick={onRead} className="block hover:opacity-90">
        {content}
      </Link>
    );
  }
  return (
    <button onClick={onRead} className="block w-full text-left hover:opacity-90">
      {content}
    </button>
  );
}

export function NotificationsPageList() {
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

  if (!data) {
    return (
      <div className="flex justify-center py-16 text-neutral-400">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (data.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-center">
        <Bell className="size-8 text-neutral-300" />
        <p className="text-neutral-600">Todavía no tenés notificaciones.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.unreadCount > 0 && (
        <button
          onClick={markAllRead}
          className="flex w-fit items-center gap-1.5 self-end text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          <CheckCheck className="size-4" />
          Marcar todas como leídas
        </button>
      )}
      {data.items.map((notification) => (
        <Row
          key={notification.id}
          notification={notification}
          onRead={() => {
            if (!notification.isRead) markRead(notification.id);
          }}
        />
      ))}
    </div>
  );
}
