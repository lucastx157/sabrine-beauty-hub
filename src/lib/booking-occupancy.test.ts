import { describe, it, expect } from "vitest";
import { occupiesSlot, overlapsSlot, occupancyLabel } from "./booking-occupancy";

const base = { booking_date: "2026-11-13", start_time: "16:00:00", end_time: "16:30:00", reserved_until: null };
const now = Date.parse("2026-11-12T15:00:00Z");
describe("immediate occupancy", () => {
  it("Pix requests occupy immediately without expiration", () => {
    expect(occupiesSlot({ ...base, status: "requested" }, now)).toBe(true);
    expect(occupiesSlot({ ...base, status: "requested" }, now + 30 * 86400000)).toBe(true);
  });
  it("card requests occupy until the 20 minute hold expires", () => {
    const card = { ...base, status: "pending_payment", reserved_until: new Date(now + 20 * 60000).toISOString() };
    expect(occupiesSlot(card, now + 19 * 60000)).toBe(true);
    expect(occupiesSlot(card, now + 20 * 60000)).toBe(false);
  });
  it("cancellation releases the slot, confirmation does not", () => {
    expect(occupiesSlot({ ...base, status: "cancelled" }, now)).toBe(false);
    expect(occupiesSlot({ ...base, status: "confirmed" }, now)).toBe(true);
  });
  it("a no-show does not release an occupied slot", () => {
    expect(occupiesSlot({ ...base, status: "no_show" }, now)).toBe(true);
  });
  it("same time and overlapping procedures conflict but adjacent times do not", () => {
    expect(overlapsSlot({ ...base, status: "requested" }, "2026-11-13", "16:00")).toBe(true);
    expect(overlapsSlot({ ...base, status: "requested" }, "2026-11-13", "15:30", "16:15")).toBe(true);
    expect(overlapsSlot({ ...base, status: "requested" }, "2026-11-13", "16:30")).toBe(false);
  });
  it("pending and confirmed bookings receive the correct week labels", () => {
    expect(occupancyLabel("requested")).toBe("Pendente");
    expect(occupancyLabel("pending_payment")).toBe("Pendente");
    expect(occupancyLabel("confirmed")).toBe("Confirmado");
  });
});