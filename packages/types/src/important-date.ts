export type ImportantDateType =
  | "ANNIVERSARY"
  | "BIRTHDAY"
  | "MOTHERS_DAY"
  | "FATHERS_DAY"
  | "GRADUATION"
  | "OTHER";

export interface ImportantDateDTO {
  id: string;
  type: ImportantDateType;
  label: string;
  date: string;
  recipientName: string | null;
  remindDaysBefore: number;
  daysUntil: number;
}

export interface ImportantDateInput {
  type: ImportantDateType;
  label: string;
  date: string;
  recipientName?: string;
  remindDaysBefore?: number;
}
