import { useEffect, useMemo, useState } from 'react';
import '../styles/carousel.css';

const UPCOMING_EVENT_LIMIT = 4;

function formatEventDateRange(startValue, endValue) {
  const start = startValue ? new Date(startValue) : null;
  const end = endValue ? new Date(endValue) : null;
  const startText = start && !Number.isNaN(start.getTime()) ? start.toLocaleString() : 'TBD';
  const endText = end && !Number.isNaN(end.getTime()) ? end.toLocaleString() : 'TBD';
  return `${startText} - ${endText}`;
}

function buildEventSlide(eventRow) {
  return {
    src: String(eventRow?.path ?? eventRow?.event_poster ?? eventRow?.image_path ?? '').trim(),
    alt: eventRow?.event_title ? `${eventRow.event_title} poster` : 'Event poster',
    captionTitle: String(eventRow?.event_title ?? `Event ${eventRow?.event_id ?? ''}`).trim() || 'Upcoming Event',
    captionRange: formatEventDateRange(eventRow?.start_time, eventRow?.end_time)
  };
}

function Carousel({ items = [], autoPlay = true, intervalMs = 4500, title = 'Image carousel' }) {
  const [eventSlides, setEventSlides] = useState([]);
  const [failedImageIndexes, setFailedImageIndexes] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
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

  return (
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
              ) : (
                <div className="carousel-image-placeholder">Image coming soon</div>
              )}
              {(item.captionTitle || item.captionRange || item.caption) ? (
                <p className="carousel-caption">
                  <strong className="carousel-caption-title">{item.captionTitle || item.caption}</strong>
                  {item.captionRange ? <span className="carousel-caption-range">{item.captionRange}</span> : null}
                </p>
              ) : null}
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
  );
}

export default Carousel;
