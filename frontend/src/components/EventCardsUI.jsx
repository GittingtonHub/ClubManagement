import { useCallback, useEffect, useMemo, useState } from 'react';
import { DayPilot } from "@daypilot/daypilot-lite-react";
import EventSearchBar from './EventSearchBar';
import { dispatchStaffAssignmentEmails } from '../lib/emailDispatch';

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

const getRemainingTickets = (eventRow) => {
  const parsed = Number.parseInt(eventRow?.qty_tickets ?? 0, 10);
  return Number.isInteger(parsed) ? parsed : 0;
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
  const [buyModalData, setBuyModalData] = useState(null);
  const [buyModalError, setBuyModalError] = useState('');

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

    if (getRemainingTickets(eventRow) <= 0) {
      await DayPilot.Modal.alert('This event is sold out.');
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

    setBuyModalError('');
    setBuyModalData({
      event_id: eventRow.event_id,
      event_title: eventRow.event_title || `Event ${eventRow.event_id}`,
      performer: eventRow.performer || 'Unknown performer',
      start_time: eventRow.start_time,
      end_time: eventRow.end_time,
      event_poster: eventRow.event_poster || '',
      ticket_tier: 'GA',
      quantity: 1
    });
  };

  const closeBuyModal = () => {
    if (isSubmittingEventId) {
      return;
    }
    setBuyModalData(null);
    setBuyModalError('');
  };

  const handleBuyModalFieldChange = (field, value) => {
    setBuyModalError('');
    setBuyModalData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const resolvePosterUrl = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return '';
    }
    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }
    const normalizedPath = raw
      .replace(/^(\.\/)+/, '')
      .replace(/^\/+/, '')
      .replace(/\\/g, '/');
    return `${window.location.origin}/${normalizedPath}`;
  };

  const submitTicketReservation = async () => {
    if (!buyModalData?.event_id) {
      return;
    }

    const selectedTier = normalizeTier(buyModalData.ticket_tier);
    const quantity = Number.parseInt(buyModalData.quantity, 10);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setBuyModalError('Quantity must be a whole number greater than 0.');
      return;
    }

    const selectedResource = selectedTier === 'VIP' ? ticketResourcesByTier.VIP : ticketResourcesByTier.GA;
    if (!selectedResource?.id) {
      setBuyModalError(`Could not find the inventory row for ${selectedTier} tickets.`);
      return;
    }

    setIsSubmittingEventId(String(buyModalData.event_id));
    setBuyModalError('');

    try {
      const payload = {
        user_id: localStorage.getItem('userId') || 1,
        resource_id: selectedResource.id,
        service_type: selectedResource.name,
        start_time: buyModalData.start_time,
        end_time: buyModalData.end_time,
        event_id: buyModalData.event_id,
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
        setBuyModalError(errorMessage);
        return;
      }

      const reservationId = responseData?.reservation_id;
      const assignedStaff = Array.isArray(responseData?.assigned_staff) ? responseData.assigned_staff : [];
      const emailSummary = await dispatchStaffAssignmentEmails({
        templateType: 'SR-BU',
        title: `Reservation Assignment #${reservationId ?? 'N/A'}`,
        timeWindow: `${responseData?.start_time ?? buyModalData.start_time} - ${responseData?.end_time ?? buyModalData.end_time}`,
        message: `You have been assigned to reservation ${reservationId ?? 'N/A'} for ${responseData?.resource_name ?? selectedResource?.name ?? 'reservation'}.`,
        staffMembers: assignedStaff
      });
      console.info('[EMAIL_TRIGGER_FRONTEND] Reservation created from event card; frontend email dispatch summary:', emailSummary);

      setBuyModalData(null);
      setBuyModalError('');
      await DayPilot.Modal.alert('Ticket reservation submitted successfully.');
      window.dispatchEvent(new Event('reservations:changed'));
    } catch (error) {
      console.error('Failed to submit ticket reservation:', error);
      setBuyModalError('Could not reserve ticket.');
    } finally {
      setIsSubmittingEventId(null);
    }
  };

  return (
    <>
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
              const remainingTickets = getRemainingTickets(eventRow);
              const isSoldOut = remainingTickets <= 0;
              const cardClassName = isSoldOut ? 'event-card event-card-sold-out' : 'event-card';
              const buyButtonClassName = isSoldOut ? 'event-card-buy-button event-card-buy-button-sold-out' : 'event-card-buy-button';

              return (
                <article key={eventId || `${eventRow?.event_title}-${eventRow?.start_time}`} className={cardClassName}>
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
                  <p className="event-card-qty">Tickets: {remainingTickets}</p>
                  <button
                    type="button"
                    className={buyButtonClassName}
                    onClick={() => handleBuyTicket(eventRow)}
                    disabled={isSubmitting || isSoldOut}
                  >
                    {isSubmitting ? 'Processing...' : isSoldOut ? 'Sold out' : 'Buy Ticket'}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {buyModalData ? (
        <div className="ticket-buy-modal-backdrop" role="dialog" aria-modal="true">
          <div className="ticket-buy-modal-panel">
            <button
              type="button"
              className="ticket-buy-modal-close"
              onClick={closeBuyModal}
              disabled={Boolean(isSubmittingEventId)}
              aria-label="Close ticket purchase modal"
            >
              x
            </button>
            <div className="ticket-buy-modal-content">
              <div className="ticket-buy-modal-poster-column">
                {resolvePosterUrl(buyModalData.event_poster) ? (
                  <img
                    className="ticket-buy-modal-poster-image"
                    src={resolvePosterUrl(buyModalData.event_poster)}
                    alt={`${buyModalData.event_title} poster`}
                  />
                ) : (
                  <div className="ticket-buy-modal-poster-fallback">No poster available</div>
                )}
              </div>
              <div className="ticket-buy-modal-form-column">
                <div className="ticket-buy-modal-form-scroll">
                  <h3 className="ticket-buy-modal-title">Buy Ticket</h3>
                  <p className="ticket-buy-modal-static-value"><strong>Event:</strong> {buyModalData.event_title}</p>
                  <p className="ticket-buy-modal-static-value"><strong>Performer:</strong> {buyModalData.performer}</p>
                  <p className="ticket-buy-modal-static-value"><strong>Start:</strong> {formatDateTime(buyModalData.start_time)}</p>
                  <p className="ticket-buy-modal-static-value"><strong>End:</strong> {formatDateTime(buyModalData.end_time)}</p>

                  <label className="ticket-buy-modal-label" htmlFor="ticket-tier-select">Ticket Tier</label>
                  <select
                    id="ticket-tier-select"
                    className="ticket-buy-modal-input"
                    value={buyModalData.ticket_tier}
                    onChange={(event) => handleBuyModalFieldChange('ticket_tier', event.target.value)}
                    disabled={Boolean(isSubmittingEventId)}
                  >
                    {TIER_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>

                  <label className="ticket-buy-modal-label" htmlFor="ticket-qty-input">Quantity</label>
                  <input
                    id="ticket-qty-input"
                    className="ticket-buy-modal-input"
                    type="number"
                    min="1"
                    step="1"
                    value={buyModalData.quantity}
                    onChange={(event) => handleBuyModalFieldChange('quantity', event.target.value)}
                    disabled={Boolean(isSubmittingEventId)}
                  />

                  {buyModalError ? <p className="ticket-buy-modal-error">{buyModalError}</p> : null}

                  <div className="ticket-buy-modal-actions">
                    <button
                      type="button"
                      className="ticket-buy-modal-action-secondary"
                      onClick={closeBuyModal}
                      disabled={Boolean(isSubmittingEventId)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="ticket-buy-modal-action-primary"
                      onClick={submitTicketReservation}
                      disabled={Boolean(isSubmittingEventId)}
                    >
                      {isSubmittingEventId ? 'Processing...' : 'Reserve Ticket'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default EventCardsUI;
