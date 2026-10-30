<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture decisions

- Keep visual identity in semantic tokens in `src/styles.css` and preserve booking logic independently of presentation; staged redesigns must not modify commercial rules or stored availability.

- Date-specific availability lives in `availability_overrides` (one row per bookable slot start on a specific date). When a date has override rows, only those slots are offered and they appear immediately (bypassing the `advance_booking_days` window); the weekly `availability` rows apply to all other dates.

- `availability_overrides.is_blocked` marks a slot shown as occupied (struck-through) but never bookable; `getAvailableSlots({includeOccupied:true})` is for display only — booking checks must ignore `occupied` slots. Why: owner wants full-looking weeks without fake bookings.
- Site bookings are created by `requestBooking` with status `requested` (no login, no proof upload); that status does NOT block the slot — the owner blocks it in the admin panel after checking the Pix proof sent on WhatsApp. The AI assistant never creates bookings. Why: payment is verified manually by the owner.
