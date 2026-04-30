import { useEffect, useMemo, useState } from 'react';
import { DayPilot } from '@daypilot/daypilot-lite-react';
import { useNavigate } from 'react-router-dom';
import '../styles/carousel.css';
import { dispatchStaffAssignmentEmails } from '../lib/emailDispatch';
// const TEST_IMAGE_URL = '/api/private_uploads/posters/7DFBDC06-F371-4C93-BAFA-639BEC2B36F4_4_5005_c.jpeg';

const UPCOMING_EVENT_LIMIT = 4;
const TIER_OPTIONS = [
  { name: 'GA', id: 'GA' },
  { name: 'VIP', id: 'VIP' }
];

function formatEventDateRange(startValue, endValue) {
  const start = startValue ? new Date(startValue) : null;
  const end = endValue ? new Date(endValue) : null;
  const startText = start && !Number.isNaN(start.getTime()) ? start.toLocaleString() : 'TBD';
  const endText = end && !Number.isNaN(end.getTime()) ? end.toLocaleString() : 'TBD';
  return `${startText} - ${endText}`;
}

function buildEventSlide(eventRow) {
  const rawPoster = String(eventRow?.path ?? eventRow?.event_poster ?? eventRow?.image_path ?? '').trim();
  const resolvedPoster = (() => {
    if (!rawPoster) {
      return '';
    }
    if (/^https?:\/\//i.test(rawPoster)) {
      return rawPoster;
    }
    if (!rawPoster.includes('/')) {
      const normalizedFileName = rawPoster.replace(/\\/g, '/').replace(/^\/+/, '');
      return `${window.location.origin}/api/private_uploads/posters/${normalizedFileName}`;
    }
    const normalizedPath = rawPoster
      .replace(/^(\.\/)+/, '')
      .replace(/^\/+/, '')
      .replace(/\\/g, '/');
    return `${window.location.origin}/${normalizedPath}`;
  })();

  return {
    // src: String(eventRow?.path ?? eventRow?.event_poster ?? eventRow?.image_path ?? TEST_IMAGE_URL ?? '').trim(),
    src: resolvedPoster,
    alt: eventRow?.event_title ? `${eventRow.event_title} poster` : 'Event poster',
    captionTitle: String(eventRow?.event_title ?? `Event ${eventRow?.event_id ?? ''}`).trim() || 'Upcoming Event',
    captionRange: formatEventDateRange(eventRow?.start_time, eventRow?.end_time),
    eventData: eventRow
  };
}

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

function Carousel({ items = [], autoPlay = true, intervalMs = 4500, title = 'Image carousel' }) {
  const navigate = useNavigate();
  const [eventSlides, setEventSlides] = useState([]);
  const [failedImageIndexes, setFailedImageIndexes] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [ticketResourcesByTier, setTicketResourcesByTier] = useState({ GA: null, VIP: null });
  const [buyModalData, setBuyModalData] = useState(null);
  const [buyModalError, setBuyModalError] = useState('');
  const [isSubmittingEventId, setIsSubmittingEventId] = useState(null);
  const hasManualItems = Array.isArray(items) && items.length > 0;

  useEffect(() => {
    if (hasManualItems) {
      return undefined;
    }

    let isMounted = true;

    const loadUpcomingEvents = async () => {
      try {
        const response = await fetch('/api/events.php', {
          method: 'GET',
          credentials: 'include'
        });
        if (!response.ok) {
          throw new Error('Unable to load events');
        }

        const payload = await response.json();
        const allEvents = Array.isArray(payload) ? payload : [];
        const nowMs = Date.now();

        const upcomingEvents = allEvents
          .filter((eventRow) => {
            const parsedStart = new Date(eventRow?.start_time ?? '').getTime();
            return Number.isFinite(parsedStart) && parsedStart >= nowMs;
          })
          .sort((left, right) => new Date(left?.start_time ?? '').getTime() - new Date(right?.start_time ?? '').getTime())
          .slice(0, UPCOMING_EVENT_LIMIT)
          .map(buildEventSlide);

        if (isMounted) {
          setEventSlides(upcomingEvents);
        }
      } catch {
        if (isMounted) {
          setEventSlides([]);
        }
      }
    };

    loadUpcomingEvents();

    return () => {
      isMounted = false;
    };
  }, [hasManualItems]);

  const safeItems = useMemo(() => {
    if (hasManualItems) {
      return items.filter(Boolean);
    }
    return eventSlides.filter(Boolean);
  }, [hasManualItems, items, eventSlides]);

  const normalizedIndex = safeItems.length > 0 ? activeIndex % safeItems.length : 0;

  useEffect(() => {
    setFailedImageIndexes([]);
    setActiveIndex(0);
  }, [safeItems.length]);

  useEffect(() => {
    if (hasManualItems) {
      return undefined;
    }

    let isMounted = true;
    const loadTicketResources = async () => {
      try {
        const response = await fetch('/api/inventory.php', { credentials: 'include' });
        const text = await response.text();
        if (!response.ok) {
          throw new Error(`Failed to load inventory: ${response.status} ${text}`);
        }
        const inventoryRows = parseJsonSafely(text, []);
        const rows = Array.isArray(inventoryRows) ? inventoryRows : [];
        const gaResource = rows.find((row) => row?.name === 'Event Ticket GA') ?? null;
        const vipResource = rows.find((row) => row?.name === 'Event Ticket VIP') ?? null;
        if (isMounted) {
          setTicketResourcesByTier({ GA: gaResource, VIP: vipResource });
        }
      } catch {
        if (isMounted) {
          setTicketResourcesByTier({ GA: null, VIP: null });
        }
      }
    };

    loadTicketResources();

    return () => {
      isMounted = false;
    };
  }, [hasManualItems]);

  useEffect(() => {
    if (!autoPlay || safeItems.length <= 1) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setActiveIndex((previousIndex) => (previousIndex + 1) % safeItems.length);
    }, intervalMs);

    return () => window.clearInterval(timerId);
  }, [autoPlay, intervalMs, safeItems.length]);

  if (safeItems.length === 0) {
    return null;
  }

  const goToPrevious = () => {
    setActiveIndex((previousIndex) => (previousIndex - 1 + safeItems.length) % safeItems.length);
  };

  const goToNext = () => {
    setActiveIndex((previousIndex) => (previousIndex + 1) % safeItems.length);
  };

  const resolvePosterUrl = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return '';
    }
    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }
    if (!raw.includes('/')) {
      const normalizedFileName = raw.replace(/\\/g, '/').replace(/^\/+/, '');
      return `${window.location.origin}/api/private_uploads/posters/${normalizedFileName}`;
    }
    const normalizedPath = raw
      .replace(/^(\.\/)+/, '')
      .replace(/^\/+/, '')
      .replace(/\\/g, '/');
    return `${window.location.origin}/${normalizedPath}`;
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

  const handleBuyTicket = async (slide) => {
    const eventRow = slide?.eventData;
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
    setBuyModalError('');
    setBuyModalData({
      event_id: eventRow.event_id,
      event_title: eventRow.event_title || `Event ${eventRow.event_id}`,
      performer: eventRow.performer || 'Unknown performer',
      start_time: eventRow.start_time,
      end_time: eventRow.end_time,
      event_poster: eventRow.event_poster || eventRow.path || eventRow.image_path || '',
      ticket_tier: 'GA',
      quantity: 1
    });
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
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
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
      await dispatchStaffAssignmentEmails({
        templateType: 'SR-BU',
        title: `Reservation Assignment #${reservationId ?? 'N/A'}`,
        timeWindow: `${responseData?.start_time ?? buyModalData.start_time} - ${responseData?.end_time ?? buyModalData.end_time}`,
        message: `You have been assigned to reservation ${reservationId ?? 'N/A'} for ${responseData?.resource_name ?? selectedResource?.name ?? 'reservation'}.`,
        staffMembers: assignedStaff
      });

      setBuyModalData(null);
      setBuyModalError('');
      window.dispatchEvent(new Event('reservations:changed'));
      if (reservationId) {
        navigate(`/successful-purchase/${reservationId}`);
      } else {
        await DayPilot.Modal.alert('Ticket reservation submitted successfully, but no receipt ID was returned.');
      }
    } catch {
      setBuyModalError('Could not reserve ticket.');
    } finally {
      setIsSubmittingEventId(null);
    }
  };

  return (
    <>
      <section className="carousel" aria-label={title}>
        <div className="carousel-container">
        {safeItems.map((item, index) => {
          const isActive = index === normalizedIndex;
          return (
            <article
              className={`carousel-item ${isActive ? 'is-active' : ''}`}
              key={`${item.src || item.captionTitle || 'slide'}-${index}`}
              style={{ transform: `translateX(-${normalizedIndex * 100}%)` }}
              aria-hidden={!isActive}
            >
              {item.src && !failedImageIndexes.includes(index) ? (
                <div className="carousel-image-stage">
                  <div
                    className="carousel-mirror-strip carousel-mirror-left carousel-mirror-eighth"
                    style={{ backgroundImage: `url("${item.src}")` }}
                    aria-hidden="true"
                  />
                  <div
                    className="carousel-mirror-strip carousel-mirror-left carousel-mirror-eighth"
                    style={{ backgroundImage: `url("${item.src}")` }}
                    aria-hidden="true"
                  />
                  <div
                    className="carousel-mirror-strip carousel-mirror-left carousel-mirror-quarter"
                    style={{ backgroundImage: `url("${item.src}")` }}
                    aria-hidden="true"
                  />
                  <div
                    className="carousel-mirror-strip carousel-mirror-left carousel-mirror-quarter"
                    style={{ backgroundImage: `url("${item.src}")` }}
                    aria-hidden="true"
                  />
                  <div
                    className="carousel-mirror-strip carousel-mirror-left carousel-mirror-half"
                    style={{ backgroundImage: `url("${item.src}")` }}
                    aria-hidden="true"
                  />
                  <img
                    src={item.src}
                    alt={item.alt || `Slide ${index + 1}`}
                    className="carousel-image"
                    onError={() => {
                      setFailedImageIndexes((previous) => (
                        previous.includes(index) ? previous : [...previous, index]
                      ));
                    }}
                  />
                  <div
                    className="carousel-mirror-strip carousel-mirror-right carousel-mirror-half"
                    style={{ backgroundImage: `url("${item.src}")` }}
                    aria-hidden="true"
                  />
                  <div
                    className="carousel-mirror-strip carousel-mirror-right carousel-mirror-quarter"
                    style={{ backgroundImage: `url("${item.src}")` }}
                    aria-hidden="true"
                  />
                  <div
                    className="carousel-mirror-strip carousel-mirror-right carousel-mirror-quarter"
                    style={{ backgroundImage: `url("${item.src}")` }}
                    aria-hidden="true"
                  />
                  <div
                    className="carousel-mirror-strip carousel-mirror-right carousel-mirror-eighth"
                    style={{ backgroundImage: `url("${item.src}")` }}
                    aria-hidden="true"
                  />
                  <div
                    className="carousel-mirror-strip carousel-mirror-right carousel-mirror-eighth"
                    style={{ backgroundImage: `url("${item.src}")` }}
                    aria-hidden="true"
                  />
                </div>
              ) : (
                <div className="carousel-image-placeholder">Image coming soon</div>
              )}
              <div className="carousel-caption-row">
                {(item.captionTitle || item.captionRange || item.caption) ? (
                  <p className="carousel-caption">
                    <strong className="carousel-caption-title">{item.captionTitle || item.caption}</strong>
                    {item.captionRange ? <span className="carousel-caption-range">{item.captionRange}</span> : null}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="carousel-buy-now-button"
                  onClick={() => handleBuyTicket(item)}
                  disabled={Boolean(isSubmittingEventId)}
                >
                  Buy Now
                </button>
              </div>
            </article>
          );
        })}
        </div>

        {safeItems.length > 1 ? (
          <>
            <button type="button" className="carousel-nav carousel-nav-prev" onClick={goToPrevious} aria-label="Previous slide">
              ‹
            </button>
            <button type="button" className="carousel-nav carousel-nav-next" onClick={goToNext} aria-label="Next slide">
              ›
            </button>

            <div className="carousel-dots" role="tablist" aria-label="Choose slide">
              {safeItems.map((item, index) => (
                <button
                  key={`${item.src || 'dot'}-${index}`}
                  type="button"
                  className={`carousel-dot ${index === normalizedIndex ? 'is-active' : ''}`}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  aria-selected={index === normalizedIndex}
                  role="tab"
                />
              ))}
            </div>
          </>
        ) : null}
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

export default Carousel;
