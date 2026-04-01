import { useCallback, useEffect, useMemo, useState } from 'react';
import { DayPilot } from "@daypilot/daypilot-lite-react";
import EventSearchBar from './EventSearchBar';

const TIER_OPTIONS = [
  { name: 'GA', id: 'GA' },
  { name: 'VIP', id: 'VIP' }
];

const sortByStartTime = (rows) =>
  [...rows].sort((a, b) => {
    const left = new Date(a?.start_time ?? '').getTime();
    const right = new Date(b?.start_time ?? '').getTime();
    const safeLeft = Number.isNaN(left) ? Number.MAX_SAFE_INTEGER : left;
    const safeRight = Number.isNaN(right) ? Number.MAX_SAFE_INTEGER : right;
    return safeLeft - safeRight;
  });

const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString();
};

const formatPrice = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 'N/A';
  }
  return `$${parsed.toFixed(2)}`;
};

const normalizeTier = (value) => {
  const normalized = String(value ?? '').trim().toUpperCase();
  return normalized === 'VIP' ? 'VIP' : 'GA';
};

const parseJsonSafely = (text, fallback) => {
  if (!text) {
    return fallback;
  }
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
};

function EventCardsUI() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [ticketResourcesByTier, setTicketResourcesByTier] = useState({ GA: null, VIP: null });
  const [isLoading, setIsLoading] = useState(true);
  const [eventsError, setEventsError] = useState('');
  const [isSubmittingEventId, setIsSubmittingEventId] = useState(null);

  const sortedEvents = useMemo(() => sortByStartTime(events), [events]);
  const visibleEvents = useMemo(() => sortByStartTime(filteredEvents), [filteredEvents]);

  const loadEventsAndResources = useCallback(async () => {
    setIsLoading(true);
    setEventsError('');

    try {
      const [eventsResponse, inventoryResponse] = await Promise.all([
        fetch('/api/events.php', { credentials: 'include' }),
        fetch('/api/inventory.php', { credentials: 'include' })
      ]);

      const eventsText = await eventsResponse.text();
      const inventoryText = await inventoryResponse.text();

      if (!eventsResponse.ok) {
        throw new Error(`Failed to load events: ${eventsResponse.status} ${eventsText}`);
      }

      const eventsPayload = parseJsonSafely(eventsText, []);
      const inventoryPayload = parseJsonSafely(inventoryText, []);

      const eventRows = Array.isArray(eventsPayload)
        ? eventsPayload
        : Array.isArray(eventsPayload?.events)
          ? eventsPayload.events
          : [];

      const inventoryRows = Array.isArray(inventoryPayload) ? inventoryPayload : [];

      const gaResource = inventoryRows.find((row) => row?.name === 'Event Ticket GA') ?? null;
      const vipResource = inventoryRows.find((row) => row?.name === 'Event Ticket VIP') ?? null;

      setTicketResourcesByTier({
        GA: gaResource,
        VIP: vipResource
      });
      setEvents(eventRows.filter(Boolean));
      setFilteredEvents(eventRows.filter(Boolean));
      setEventsError('');
    } catch (error) {
      console.error('Failed to load event cards:', error);
      setEvents([]);
      setFilteredEvents([]);
      setEventsError('Unable to load event cards right now.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEventsAndResources();

    const refreshOnFocus = () => {
      loadEventsAndResources();
    };
    const refreshOnVisibility = () => {
      if (!document.hidden) {
        loadEventsAndResources();
      }
    };
    const refreshOnCustomEvent = () => {
      loadEventsAndResources();
    };
    const refreshOnStorage = (event) => {
      if (event.key === 'events:lastChangedAt') {
        loadEventsAndResources();
      }
    };

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnVisibility);
    window.addEventListener('events:changed', refreshOnCustomEvent);
    window.addEventListener('storage', refreshOnStorage);

    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnVisibility);
      window.removeEventListener('events:changed', refreshOnCustomEvent);
      window.removeEventListener('storage', refreshOnStorage);
    };
  }, [loadEventsAndResources]);

  const handleBuyTicket = async (eventRow) => {
    if (!eventRow?.event_id) {
      await DayPilot.Modal.alert('This event does not have a valid event ID yet.');
      return;
    }

    if (!eventRow?.start_time || !eventRow?.end_time) {
      await DayPilot.Modal.alert('This event is missing start/end times.');
      return;
    }

    if (!ticketResourcesByTier.GA || !ticketResourcesByTier.VIP) {
      await DayPilot.Modal.alert('Ticket resources are missing. Please verify Event Ticket GA and Event Ticket VIP exist in inventory.');
      return;
    }

    setIsSubmittingEventId(String(eventRow.event_id));

    try {
      let modalData = {
        event_id: eventRow.event_id,
        event_title: eventRow.event_title || `Event ${eventRow.event_id}`,
        performer: eventRow.performer || 'Unknown performer',
        start_time: eventRow.start_time,
        end_time: eventRow.end_time,
        ticket_tier: 'GA',
        quantity: 1
      };

      while (true) {
        const modal = await DayPilot.Modal.form(
          [
            { name: 'Event', id: 'event_title', type: 'text', disabled: true },
            { name: 'Performer', id: 'performer', type: 'text', disabled: true },
            { name: 'Start', id: 'start_time', type: 'datetime', disabled: true },
            { name: 'End', id: 'end_time', type: 'datetime', disabled: true },
            { name: 'Ticket Tier', id: 'ticket_tier', type: 'select', options: TIER_OPTIONS },
            { name: 'Quantity', id: 'quantity', type: 'number' }
          ],
          modalData
        );

        if (modal.canceled) {
          return;
        }

        modalData = { ...modalData, ...modal.result };
        const selectedTier = normalizeTier(modalData.ticket_tier);
        const quantity = Number.parseInt(modalData.quantity, 10);

        if (!Number.isInteger(quantity) || quantity <= 0) {
          await DayPilot.Modal.alert('Quantity must be a whole number greater than 0.');
          continue;
        }

        const selectedResource = selectedTier === 'VIP' ? ticketResourcesByTier.VIP : ticketResourcesByTier.GA;
        if (!selectedResource?.id) {
          await DayPilot.Modal.alert(`Could not find the inventory row for ${selectedTier} tickets.`);
          continue;
        }

        const payload = {
          user_id: localStorage.getItem('userId') || 1,
          resource_id: selectedResource.id,
          service_type: selectedResource.name,
          start_time: eventRow.start_time,
          end_time: eventRow.end_time,
          event_id: eventRow.event_id,
          ticket_tier: selectedTier,
          quantity
        };

        const response = await fetch('/api/reservations.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
          },
          credentials: 'include',
          body: JSON.stringify(payload)
        });

        const rawResponseText = await response.text();
        const responseData = parseJsonSafely(rawResponseText, {});

        if (!response.ok) {
          const errorMessage = responseData?.message || 'Could not reserve ticket.';
          await DayPilot.Modal.alert(errorMessage);
          return;
        }

        await DayPilot.Modal.alert('Ticket reservation submitted successfully.');
        window.dispatchEvent(new Event('reservations:changed'));
        return;
      }
    } catch (error) {
      console.error('Failed to submit ticket reservation:', error);
      await DayPilot.Modal.alert('Could not reserve ticket.');
    } finally {
      setIsSubmittingEventId(null);
    }
  };

  return (
    <section className="events-cards-section">
      <h2>Upcoming Events</h2>
      <EventSearchBar
        events={sortedEvents}
        setFilteredEvents={setFilteredEvents}
      />

      {isLoading ? (
        <p className="events-search-meta">Loading events...</p>
      ) : eventsError ? (
        <p className="events-search-meta events-search-error">{eventsError}</p>
      ) : sortedEvents.length === 0 ? (
        <p className="events-search-meta">No events available right now.</p>
      ) : visibleEvents.length === 0 ? (
        <p className="events-search-meta">No matching events found.</p>
      ) : (
        <div className="event-cards-grid">
          {visibleEvents.map((eventRow) => {
            const eventId = String(eventRow?.event_id ?? '');
            const isSubmitting = isSubmittingEventId === eventId;

            return (
              <article key={eventId || `${eventRow?.event_title}-${eventRow?.start_time}`} className="event-card">
                <h3 className="event-card-title">{eventRow?.event_title || `Event ${eventId || 'N/A'}`}</h3>
                <p className="event-card-performer">{eventRow?.performer || 'Unknown performer'}</p>
                <p className="event-card-time">
                  {formatDateTime(eventRow?.start_time)} - {formatDateTime(eventRow?.end_time)}
                </p>
                <p className="event-card-description">{eventRow?.description || 'No description available.'}</p>
                <div className="event-card-prices">
                  <span>GA: {formatPrice(eventRow?.ga_ticket_price ?? eventRow?.price)}</span>
                  <span>VIP: {formatPrice(eventRow?.vip_ticket_price)}</span>
                </div>
                <p className="event-card-qty">Tickets: {Number.parseInt(eventRow?.qty_tickets ?? 0, 10)}</p>
                <button
                  type="button"
                  className="event-card-buy-button"
                  onClick={() => handleBuyTicket(eventRow)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Processing...' : 'Buy Ticket'}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default EventCardsUI;
