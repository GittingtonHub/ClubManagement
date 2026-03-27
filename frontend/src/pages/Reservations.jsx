import { useEffect, useState } from "react";
import ReactScheduler from "../components/ReactScheduler";
import EventSearchBar from "../components/EventSearchBar";

const formatStartTime = (value) => {
  if (!value) return "N/A";
  const d = new Date(value);
  return isNaN(d) ? value : d.toLocaleString();
};

function Reservations() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoadingEvents(true);
      setEventsError("");

      try {
        const res = await fetch("/api/events.php", { credentials: "include" });
        const payload = await res.json().catch(() => []);
        const rows = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.events)
          ? payload.events
          : [];

        const sorted = rows.sort(
          (a, b) => new Date(a.start || a.start_time) - new Date(b.start || b.start_time)
        );

        const top5 = sorted.slice(0, 5);

        setEvents(rows);
        setFilteredEvents(top5);
      } catch (err) {
        console.error("Failed to fetch events:", err);
        setEvents([]);
        setFilteredEvents([]);
        setEventsError("Unable to load events right now.");
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <>
      <div className="events-search-section">
        <h2>Events</h2>

        <EventSearchBar
          events={events}
          setFilteredEvents={setFilteredEvents}
        />

        {isLoadingEvents ? (
          <p>Loading events...</p>
        ) : eventsError ? (
          <p>{eventsError}</p>
        ) : filteredEvents.length === 0 ? (
          <p>No matching events found.</p>
        ) : (
          <ul>
            {filteredEvents.map((e) => (
              <li key={e.event_id}>
                <strong>{e.title || e.event_title}</strong> -{" "}
                {e.performer || "Unknown"} -{" "}
                {formatStartTime(e.start || e.start_time)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ReactScheduler />
    </>
  );
}

export default Reservations;