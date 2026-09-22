import {
  addDays,
  addMinutes,
  format,
  isAfter,
  isBefore,
  parse,
  parseISO,
  set,
  startOfDay,
  startOfToday,
} from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

export const TIMEZONE = "America/Sao_Paulo";

export function nowInBrazil(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

export function parseBrazilDate(dateStr: string): Date {
  return parse(dateStr, "yyyy-MM-dd", new Date());
}

export function parseBrazilTime(timeStr: string): Date {
  return parse(timeStr, "HH:mm", new Date());
}

export function formatBrazilDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatBrazilTime(date: Date): string {
  return format(date, "HH:mm");
}

export function formatDisplayDate(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, "dd/MM/yyyy (EEEE)");
}

export function formatCurrencyCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function formatPhone(phone?: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function addHoursToBookingDate(dateStr: string, timeStr: string, hours: number): Date {
  const local = set(parseISO(dateStr), {
    hours: parseInt(timeStr.split(":")[0]!, 10),
    minutes: parseInt(timeStr.split(":")[1]!, 10),
    seconds: 0,
    milliseconds: 0,
  });
  return addMinutes(local, hours * 60);
}

export function isAtLeastHoursBefore(
  bookingDate: string,
  bookingTime: string,
  hours: number,
): boolean {
  const appointmentLocal = addHoursToBookingDate(bookingDate, bookingTime, 0);
  const deadline = addMinutes(appointmentLocal, -hours * 60);
  const nowLocal = nowInBrazil();
  return isBefore(nowLocal, deadline);
}

export { addDays, addMinutes, isAfter, isBefore, parse, parseISO, set, startOfDay, startOfToday };
