import { useEffect, useMemo, useState } from 'react';
import '../styles/carousel.css';

function Carousel({ items = [], autoPlay = true, intervalMs = 4500, title = 'Image carousel' }) {
  const safeItems = useMemo(() => (Array.isArray(items) ? items.filter(Boolean) : []), [items]);
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedIndex = safeItems.length > 0 ? activeIndex % safeItems.length : 0;

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
              key={`${item.src || 'slide'}-${index}`}
              style={{ transform: `translateX(-${normalizedIndex * 100}%)` }}
              aria-hidden={!isActive}
            >
              <img src={item.src} alt={item.alt || `Slide ${index + 1}`} className="carousel-image" />
              {item.caption ? <p className="carousel-caption">{item.caption}</p> : null}
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
