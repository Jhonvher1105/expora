import { useState, useEffect, useCallback } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useBooking } from "../../context/BookingContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Helper function to format date as YYYY-MM-DD in local time (no timezone conversion)
const formatDateLocal = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to parse date string to Date object at local midnight
const parseDateString = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export default function AvailabilityCalendar({ listingId, onDateSelect, initialStartDate, initialEndDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookedDates, setBookedDates] = useState([]);
  const [selectedDates, setSelectedDates] = useState(() => ({ 
    start: initialStartDate ? parseDateString(initialStartDate) : null, 
    end: initialEndDate ? parseDateString(initialEndDate) : null 
  }));
  const [loading, setLoading] = useState(true);
  const { getListingBookings } = useBooking();

  const loadBookedDates = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
    try {
      const bookings = await getListingBookings(listingId);
      const booked = [];
      
      bookings.forEach((booking) => {
        if (booking.status !== "cancelled" && booking.startDate && booking.endDate) {
          // Handle Firestore Timestamps or string dates
          let start, end;
          if (booking.startDate?.toDate) {
            start = booking.startDate.toDate();
          } else {
            start = new Date(booking.startDate);
          }
          if (booking.endDate?.toDate) {
            end = booking.endDate.toDate();
          } else {
            end = new Date(booking.endDate);
          }
          
          // Validate dates
          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            console.warn("Invalid date in booking:", booking.id);
            return;
          }
          
          // Add all dates in the booking range (excluding checkout date)
          const current = new Date(start);
          while (current < end) {
            booked.push(formatDateLocal(new Date(current)));
            current.setDate(current.getDate() + 1);
          }
        }
      });
      
      setBookedDates(booked);
    } catch (error) {
      console.error("Error loading booked dates:", error);
    } finally {
      setLoading(false);
    }
  }, [listingId, getListingBookings]);

  useEffect(() => {
    if (listingId) {
      loadBookedDates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]); // Only reload when listingId changes, not when month changes

  // Sync with parent component dates
  useEffect(() => {
    setSelectedDates({
      start: initialStartDate ? parseDateString(initialStartDate) : null,
      end: initialEndDate ? parseDateString(initialEndDate) : null
    });
  }, [initialStartDate, initialEndDate]);

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isDateBooked = (date) => {
    const dateStr = formatDateLocal(date);
    return bookedDates.includes(dateStr);
  };

  const isDatePast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isDateInRange = (date) => {
    if (!selectedDates.start || !selectedDates.end) return false;
    const dateStr = formatDateLocal(date);
    const startStr = formatDateLocal(selectedDates.start);
    const endStr = formatDateLocal(selectedDates.end);
    return dateStr >= startStr && dateStr <= endStr;
  };

  const handleDateClick = (date) => {
    if (isDateBooked(date) || isDatePast(date)) return;

    if (!selectedDates.start || (selectedDates.start && selectedDates.end)) {
      // Start new selection
      const dateStr = formatDateLocal(date);
      setSelectedDates({ start: date, end: null });
      if (onDateSelect) onDateSelect({ start: dateStr, end: null });
    } else if (selectedDates.start && !selectedDates.end) {
      // Complete selection
      if (date < selectedDates.start) {
        // If clicked date is before start, make it the new start
        const startStr = formatDateLocal(date);
        const endStr = formatDateLocal(selectedDates.start);
        setSelectedDates({ start: date, end: selectedDates.start });
        if (onDateSelect) onDateSelect({ start: startStr, end: endStr });
      } else {
        const startStr = formatDateLocal(selectedDates.start);
        const endStr = formatDateLocal(date);
        setSelectedDates({ start: selectedDates.start, end: date });
        if (onDateSelect) onDateSelect({ start: startStr, end: endStr });
      }
    }
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const days = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
  }

  // Add cells for each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = formatDateLocal(date);
    const isBooked = isDateBooked(date);
    const isPast = isDatePast(date);
    const inRange = isDateInRange(date);
    const isStart = selectedDates.start && dateStr === formatDateLocal(selectedDates.start);
    const isEnd = selectedDates.end && dateStr === formatDateLocal(selectedDates.end);

    let dayClass = "calendar-day";
    if (isPast) dayClass += " past";
    if (isBooked) dayClass += " booked";
    if (inRange) dayClass += " in-range";
    if (isStart) dayClass += " start-date";
    if (isEnd) dayClass += " end-date";
    if (!isPast && !isBooked) dayClass += " available";

    days.push(
      <div
        key={day}
        className={dayClass}
        onClick={() => handleDateClick(date)}
        title={isBooked ? "Booked" : isPast ? "Past date" : "Available"}
      >
        {day}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="availability-calendar loading">
        <div>Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="availability-calendar">
      <div className="calendar-header">
        <button onClick={prevMonth} className="calendar-nav-btn" aria-label="Previous month">
          <ChevronLeft size={20} />
        </button>
        <h3 className="calendar-month">{monthName}</h3>
        <button onClick={nextMonth} className="calendar-nav-btn" aria-label="Next month">
          <ChevronRight size={20} />
        </button>
      </div>
      
      <div className="calendar-weekdays">
        <div className="calendar-weekday">Sun</div>
        <div className="calendar-weekday">Mon</div>
        <div className="calendar-weekday">Tue</div>
        <div className="calendar-weekday">Wed</div>
        <div className="calendar-weekday">Thu</div>
        <div className="calendar-weekday">Fri</div>
        <div className="calendar-weekday">Sat</div>
      </div>
      
      <div className="calendar-days">{days}</div>
      
      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-color available"></div>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <div className="legend-color booked"></div>
          <span>Booked</span>
        </div>
        <div className="legend-item">
          <div className="legend-color past"></div>
          <span>Past</span>
        </div>
        <div className="legend-item">
          <div className="legend-color in-range"></div>
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
}

