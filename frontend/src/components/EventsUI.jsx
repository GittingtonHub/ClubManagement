
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useEffect, useMemo, useState } from 'react';
import { dispatchNamedTemplateEmails, dispatchStaffAssignmentEmails } from '../lib/emailDispatch';



const EMPTY_EVENT_FORM = {
  event_id: '',
  event_title: '',
  description: '',
  start_time: '',
  end_time: '',
  qty_tickets: '',
  vip_ticket_price: '',
  ga_ticket_price: '',
  performer: '',
  staff_ids: []
};

const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const normalizeEventRow = (event) => {
  if (!event || typeof event !== 'object') {
    return null;
  }

  const assignedStaffIds = Array.isArray(event.assigned_staff_ids)
    ? event.assigned_staff_ids
    : typeof event.assigned_staff_ids === 'string' && event.assigned_staff_ids.trim() !== ''
      ? event.assigned_staff_ids
          .split(',')
          .map((value) => Number.parseInt(value, 10))
          .filter(Number.isInteger)
      : [];

  return {
    event_id: event.event_id ?? '',
    event_title: event.event_title ?? '',
    description: event.description ?? '',
    start_time: event.start_time ?? '',
    end_time: event.end_time ?? '',
    qty_tickets: event.qty_tickets ?? 0,
    vip_ticket_price: event.vip_ticket_price ?? '',
    ga_ticket_price: event.ga_ticket_price ?? '',
    performer: event.performer ?? '',
    assigned_staff_names: event.assigned_staff_names ?? '',
    assigned_staff_ids: assignedStaffIds,

    status: event.status ?? '',
    removed: event.removed ?? 0
  };
};

const parseAvailableStaffIds = (payload) => {
  const hasKnownShape =
    Array.isArray(payload) ||
    Array.isArray(payload?.available_staff) ||
    Array.isArray(payload?.staff) ||
    Array.isArray(payload?.data);

  if (!hasKnownShape) {
    return null;
  }

  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.available_staff)
      ? payload.available_staff
      : Array.isArray(payload?.staff)
        ? payload.staff
        : payload.data;

  return rows
    .map((row) => {
      if (typeof row === 'number' || typeof row === 'string') {
        const parsedId = Number.parseInt(row, 10);
        return Number.isInteger(parsedId) ? parsedId : null;
      }

      if (!row || typeof row !== 'object') {
        return null;
      }

      const rawIsAvailable = row.available ?? row.is_available ?? row.isAvailable ?? true;
      const normalizedIsAvailable =
        typeof rawIsAvailable === 'string' ? rawIsAvailable.toLowerCase() : rawIsAvailable;
      if (
        normalizedIsAvailable === false ||
        normalizedIsAvailable === 0 ||
        normalizedIsAvailable === '0' ||
        normalizedIsAvailable === 'false' ||
        normalizedIsAvailable === 'no'
      ) {
        return null;
      }

      const rawId = row.id ?? row.staff_id ?? row.staffId;
      const parsedId = Number.parseInt(rawId, 10);
      return Number.isInteger(parsedId) ? parsedId : null;
    })
    .filter(Number.isInteger);
};

function EventsUI() {
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelEventId, setCancelEventId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [events, setEvents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventsError, setEventsError] = useState('');
  const [availableStaffIds, setAvailableStaffIds] = useState(null);
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);

  const uniqueUserRecipientsForEvent = async (eventId) => {
    try {
      const response = await fetch('/api/reservations.php', {
        credentials: 'include'
      });
      const payload = await response.json().catch(() => []);
      const rows = Array.isArray(payload) ? payload : [];

      const seen = new Set();
      const recipients = [];

      rows.forEach((row) => {
        if (String(row?.event_id) !== String(eventId)) {
          return;
        }
        if (String(row?.status || '').toLowerCase() === 'cancelled') {
          return;
        }

        const userId = Number.parseInt(row?.user_id, 10);
        if (!Number.isInteger(userId)) {
          return;
        }

        const key = String(userId);
        if (seen.has(key)) {
          return;
        }
        seen.add(key);

        recipients.push({
          id: userId,
          name: `User #${userId}`
        });
      });

      return recipients;
    } catch (error) {
      console.error('Failed to fetch event reservation users:', error);
      return [];
    }
  };
  
  const staffById = useMemo(() => {
    const map = new Map();
    staff.forEach((member) => {
      if (member?.id !== undefined && member?.name) {
        map.set(String(member.id), member.name);
      }
    });
    return map;
  }, [staff]);

  const availableStaffIdSet = useMemo(() => {
    if (!Array.isArray(availableStaffIds)) {
      return null;
    }

    return new Set(availableStaffIds.map((staffId) => String(staffId)));
  }, [availableStaffIds]);

  const visibleStaff = useMemo(() => {
    if (!eventForm.start_time || !eventForm.end_time || availableStaffIdSet === null) {
      return staff;
    }

    return staff.filter((member) => availableStaffIdSet.has(String(member.id)));
  }, [staff, eventForm.start_time, eventForm.end_time, availableStaffIdSet]);

  const resetEventForm = () => {
    setEventForm(EMPTY_EVENT_FORM);
    setFormErrors({});
    setAvailableStaffIds(null);
    setIsAvailabilityLoading(false);
  };

  const announceEventsChanged = () => {
    window.dispatchEvent(new Event('events:changed'));
    try {
      localStorage.setItem('events:lastChangedAt', String(Date.now()));
    } catch {
      // no-op for environments where storage is unavailable
    }
  };

  const loadEvents = async () => {
    try {
      const response = await fetch('/api/events.php', {
        credentials: 'include'
      });

      const payload = await response.json();
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.events)
          ? payload.events
          : [];

      setEvents(rows.map(normalizeEventRow).filter(Boolean));
      setEventsError('');
    } catch (error) {
      console.error('Failed to fetch events:', error);
      setEvents([]);
      setEventsError('Unable to load events right now.');
    }
  };

  const loadStaff = async () => {
    try {
      const response = await fetch('/api/staff.php', {
        credentials: 'include'
      });

      const payload = await response.json();
      const rows = Array.isArray(payload) ? payload : [];
      setStaff(rows.filter(Boolean));
    } catch (error) {
      console.error('Failed to fetch staff:', error);
      setStaff([]);
    }
  };

  useEffect(() => {
    loadEvents();
    loadStaff();
  }, []);

  useEffect(() => {
    if (!isAddEventOpen) {
      setAvailableStaffIds(null);
      setIsAvailabilityLoading(false);
      return;
    }

    if (!eventForm.start_time || !eventForm.end_time) {
      setAvailableStaffIds(null);
      return;
    }

    const start = new Date(eventForm.start_time);
    const end = new Date(eventForm.end_time);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      setAvailableStaffIds(null);
      return;
    }

    const controller = new AbortController();

    const fetchAvailability = async () => {
      setIsAvailabilityLoading(true);

      try {
        const query = new URLSearchParams({
          start_time: eventForm.start_time,
          end_time: eventForm.end_time
        });

        const response = await fetch(`/api/availability.php?${query.toString()}`, {
          credentials: 'include',
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Availability request failed with status ${response.status}`);
        }

        const payload = await response.json().catch(() => ({}));
        const parsedAvailableIds = parseAvailableStaffIds(payload);

        if (!Array.isArray(parsedAvailableIds)) {
          throw new Error('Unexpected availability response format.');
        }

        setAvailableStaffIds(parsedAvailableIds);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Failed to fetch staff availability:', error);
          setAvailableStaffIds(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsAvailabilityLoading(false);
        }
      }
    };

    fetchAvailability();

    return () => {
      controller.abort();
    };
  }, [isAddEventOpen, eventForm.start_time, eventForm.end_time]);

  useEffect(() => {
    if (!eventForm.start_time || !eventForm.end_time || availableStaffIdSet === null) {
      return;
    }

    setEventForm((previous) => {
      const filteredStaffIds = previous.staff_ids.filter((staffId) => availableStaffIdSet.has(String(staffId)));

      if (filteredStaffIds.length === previous.staff_ids.length) {
        return previous;
      }

      return {
        ...previous,
        staff_ids: filteredStaffIds
      };
    });
  }, [eventForm.start_time, eventForm.end_time, availableStaffIdSet]);

  const validateEventForm = () => {
    const errors = {};

    if (!eventForm.event_id || !Number.isInteger(Number(eventForm.event_id)) || Number(eventForm.event_id) <= 0) {
      errors.event_id = 'Event ID must be a positive whole number.';
    }

    if (!eventForm.event_title || eventForm.event_title.trim() === '') {
      errors.event_title = 'Event title is required.';
    } else if (eventForm.event_title.trim().length > 150) {
      errors.event_title = 'Event title must be 150 characters or fewer.';
    }

    if (!eventForm.description || eventForm.description.trim() === '') {
      errors.description = 'Description is required.';
    }

    if (!eventForm.performer || eventForm.performer.trim() === '') {
      errors.performer = 'Performer is required.';
    } else if (eventForm.performer.trim().length > 120) {
      errors.performer = 'Performer must be 120 characters or fewer.';
    }

    if (!eventForm.start_time) {
      errors.start_time = 'Start time is required.';
    }

    if (!eventForm.end_time) {
      errors.end_time = 'End time is required.';
    }

    if (eventForm.start_time && eventForm.end_time) {
      const start = new Date(eventForm.start_time);
      const end = new Date(eventForm.end_time);

      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end <= start) {
        errors.end_time = 'End time must be after start time.';
      }
    }

    if (eventForm.qty_tickets === '' || Number.isNaN(Number(eventForm.qty_tickets))) {
      errors.qty_tickets = 'Ticket quantity is required.';
    } else if (!Number.isInteger(Number(eventForm.qty_tickets)) || Number(eventForm.qty_tickets) < 0) {
      errors.qty_tickets = 'Ticket quantity must be a non-negative whole number.';
    }

    if (eventForm.vip_ticket_price === '' || Number.isNaN(Number(eventForm.vip_ticket_price))) {
      errors.vip_ticket_price = 'VIP ticket price is required.';
    } else if (Number(eventForm.vip_ticket_price) < 0) {
      errors.vip_ticket_price = 'VIP ticket price must be a non-negative number.';
    }

    if (eventForm.ga_ticket_price === '' || Number.isNaN(Number(eventForm.ga_ticket_price))) {
      errors.ga_ticket_price = 'GA ticket price is required.';
    } else if (Number(eventForm.ga_ticket_price) < 0) {
      errors.ga_ticket_price = 'GA ticket price must be a non-negative number.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setEventForm((previous) => ({
      ...previous,
      [field]: value
    }));

    if (formErrors[field]) {
      setFormErrors((previous) => {
        const next = { ...previous };
        delete next[field];
        return next;
      });
    }
  };

  const toggleStaffSelection = (staffId) => {
    setEventForm((previous) => {
      const selected = new Set(previous.staff_ids);

      if (selected.has(staffId)) {
        selected.delete(staffId);
      } else {
        selected.add(staffId);
      }

      return {
        ...previous,
        staff_ids: Array.from(selected)
      };
    });
  };

  const handleAddEvent = async () => {
    if (!validateEventForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/events.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          event_id: Number(eventForm.event_id),
          event_title: eventForm.event_title.trim(),
          description: eventForm.description.trim(),
          start_time: eventForm.start_time,
          end_time: eventForm.end_time,
          qty_tickets: Number(eventForm.qty_tickets),
          vip_ticket_price: Number(eventForm.vip_ticket_price),
          ga_ticket_price: Number(eventForm.ga_ticket_price),
          performer: eventForm.performer.trim(),
          staff_ids: eventForm.staff_ids
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setEventsError(payload?.message || 'Failed to add event.');
        return;
      }

      if (eventForm.staff_ids.length > 0) {
        const staffMembers = eventForm.staff_ids.map((staffId) => ({
          id: staffId,
          name: staffById.get(String(staffId)) ?? `Staff #${staffId}`
        }));

        const emailSummary = await dispatchStaffAssignmentEmails({
          templateType: 'SR-BA',
          title: `New Event Assignment: ${eventForm.event_title.trim()}`,
          timeWindow: `${eventForm.start_time} - ${eventForm.end_time}`,
          message:
            `You have been assigned to event "${eventForm.event_title.trim()}"` +
            (eventForm.performer.trim() !== '' ? ` with performer ${eventForm.performer.trim()}.` : '.'),
          staffMembers
        });

        console.info('[EMAIL_TRIGGER_FRONTEND] Event created; frontend email dispatch summary:', emailSummary);
      } else {
        console.info('[EMAIL_TRIGGER_FRONTEND] Event created with no assigned staff; no emails dispatched.');
      }

      resetEventForm();
      setIsAddEventOpen(false);
      setEventsError('');
      await loadEvents();
      announceEventsChanged();
    } catch (error) {
      console.error('Failed to add event:', error);
      setEventsError('Failed to add event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!cancelReason) return;
  
    try {
      const cancelledEvent = events.find((event) => String(event?.event_id) === String(cancelEventId));
      const response = await fetch(
        `/api/events.php?id=${cancelEventId}&reason=${encodeURIComponent(cancelReason)}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );
  
      const payload = await response.json().catch(() => ({}));
  
      if (!response.ok) {
        setEventsError(payload?.message || 'Failed to cancel event.');
        return;
      }

      const role = String(localStorage.getItem('userRole') || 'user').trim().toLowerCase();
      const actorName =
        localStorage.getItem('userUsername') ||
        localStorage.getItem('username') ||
        'User';
      const currentUserId = Number.parseInt(localStorage.getItem('userId') || '', 10);

      const staffRecipients = Array.isArray(cancelledEvent?.assigned_staff_ids)
        ? cancelledEvent.assigned_staff_ids.map((staffId) => ({
            id: `staff-${staffId}`,
            name: staffById.get(String(staffId)) || `Staff #${staffId}`
          }))
        : [];
      const userRecipients = await uniqueUserRecipientsForEvent(cancelEventId);

      let recipients = [];
      if (role === 'admin') {
        recipients = [...userRecipients, ...staffRecipients];
      } else if (role === 'staff') {
        recipients = [...userRecipients];
      } else {
        recipients = [...staffRecipients];
      }

      if (Number.isInteger(currentUserId)) {
        recipients = recipients.filter((recipient) => String(recipient.id) !== String(currentUserId));
      }

      const eventTitle = cancelledEvent?.event_title || `Event #${cancelEventId}`;
      const timeWindow = `${cancelledEvent?.start_time || ''} - ${cancelledEvent?.end_time || ''}`;
      let message = `${eventTitle} was cancelled by ${actorName} (${role}).`;
      if (role === 'admin' || role === 'staff') {
        message += ` Reason: ${cancelReason.trim()}`;
      }

      if (recipients.length > 0) {
        const emailSummary = await dispatchNamedTemplateEmails({
          templateType: 'SR-BA',
          title: `${role.toUpperCase()} Event Cancellation #${cancelEventId}`,
          timeWindow,
          message,
          recipients
        });
        console.info('[EMAIL_TRIGGER_FRONTEND] Event cancelled; frontend email dispatch summary:', emailSummary);
      }
  
      setEvents(prev =>
        prev.filter(e => String(e.event_id) !== String(cancelEventId))
      );
  
      setIsCancelOpen(false);
      setCancelEventId(null);
      setCancelReason('');
  
    } catch (error) {
      console.error(error);
      setEventsError('Failed to cancel event.');
    }
  };
  

  const getAssignedStaffLabel = (event) => {
    if (event.assigned_staff_names && event.assigned_staff_names.trim() !== '') {
      return event.assigned_staff_names;
    }

    if (Array.isArray(event.assigned_staff_ids) && event.assigned_staff_ids.length > 0) {
      const names = event.assigned_staff_ids
        .map((staffId) => staffById.get(String(staffId)))
        .filter(Boolean);

      if (names.length > 0) {
        return names.join(', ');
      }
    }

    return 'Unassigned';
  };

  const isEventCancellable = (event) => {
    if (!event || String(event.status).toLowerCase() === 'cancelled') {
      return false;
    }

    const startDate = new Date(event.start_time ?? '');
    if (Number.isNaN(startDate.getTime())) {
      return false;
    }

    return startDate.getTime() >= Date.now();
  };

  return (
    <>
      <div className="table-div events-table-div" id="events-table-div">
        <div className="add-item-button add-event-button">
          <button
            onClick={() => {
              resetEventForm();
              setIsAddEventOpen(true);
            }}
          >
            Add Event
          </button>
        </div>

        {eventsError && <p style={{ color: '#9d1f1f', margin: 0 }}>{eventsError}</p>}

        {events.length === 0 ? (
          <p className="no-items-message">No events available. Click "Add Event" to create one.</p>
        ) : (
          <table className="inventory-table events-table" id="events-table">
            <tr className="table-header">
              <th>Event No.</th>
              <th>Event ID</th>
              <th>Title</th>
              <th>Description</th>
              <th>Performer</th>
              <th>Start</th>
              <th>End</th>
              <th>Qty Tickets</th>
              <th>Assigned Staff</th>
              <th>Poster</th>
              <th>Actions</th>
            </tr>

            {events
              .filter(e => e && e.status !== 'cancelled' && e.removed !== 1)
              .map((event, index) => (
              <tr className="table-row" key={`${event.event_id}-${index}`}>
                <td className="table-cell-itemno">{index + 1}</td>
                <td>{event.event_id}</td>
                <td>{event.event_title || 'N/A'}</td>
                <td>{event.description || 'N/A'}</td>
                <td>{event.performer || 'N/A'}</td>
                <td>{formatDateTime(event.start_time)}</td>
                <td>{formatDateTime(event.end_time)}</td>
                <td>{Number.parseInt(event.qty_tickets ?? 0, 10)}</td>
                <td>{getAssignedStaffLabel(event)}</td>
                <td>
                  {event.poster_image ? (
                    <img
                      src={event.poster_image}
                      alt="Poster"
                      style={{ width: "80px", borderRadius: "6px" }}
                    />
                  ) : (
                    "-"
                  )}
                </td>
                <td className="reservation-actions-cell event-actions-cell">
                  <div className="reservation-actions-buttons event-actions-buttons">
                    {isEventCancellable(event) ? (
                      <button
                        className="delete-item-button delete-event-button"
                        onClick={() => {
                          setCancelEventId(event.event_id);
                          setCancelReason('');
                          setIsCancelOpen(true);
                        }}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </table>
        )}

        <Dialog open={isAddEventOpen} onClose={() => setIsCancelOpen(false)} className="add-item-dialog add-event-dialog">
          <div className="add-item-dialog-backdrop add-event-dialog-backdrop" aria-hidden="true" />
          <div className="add-item-dialog-container add-event-dialog-container">
            <DialogPanel className="add-item-dialog-panel add-event-dialog-panel">
              <DialogTitle className="add-item-header add-event-header">Add New Event</DialogTitle>

              <div className="inner-add-item-container">
                <input
                  type="number"
                  placeholder="Event ID"
                  value={eventForm.event_id}
                  onChange={(e) => handleInputChange('event_id', e.target.value)}
                  onBlur={validateEventForm}
                  min="1"
                  style={{
                    border: formErrors.event_id ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
                  }}
                />
                {formErrors.event_id && <span style={{ color: 'red', fontSize: '14px' }}>{formErrors.event_id}</span>}

                <input
                  type="text"
                  placeholder="Event Title"
                  value={eventForm.event_title}
                  onChange={(e) => handleInputChange('event_title', e.target.value)}
                  onBlur={validateEventForm}
                  maxLength={150}
                  style={{
                    border: formErrors.event_title ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
                  }}
                />
                {formErrors.event_title && <span style={{ color: 'red', fontSize: '14px' }}>{formErrors.event_title}</span>}

                <input
                  type="text"
                  placeholder="Performer"
                  value={eventForm.performer}
                  onChange={(e) => handleInputChange('performer', e.target.value)}
                  onBlur={validateEventForm}
                  maxLength={120}
                  style={{
                    border: formErrors.performer ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
                  }}
                />
                {formErrors.performer && <span style={{ color: 'red', fontSize: '14px' }}>{formErrors.performer}</span>}

                <input
                  type="datetime-local"
                  value={eventForm.start_time}
                  onChange={(e) => handleInputChange('start_time', e.target.value)}
                  onBlur={validateEventForm}
                  style={{
                    border: formErrors.start_time ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
                  }}
                />
                {formErrors.start_time && <span style={{ color: 'red', fontSize: '14px' }}>{formErrors.start_time}</span>}

                <input
                  type="datetime-local"
                  value={eventForm.end_time}
                  onChange={(e) => handleInputChange('end_time', e.target.value)}
                  onBlur={validateEventForm}
                  style={{
                    border: formErrors.end_time ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
                  }}
                />
                {formErrors.end_time && <span style={{ color: 'red', fontSize: '14px' }}>{formErrors.end_time}</span>}

                <input
                  type="number"
                  placeholder="Qty of Tickets"
                  value={eventForm.qty_tickets}
                  onChange={(e) => handleInputChange('qty_tickets', e.target.value)}
                  onBlur={validateEventForm}
                  min="0"
                  step="1"
                  style={{
                    border: formErrors.qty_tickets ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
                  }}
                />
                {formErrors.qty_tickets && <span style={{ color: 'red', fontSize: '14px' }}>{formErrors.qty_tickets}</span>}

                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <input
                      type="number"
                      placeholder="VIP Ticket Price"
                      value={eventForm.vip_ticket_price}
                      onChange={(e) => handleInputChange('vip_ticket_price', e.target.value)}
                      onBlur={validateEventForm}
                      min="0"
                      step="0.01"
                      style={{
                        border: formErrors.vip_ticket_price ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)',
                        marginBottom: '4px'
                      }}
                    />
                    {formErrors.vip_ticket_price && (
                      <span style={{ color: 'red', fontSize: '14px' }}>{formErrors.vip_ticket_price}</span>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <input
                      type="number"
                      placeholder="GA Ticket Price"
                      value={eventForm.ga_ticket_price}
                      onChange={(e) => handleInputChange('ga_ticket_price', e.target.value)}
                      onBlur={validateEventForm}
                      min="0"
                      step="0.01"
                      style={{
                        border: formErrors.ga_ticket_price ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)',
                        marginBottom: '4px'
                      }}
                    />
                    {formErrors.ga_ticket_price && (
                      <span style={{ color: 'red', fontSize: '14px' }}>{formErrors.ga_ticket_price}</span>
                    )}
                  </div>
                </div>

                <textarea
                  placeholder="Description"
                  value={eventForm.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  onBlur={validateEventForm}
                  rows={4}
                  style={{
                    border: formErrors.description ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
                  }}
                />
                {formErrors.description && <span style={{ color: 'red', fontSize: '14px' }}>{formErrors.description}</span>}

                <div style={{ width: '100%', marginBottom: '10px' }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Assign Staff</p>
                  {isAvailabilityLoading && eventForm.start_time && eventForm.end_time && (
                    <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}>Checking availability...</p>
                  )}
                  <div
                    style={{
                      border: '1px solid rgba(0, 0, 0, 0.2)',
                      borderRadius: '8px',
                      padding: '10px',
                      maxHeight: '180px',
                      overflowY: 'auto',
                      background: 'rgba(255, 255, 255, 0.6)'
                    }}
                  >
                    {visibleStaff.length === 0 ? (
                      <p style={{ margin: 0 }}>
                        {staff.length === 0 ? 'No staff available yet.' : 'No staff available for selected time range.'}
                      </p>
                    ) : (
                      visibleStaff.map((member) => {
                        const staffId = member.id;
                        const isChecked = eventForm.staff_ids.includes(staffId);
                        return (
                          <label
                            key={staffId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleStaffSelection(staffId)}
                              style={{
                                width: '16px',
                                height: '16px',
                                margin: 0,
                                marginBottom: 0,
                                padding: 0,
                                border: 'none',
                                borderRadius: 0,
                                display: 'inline-block'
                              }}
                            />
                            <span>{member.name} ({member.role || 'Role N/A'})</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="button-group">
                  <button onClick={handleAddEvent} disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Add Event'}
                  </button>
                  <button
                    onClick={() => {
                      setIsAddEventOpen(false);
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      </div>
      <Dialog open={isCancelOpen} onClose={() => {}} className="add-item-dialog">
        <div className="add-item-dialog-backdrop" />
        <div className="add-item-dialog-container">
          <DialogPanel className="add-item-dialog-panel">
            <DialogTitle className="add-item-header">Cancel Event</DialogTitle>

            <textarea
              placeholder="Enter cancellation reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="add-item-name-input"
            />

            <div className="button-group">
              <button onClick={handleDeleteEvent}>Confirm Cancel</button>
              <button onClick={() => setIsCancelOpen(false)}>Close</button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}

export default EventsUI;
