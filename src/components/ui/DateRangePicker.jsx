import { useState, useEffect, useRef, useCallback } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import "../cssFile/temp.css";

export default function DateRangePicker({ 
  checkInDate, 
  checkOutDate, 
  onDateChange,
  minDate 
}) {
  // Helper function to parse date string in local time (YYYY-MM-DD format)
  const parseLocalDate = (dateString) => {
    if (!dateString || !dateString.trim()) return null;
    const parts = dateString.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  };

  // Helper function to format date to YYYY-MM-DD string in local time
  const formatDateString = (date) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedStart, setSelectedStart] = useState(
    checkInDate && checkInDate.trim() ? parseLocalDate(checkInDate) : null
  );
  const [selectedEnd, setSelectedEnd] = useState(
    checkOutDate && checkOutDate.trim() ? parseLocalDate(checkOutDate) : null
  );
  const [hoverDate, setHoverDate] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const calendarRef = useRef(null);
  const inputRef = useRef(null);
  const popupRef = useRef(null);

  // Sync with parent component dates
  useEffect(() => {
    setSelectedStart(
      checkInDate && checkInDate.trim() ? parseLocalDate(checkInDate) : null
    );
    setSelectedEnd(
      checkOutDate && checkOutDate.trim() ? parseLocalDate(checkOutDate) : null
    );
  }, [checkInDate, checkOutDate]);

  // Calculate popup position
  const calculatePosition = useCallback(() => {
    if (!inputRef.current) return;
    
    const inputRect = inputRef.current.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;
    
    // Position below the input, centered horizontally
    let top = inputRect.bottom + scrollY + 8;
    let left = inputRect.left + scrollX;
    
    // Adjust if popup would go off-screen
    const popupWidth = 400; // max-width from CSS
    const viewportWidth = window.innerWidth;
    
    if (left + popupWidth > viewportWidth) {
      left = viewportWidth - popupWidth - 20; // 20px margin from edge
    }
    
    if (left < 20) {
      left = 20;
    }
    
    // Check if there's enough space below, if not, position above
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - inputRect.bottom;
    const estimatedPopupHeight = 400; // approximate height
    
    if (spaceBelow < estimatedPopupHeight && inputRect.top > estimatedPopupHeight) {
      top = inputRect.top + scrollY - estimatedPopupHeight - 8;
    }
    
    setPopupPosition({ top, left });
  }, []);

  // Calculate popup position when opening
  useEffect(() => {
    if (isOpen) {
      calculatePosition();
    }
  }, [isOpen, calculatePosition]);

  // Update position on scroll/resize
  useEffect(() => {
    if (isOpen) {
      const handleUpdate = () => {
        calculatePosition();
      };
      
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);
      
      return () => {
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
      };
    }
  }, [isOpen, calculatePosition]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isDatePast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const min = minDate ? parseLocalDate(minDate) : today;
    if (min) min.setHours(0, 0, 0, 0);
    return min && date < min;
  };

  const isDateInRange = (date) => {
    if (!selectedStart || !selectedEnd) return false;
    const dateStr = formatDateString(date);
    const startStr = formatDateString(selectedStart);
    const endStr = formatDateString(selectedEnd);
    return dateStr > startStr && dateStr < endStr;
  };

  const isDateHovered = (date) => {
    if (!hoverDate || !selectedStart || selectedEnd) return false;
    const dateStr = formatDateString(date);
    const startStr = formatDateString(selectedStart);
    const hoverStr = formatDateString(hoverDate);
    return dateStr > startStr && dateStr < hoverStr;
  };

  const handleDateClick = (date) => {
    if (isDatePast(date)) return;

    if (!selectedStart || (selectedStart && selectedEnd)) {
      // Start new selection
      setSelectedStart(date);
      setSelectedEnd(null);
      if (onDateChange) {
        onDateChange({
          checkIn: formatDateString(date),
          checkOut: null
        });
      }
    } else if (selectedStart && !selectedEnd) {
      // Complete selection
      if (date < selectedStart) {
        // If clicked date is before start, swap them
        setSelectedEnd(selectedStart);
        setSelectedStart(date);
        if (onDateChange) {
          onDateChange({
            checkIn: formatDateString(date),
            checkOut: formatDateString(selectedStart)
          });
        }
      } else {
        setSelectedEnd(date);
        if (onDateChange) {
          onDateChange({
            checkIn: formatDateString(selectedStart),
            checkOut: formatDateString(date)
          });
        }
        // Close calendar after selecting both dates
        setTimeout(() => setIsOpen(false), 200);
      }
    }
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const formatDateRange = () => {
    if (checkInDate && checkOutDate && checkInDate.trim() && checkOutDate.trim()) {
      try {
        const start = parseLocalDate(checkInDate);
        const end = parseLocalDate(checkOutDate);
        if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return `${startStr} - ${endStr}`;
        }
      } catch (e) {
        console.error("Error formatting dates:", e);
      }
    } else if (checkInDate && checkInDate.trim()) {
      try {
        const start = parseLocalDate(checkInDate);
        if (start && !isNaN(start.getTime())) {
          return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
      } catch (e) {
        console.error("Error formatting date:", e);
      }
    }
    return "Add dates";
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
    date.setHours(0, 0, 0, 0); // Normalize to midnight local time
    const dateStr = formatDateString(date);
    const isPast = isDatePast(date);
    const inRange = isDateInRange(date) || isDateHovered(date);
    const isStart = selectedStart && dateStr === formatDateString(selectedStart);
    const isEnd = selectedEnd && dateStr === formatDateString(selectedEnd);

    let dayClass = "calendar-day";
    if (isPast) dayClass += " past";
    if (inRange) dayClass += " in-range";
    if (isStart) dayClass += " start-date";
    if (isEnd) dayClass += " end-date";
    if (!isPast) dayClass += " available";

    days.push(
      <div
        key={day}
        className={dayClass}
        onClick={() => handleDateClick(date)}
        onMouseEnter={() => {
          if (selectedStart && !selectedEnd) {
            setHoverDate(date);
          }
        }}
        onMouseLeave={() => setHoverDate(null)}
        title={isPast ? "Past date" : "Select date"}
      >
        {day}
      </div>
    );
  }

  return (
    <div className="date-range-picker-container" ref={calendarRef}>
      <div 
        ref={inputRef}
        className="search-section search-section-input date-range-input"
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: "pointer", position: "relative" }}
      >
        <div className="search-section-label">Check in - Check out</div>
        <div className="search-section-input-field date-range-display" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Calendar size={18} style={{ opacity: 0.7 }} />
          <span className="date-range-text" style={{ color: (checkInDate && checkInDate.trim()) || (checkOutDate && checkOutDate.trim()) ? "inherit" : "var(--text-muted, rgba(255, 255, 255, 0.5))" }}>
            {formatDateRange()}
          </span>
        </div>
      </div>

      {isOpen && (
        <div 
          ref={popupRef}
          className="date-range-calendar-popup"
          style={{
            top: "20%",
            left: `${popupPosition.left}px`
          }}
        >
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
          </div>
        </div>
      )}
    </div>
  );
}

