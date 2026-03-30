import { useEffect, useMemo, useState } from 'react';

const DEFAULT_VISIBLE_EVENTS = 5;

const toTimestamp = (value) => {
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? Number.MAX_SAFE_INTEGER : parsedDate.getTime();
};

const sortByStartTime = (rows) =>
  [...rows].sort((a, b) => toTimestamp(a?.start_time) - toTimestamp(b?.start_time));

function EventSearchBar({ events, setFilteredEvents }) {
  const [searchTerm, setSearchTerm] = useState('');

  const normalizedEvents = useMemo(() => (Array.isArray(events) ? events.filter(Boolean) : []), [events]);

  useEffect(() => {
    const query = searchTerm.trim().toLowerCase();

    if (query === '') {
      setFilteredEvents(sortByStartTime(normalizedEvents).slice(0, DEFAULT_VISIBLE_EVENTS));
      return;
    }

    const filteredRows = sortByStartTime(normalizedEvents).filter((event) => {
      const searchableValues = [
        String(event?.event_id ?? ''),
        event?.event_title ?? '',
        event?.performer ?? '',
        event?.start_time ?? ''
      ];

      return searchableValues.some((value) => value.toLowerCase().includes(query));
    });

    setFilteredEvents(filteredRows);
  }, [normalizedEvents, searchTerm, setFilteredEvents]);

  return (
    <div className="event-search-bar">
      <label htmlFor="event-search-input" className="event-search-label">Search Events</label>
      <input
        id="event-search-input"
        className="event-search-input"
        type="text"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder="Search by ID, title, performer, or start time"
      />
    </div>
  );
}

export default EventSearchBar;
