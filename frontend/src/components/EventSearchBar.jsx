import { useEffect, useState } from 'react';

const DEFAULT_VISIBLE_EVENTS = 5;

const toTimestamp = (value) => {
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? Number.MAX_SAFE_INTEGER : parsedDate.getTime();
};

const sortByStartTime = (rows) =>
  [...rows].sort((a, b) => toTimestamp(a?.start_time) - toTimestamp(b?.start_time));

function EventSearchBar({ events, setFilteredEvents }) {
  const [performer, setPerformer] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [date, setDate] = useState('');

  const normalizedEvents = Array.isArray(events) ? events.filter(Boolean) : [];

  useEffect(() => {
    setFilteredEvents(sortByStartTime(normalizedEvents).slice(0, DEFAULT_VISIBLE_EVENTS));
  }, [events, setFilteredEvents]);

  const getComparablePrice = (event) => {
    const possiblePrices = [event?.price, event?.ga_ticket_price, event?.vip_ticket_price]
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    if (possiblePrices.length === 0) {
      return null;
    }

    return Math.min(...possiblePrices);
  };

  const handleSearch = () => {
    let filtered = sortByStartTime(normalizedEvents);

    if (performer.trim() !== '') {
      filtered = filtered.filter((event) =>
        String(event?.performer ?? '').toLowerCase().includes(performer.trim().toLowerCase())
      );
    }

    if (minPrice !== '') {
      const minPriceValue = Number(minPrice);
      filtered = filtered.filter((event) => {
        const eventPrice = getComparablePrice(event);
        return eventPrice !== null && eventPrice >= minPriceValue;
      });
    }

    if (maxPrice !== '') {
      const maxPriceValue = Number(maxPrice);
      filtered = filtered.filter((event) => {
        const eventPrice = getComparablePrice(event);
        return eventPrice !== null && eventPrice <= maxPriceValue;
      });
    }

    if (date !== '') {
      filtered = filtered.filter((event) => String(event?.start_time ?? '').startsWith(date));
    }

    setFilteredEvents(filtered);
  };

  const handleReset = () => {
    setPerformer('');
    setMinPrice('');
    setMaxPrice('');
    setDate('');
    setFilteredEvents(sortByStartTime(normalizedEvents).slice(0, DEFAULT_VISIBLE_EVENTS));
  };

  return (
    <div className="event-search-bar">
      <p className="event-search-label">Search Events</p>

      <div className="event-search-controls">
        <input
          className="event-search-input"
          type="text"
          value={performer}
          onChange={(event) => setPerformer(event.target.value)}
          placeholder="Performer"
        />
        <input
          className="event-search-input"
          type="number"
          value={minPrice}
          onChange={(event) => setMinPrice(event.target.value)}
          placeholder="Min Price"
        />
        <input
          className="event-search-input"
          type="number"
          value={maxPrice}
          onChange={(event) => setMaxPrice(event.target.value)}
          placeholder="Max Price"
        />
        <input
          className="event-search-input"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <button type="button" className="event-search-button" onClick={handleSearch}>
          Search
        </button>
        <button type="button" className="event-search-button event-search-reset-button" onClick={handleReset}>
          Reset
        </button>
      </div>
    </div>
  );
}

export default EventSearchBar;
