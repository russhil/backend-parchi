"""
Appointment slot availability for Parchi.ai.
Generates available 30-minute time slots within working hours,
excluding already-booked slots and past times.
"""

from datetime import date, datetime, timedelta
from database import get_supabase

WORKING_HOURS_START = 9   # 09:00
WORKING_HOURS_END = 17    # 17:00
SLOT_DURATION_MINUTES = 30
BOOKING_WINDOW_DAYS = 7


def get_appointments_for_date(target_date: str) -> list[dict]:
    """Query appointments for a specific date (YYYY-MM-DD)."""
    client = get_supabase()
    next_day = (date.fromisoformat(target_date) + timedelta(days=1)).isoformat()
    result = (
        client.table("appointments")
        .select("id, start_time, status")
        .gte("start_time", target_date)
        .lt("start_time", next_day)
        .neq("status", "cancelled")
        .execute()
    )
    return result.data or []


def get_available_slots(target_date: str) -> list[str]:
    """Return available 30-min slot start times (HH:MM) for a given date.

    Generates all slots from WORKING_HOURS_START to WORKING_HOURS_END,
    removes booked ones, and filters out past slots if the date is today.
    """
    d = date.fromisoformat(target_date)

    # Generate all possible slots
    all_slots: list[str] = []
    current = datetime(d.year, d.month, d.day, WORKING_HOURS_START, 0)
    end = datetime(d.year, d.month, d.day, WORKING_HOURS_END, 0)
    while current < end:
        all_slots.append(current.strftime("%H:%M"))
        current += timedelta(minutes=SLOT_DURATION_MINUTES)

    # Fetch booked appointments for the date
    booked = get_appointments_for_date(target_date)
    booked_times: set[str] = set()
    for appt in booked:
        try:
            st = appt["start_time"]
            # Parse ISO datetime and extract HH:MM
            if "T" in st:
                t = datetime.fromisoformat(st.replace("Z", "+00:00"))
                booked_times.add(t.strftime("%H:%M"))
        except Exception:
            pass

    available = [s for s in all_slots if s not in booked_times]

    # Filter past slots if today
    if d == date.today():
        now_str = datetime.now().strftime("%H:%M")
        available = [s for s in available if s > now_str]

    return available


def get_available_dates() -> list[str]:
    """Return the next BOOKING_WINDOW_DAYS dates (excluding Sundays) that have available slots."""
    today = date.today()
    dates: list[str] = []
    d = today
    while len(dates) < BOOKING_WINDOW_DAYS:
        if d.weekday() != 6:  # 6 = Sunday
            iso = d.isoformat()
            if get_available_slots(iso):
                dates.append(iso)
        d += timedelta(days=1)
    return dates
