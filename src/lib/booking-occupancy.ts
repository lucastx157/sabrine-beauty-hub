export const OCCUPYING_STATUSES = ["requested", "confirmed", "rescheduled", "pending_payment", "no_show"];

export type OccupyingBooking = {
  status: string;
  reserved_until: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
};

export function occupiesSlot(booking: OccupyingBooking, now = Date.now()) {
  if (!OCCUPYING_STATUSES.includes(booking.status)) return false;
  return !(booking.status === "pending_payment" && booking.reserved_until && new Date(booking.reserved_until).getTime() <= now);
}

export function overlapsSlot(booking: OccupyingBooking, date: string, time: string, endTime?: string) {
  const start = time.slice(0, 5);
  const end = endTime?.slice(0, 5);
  return booking.booking_date === date && (end
    ? start < booking.end_time.slice(0, 5) && end > booking.start_time.slice(0, 5)
    : start >= booking.start_time.slice(0, 5) && start < booking.end_time.slice(0, 5));
}

export function occupancyLabel(status: string) {
  return status === "requested" || status === "pending_payment" ? "Pendente" : "Confirmado";
}