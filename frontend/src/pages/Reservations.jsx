import { useEffect, useState } from 'react';
import EventSearchBar from '../components/EventSearchBar';
import ReactScheduler from '../components/ReactScheduler';

const formatStartTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString();
};

function Reservations() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoadingEvents(true);
      setEventsError('');

      try {
        const response = await fetch('/api/events.php', { credentials: 'include' });
        const payload = await response.json().catch(() => []);
        const rows = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.events)
            ? payload.events
            : [];

        setEvents(rows);
      } catch (error) {
        console.error('Failed to fetch events:', error);
        setEvents([]);
        setFilteredEvents([]);
        setEventsError('Unable to load events right now.');
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
          <p className="events-search-meta">Loading events...</p>
        ) : eventsError ? (
          <p className="events-search-meta events-search-error">{eventsError}</p>
        ) : filteredEvents.length === 0 ? (
          <p className="events-search-meta">No matching events found.</p>
        ) : (
          <ul className="events-search-results">
            {filteredEvents.map((event) => (
              <li key={event.event_id}>
                <strong>{event.event_title || `Event ${event.event_id}`}</strong>
                <span>{event.performer || 'Unknown performer'}</span>
                <span>{formatStartTime(event.start_time)}</span>
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
