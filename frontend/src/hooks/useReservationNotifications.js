import { useCallback, useEffect, useRef } from 'react';

const UPCOMING_WINDOW_MINUTES = 60;
const UPCOMING_REFRESH_MS = 5 * 60 * 1000;
const DUE_POLL_MS = 60 * 1000;
const SHOWN_NOTIFICATIONS_KEY = 'shownUserNotificationIds';

const parseApiDate = (value) => {
  if (!value) {
    return null;
  }

  const isoLike = String(value).replace(' ', 'T');
  const parsed = new Date(isoLike);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatStartTime = (startTime) => {
  const parsed = parseApiDate(startTime);
  if (!parsed) {
    return String(startTime ?? '');
  }
  return parsed.toLocaleString();
};

const readShownNotificationIds = () => {
  try {
    const raw = sessionStorage.getItem(SHOWN_NOTIFICATIONS_KEY);
    if (!raw) {
      return new Set();
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(
      parsed
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    );
  } catch (_) {
    return new Set();
  }
};

const writeShownNotificationIds = (idSet) => {
  try {
    sessionStorage.setItem(SHOWN_NOTIFICATIONS_KEY, JSON.stringify(Array.from(idSet)));
  } catch (_) {
    // Ignore sessionStorage errors in private mode or restricted environments.
  }
};

const parseJsonSafely = async (response) => {
  const text = await response.text();
  if (!text) {
    return [];
  }

  try {
    return JSON.parse(text);
  } catch (_) {
    return [];
  }
};

export default function useReservationNotifications({ enabled }) {
  const timeoutIdsRef = useRef(new Map());
  const shownNotificationsRef = useRef(readShownNotificationIds());

  const clearScheduledTimeouts = useCallback(() => {
    timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutIdsRef.current.clear();
  }, []);

  const markNotificationShown = useCallback((notificationId) => {
    const normalizedId = Number(notificationId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
      return;
    }

    shownNotificationsRef.current.add(normalizedId);
    writeShownNotificationIds(shownNotificationsRef.current);
  }, []);

  const hasShownNotification = useCallback((notificationId) => {
    const normalizedId = Number(notificationId);
    return Number.isInteger(normalizedId) && shownNotificationsRef.current.has(normalizedId);
  }, []);

  const showReminder = useCallback(
    (notification) => {
      const notificationId = Number(notification?.id ?? 0);
      if (!Number.isInteger(notificationId) || notificationId <= 0) {
        return;
      }
      if (hasShownNotification(notificationId)) {
        return;
      }

      markNotificationShown(notificationId);

      const serviceType = notification?.service_type ?? 'Reservation';
      const startsAt = formatStartTime(notification?.start_time);
      const body = `${serviceType} starts at ${startsAt}.`;

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const tagId = notification?.reservation_id ?? notificationId;
        new Notification('Reservation Reminder (10 minutes)', {
          body,
          tag: `reservation-reminder-${tagId}`
        });
        return;
      }

      window.alert(`Reservation Reminder: ${body}`);
    },
    [hasShownNotification, markNotificationShown]
  );

  const fetchDueNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/get_notifications.php', {
        credentials: 'include'
      });

      if (!response.ok) {
        return;
      }

      const payload = await parseJsonSafely(response);
      const dueNotifications = Array.isArray(payload) ? payload : [];
      dueNotifications.forEach(showReminder);
    } catch (_) {
      // Keep UX resilient if network/server briefly fails.
    }
  }, [showReminder]);

  const scheduleUpcomingNotifications = useCallback(
    (upcomingNotifications) => {
      if (!Array.isArray(upcomingNotifications)) {
        return;
      }

      upcomingNotifications.forEach((notification) => {
        const notificationId = Number(notification?.id ?? 0);
        if (!Number.isInteger(notificationId) || notificationId <= 0) {
          return;
        }

        if (hasShownNotification(notificationId) || timeoutIdsRef.current.has(notificationId)) {
          return;
        }

        const notifyAtDate = parseApiDate(notification?.notify_at);
        if (!notifyAtDate) {
          return;
        }

        const msUntilNotify = notifyAtDate.getTime() - Date.now();
        if (msUntilNotify <= 0) {
          void fetchDueNotifications();
          return;
        }

        const timeoutId = window.setTimeout(() => {
          timeoutIdsRef.current.delete(notificationId);
          void fetchDueNotifications();
        }, msUntilNotify);

        timeoutIdsRef.current.set(notificationId, timeoutId);
      });
    },
    [fetchDueNotifications, hasShownNotification]
  );

  const fetchAndScheduleUpcoming = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/get_notifications.php?scope=upcoming&window_minutes=${UPCOMING_WINDOW_MINUTES}`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        return;
      }

      const payload = await parseJsonSafely(response);
      scheduleUpcomingNotifications(Array.isArray(payload) ? payload : []);
    } catch (_) {
      // Keep silent; periodic poll will retry.
    }
  }, [scheduleUpcomingNotifications]);

  useEffect(() => {
    if (!enabled) {
      clearScheduledTimeouts();
      return undefined;
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      // Ask once on authenticated session start.
      Notification.requestPermission().catch(() => {
        // Ignore permission prompt errors.
      });
    }

    void fetchDueNotifications();
    void fetchAndScheduleUpcoming();

    const duePollId = window.setInterval(() => {
      void fetchDueNotifications();
    }, DUE_POLL_MS);

    const upcomingPollId = window.setInterval(() => {
      void fetchAndScheduleUpcoming();
    }, UPCOMING_REFRESH_MS);

    const handleReservationChange = () => {
      void fetchAndScheduleUpcoming();
      void fetchDueNotifications();
    };

    window.addEventListener('reservations:changed', handleReservationChange);

    return () => {
      window.clearInterval(duePollId);
      window.clearInterval(upcomingPollId);
      window.removeEventListener('reservations:changed', handleReservationChange);
      clearScheduledTimeouts();
    };
  }, [
    clearScheduledTimeouts,
    enabled,
    fetchAndScheduleUpcoming,
    fetchDueNotifications
  ]);
}
