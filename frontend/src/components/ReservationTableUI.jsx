import { useCallback, useEffect, useState } from 'react';
import { DayPilot } from "@daypilot/daypilot-lite-react";
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { dispatchNamedTemplateEmails } from '../lib/emailDispatch';

function ReservationTableUI({ 
  title, 
  reservations: profileReservations, 
  type, 
  isAssigned, 
  onInfo, 
  onCancel: profileCancel, 
  ratingState, 
  onRatingChange, 
  onSaveRating 
}) {
  // const [ratingByReservation, setRatingByReservation] = useState({});
  const [reservations, setReservations] = useState([]);
  const [resources, setResources] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [eventOptions, setEventOptions] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedReservationId, setSelectedReservationId] = useState(null);

  const parseStaffIds = (value) => {
    if (Array.isArray(value)) {
      return value
        .map((item) => Number.parseInt(item, 10))
        .filter(Number.isInteger);
    }

    if (typeof value === 'string' && value.trim() !== '') {
      return value
        .split(',')
        .map((item) => Number.parseInt(item.trim(), 10))
        .filter(Number.isInteger);
    }

    return [];
  };

  const fetchReservations = useCallback(async () => {
    try {
      const response = await fetch('/api/reservations.php', {
        credentials: 'include'
      });
  
      const text = await response.text();
      if (!text) {
        setReservations([]);
        return;
      }
  
      const data = JSON.parse(text);
      setReservations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch reservations:', error);
      setReservations([]);
    }
  }, []);

  const fetchFormOptions = useCallback(async () => {
    try {
      const [resourcesResponse, sectionsResponse, eventsResponse] = await Promise.all([
        fetch('/api/resources.php', { credentials: 'include' }),
        fetch('/api/sections.php', { credentials: 'include' }),
        fetch('/api/events.php', { credentials: 'include' })
      ]);

      if (!resourcesResponse.ok || !sectionsResponse.ok || !eventsResponse.ok) {
        throw new Error(
          `Form options request failed (resources=${resourcesResponse.status}, sections=${sectionsResponse.status}, events=${eventsResponse.status})`
        );
      }

      const [resourcesJson, sectionsJson, eventsJson] = await Promise.all([
        resourcesResponse.json().catch(() => []),
        sectionsResponse.json().catch(() => []),
        eventsResponse.json().catch(() => [])
      ]);

      const resourcesData = Array.isArray(resourcesJson) ? resourcesJson : [];
      const sectionsData = Array.isArray(sectionsJson) ? sectionsJson : [];
      const eventsData = Array.isArray(eventsJson) ? eventsJson : [];

      setResources(resourcesData.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        description: r.description
      })));

      setSectionOptions(sectionsData.map((s) => ({
        id: s.table_section_id,
        name: String(s.section_number ?? s.table_section_id)
      })));

      setEventOptions(eventsData.map((e) => ({
        id: e.event_id,
        name: String(e.event_id)
      })));
      
    } catch (error) {
      console.error('Failed to fetch form options:', error);
      setResources([]);
      setSectionOptions([]);
      setEventOptions([]);
    }
  }, []);

  useEffect(() => {
    // Skip fetching if this is being used in the Profile layout
    if (type) return; 

    fetchReservations();
    fetchFormOptions();
    const handleRefresh = () => fetchReservations();
    window.addEventListener('reservations:changed', handleRefresh);
    return () => window.removeEventListener('reservations:changed', handleRefresh);
  }, [fetchReservations, fetchFormOptions, type]);

  const buildReservationForm = useCallback((resource) => {
    const base = [
      { name: "Resource", id: "resource", type: "select", options: resources, disabled: true },
      { name: "Description", id: "resource_description", type: "textarea", disabled: true },
      {
        name: "Status",
        id: "status",
        type: "select",
        options: [
          { id: "pending", name: "pending" },
          { id: "confirmed", name: "confirmed" },
          { id: "cancelled", name: "cancelled" }
        ]
      },
      { name: "Start", id: "start", type: "datetime" },
      { name: "End", id: "end", type: "datetime" }
    ];

    if (!resource) {
      return base;
    }

    if (resource.type === "bottle_service") {
      return [
        base[0],
        base[1],
        { name: "Section", id: "table_section_id", type: "select", options: sectionOptions },
        { name: "Guest Count", id: "guest_count", type: "number" },
        { name: "Minimum Spend", id: "minimum_spend", type: "number" },
        base[2],
        base[3],
        base[4]
      ];
    }

    if (resource.type === "event_ticket") { 
      return [
        base[0],
        base[1],
        { name: "Event ID", id: "event_id", type: "select", options: eventOptions },
        { name: "Ticket Tier", id: "ticket_tier", type: "text", disabled: true },
        { name: "Quantity", id: "quantity", type: "number" },
        base[2],
        base[3],
        base[4]
      ];
    }

    return base;
  }, [resources, sectionOptions, eventOptions]);

  const toApiDateTime = (value) => (value && typeof value.toString === "function" ? value.toString() : value);

  const normalizeAvailabilityRows = (payload) => {
    if (Array.isArray(payload?.data)) {
      return payload.data;
    }
    if (Array.isArray(payload)) {
      return payload;
    }
    return [];
  };

  const isAvailabilityFlagTruthy = (value) => {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return !['0', 'false', 'no', 'n', 'off', ''].includes(normalized);
    }
    return Boolean(value);
  };

  const getWeekdayName = (dateValue) =>
    dateValue.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  const parseTimeToMinutes = (timeValue) => {
    if (typeof timeValue !== 'string' || timeValue.trim() === '') {
      return null;
    }

    const match = timeValue.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) {
      return null;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }

    return (hours * 60) + minutes;
  };

  const isEntryCoveringWindow = (entry, startDate, endDate) => {
    const availabilityFlag = entry?.is_available ?? entry?.available ?? entry?.isAvailable ?? 1;
    if (!isAvailabilityFlagTruthy(availabilityFlag)) {
      return false;
    }

    const dayOfWeek = String(entry?.day_of_week ?? '').trim().toLowerCase();
    if (dayOfWeek) {
      const selectedDay = getWeekdayName(startDate);
      if (dayOfWeek !== selectedDay) {
        return false;
      }

      const entryStartMinutes = parseTimeToMinutes(String(entry?.start_time ?? ''));
      const entryEndMinutes = parseTimeToMinutes(String(entry?.end_time ?? ''));
      if (entryStartMinutes === null || entryEndMinutes === null) {
        return false;
      }

      const selectedStartMinutes = (startDate.getHours() * 60) + startDate.getMinutes();
      const selectedEndMinutes = (endDate.getHours() * 60) + endDate.getMinutes();

      return selectedStartMinutes >= entryStartMinutes && selectedEndMinutes <= entryEndMinutes;
    }

    const entryStartDate = new Date(entry?.start_time ?? '');
    const entryEndDate = new Date(entry?.end_time ?? '');
    if (Number.isNaN(entryStartDate.getTime()) || Number.isNaN(entryEndDate.getTime())) {
      return false;
    }

    return startDate >= entryStartDate && endDate <= entryEndDate;
  };

  const handleDeleteReservation = (reservationId) => {
    setSelectedReservationId(reservationId);
    setShowCancelModal(true);
  };

  const submitCancellation = async () => {  
    if (!cancelReason.trim()) {
      alert('Please provide a cancellation reason.');
      return;
    }
  
    try {
      const cancelledReservation = reservations.find((reservation) => {
        const reservationId = reservation?.reservation_id ?? reservation?.id;
        return String(reservationId) === String(selectedReservationId);
      });

      const response = await fetch(
        `/api/reservations.php?id=${selectedReservationId}&reason=${encodeURIComponent(cancelReason)}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );
    
      if (response.ok) {
        const role = String(localStorage.getItem('userRole') || 'user').trim().toLowerCase();
        const actorName =
          localStorage.getItem('userUsername') ||
          localStorage.getItem('username') ||
          'User';
        const currentUserId = Number.parseInt(localStorage.getItem('userId') || '', 10);
        const reservationUserId = Number.parseInt(cancelledReservation?.user_id, 10);
        const staffIds = parseStaffIds(cancelledReservation?.staff_ids);

        const userRecipients = Number.isInteger(reservationUserId)
          ? [{ id: reservationUserId, name: `User #${reservationUserId}` }]
          : [];
        const staffRecipients = staffIds.map((staffId) => ({
          id: `staff-${staffId}`,
          name: `Staff #${staffId}`
        }));

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

        const serviceType = cancelledReservation?.service_type || 'reservation';
        const timeWindow = `${cancelledReservation?.start_time || ''} - ${cancelledReservation?.end_time || ''}`;
        let message = `Reservation #${selectedReservationId} (${serviceType}) was cancelled by ${actorName} (${role}).`;
        if (role === 'admin' || role === 'staff') {
          message += ` Reason: ${cancelReason.trim()}`;
        }

        if (recipients.length > 0) {
          const emailSummary = await dispatchNamedTemplateEmails({
            templateType: 'SR-BU',
            title: `${role.toUpperCase()} Reservation Cancellation #${selectedReservationId}`,
            timeWindow,
            message,
            recipients
          });
          console.info('[EMAIL_TRIGGER_FRONTEND] Reservation cancelled; frontend email dispatch summary:', emailSummary);
        }

        setShowCancelModal(false);
        setCancelReason('');
        setSelectedReservationId(null);
  
        window.dispatchEvent(new Event('reservations:changed'));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const checkStaffAvailability = async (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      return {
        level: 'warning',
        message: 'The selected time range looks invalid. The server will reject invalid ranges.'
      };
    }

    try {
      const response = await fetch('/api/availability.php', {
        credentials: 'include'
      });

      if (!response.ok) {
        return {
          level: 'info',
          message: 'Could not pre-check staff availability right now. Save will still run full server-side validation.'
        };
      }

      const payload = await response.json().catch(() => ({}));
      const rows = normalizeAvailabilityRows(payload).filter(Boolean);

      if (rows.length === 0) {
        return {
          level: 'info',
          message: 'No availability schedule rows were returned. Save will rely on server-side staff assignment checks.'
        };
      }

      const hasAnyCoverage = rows.some((entry) => isEntryCoveringWindow(entry, startDate, endDate));
      if (!hasAnyCoverage) {
        return {
          level: 'warning',
          message: 'Heads up: no availability row matches this time window. You can still continue, and the server will make the final decision.'
        };
      }

      return { level: 'ok', message: '' };
    } catch (error) {
      console.error('Failed to pre-check staff availability:', error);
      return {
        level: 'info',
        message: 'Could not pre-check staff availability due to a network issue. Save will still run server-side validation.'
      };
    }
  };

  const handleEditReservation = async (reservation) => {
    if (String(reservation?.status ?? '').toLowerCase() === 'cancelled') {
      alert('Cancelled reservations cannot be edited.');
      return;
    }

    const reservationId = reservation.reservation_id ?? reservation.id;
    const resource = resources.find((r) => String(r.id) === String(reservation.resource_id));

    if (!resource) {
      alert('Resource info is not loaded yet. Please try again.');
      return;
    }

    let modalData = {
      resource: reservation.resource_id,
      resource_description: resource.description || reservation.resource_description || '',
      status: reservation.status || 'pending',
      start: reservation.start_time,
      end: reservation.end_time,
      table_section_id: reservation.table_section_id ?? '',
      guest_count: reservation.guest_count ?? '',
      minimum_spend: reservation.minimum_spend ?? '',
      event_id: reservation.event_id ?? '',
      ticket_tier: reservation.ticket_tier || (resource.name === 'Event Ticket VIP' ? 'VIP' : 'GA'),
      quantity: reservation.quantity ?? ''
    };

    while (true) {
      const modal = await DayPilot.Modal.form(buildReservationForm(resource), modalData);
      if (modal.canceled) {
        return;
      }
      modalData = { ...modalData, ...modal.result };

      const availabilityFeedback = await checkStaffAvailability(modalData.start, modalData.end);
      if (availabilityFeedback.level === 'warning') {
        const continueWithServerValidation = window.confirm(
          `${availabilityFeedback.message}\n\nSelect "OK" to continue and let the server validate, or "Cancel" to adjust the time.`
        );
        if (!continueWithServerValidation) {
          continue;
        }
      } else if (availabilityFeedback.level === 'info') {
        alert(availabilityFeedback.message);
      }

      const payload = {
        reservation_id: reservationId,
        user_id: reservation.user_id,
        resource_id: reservation.resource_id,
        service_type: reservation.service_type,
        status: modalData.status,
        start_time: toApiDateTime(modalData.start),
        end_time: toApiDateTime(modalData.end)
      };

       if (resource.type === "bottle_service") {
        payload.table_section_id = modalData.table_section_id;
        payload.guest_count = modalData.guest_count;
        payload.minimum_spend = modalData.minimum_spend;
        if (!payload.table_section_id || !payload.guest_count || !payload.minimum_spend) {
          alert('Please fill out section, guest count, and minimum spend.');
          continue;
        }
      }

       if (resource.type === "event_ticket") {
        payload.event_id = modalData.event_id;
        payload.ticket_tier = modalData.ticket_tier;
        payload.quantity = modalData.quantity;
        if (!payload.event_id || !payload.ticket_tier || !payload.quantity) {
          alert('Please fill out event ID and quantity.');
          continue;
        }
      }

      try {
        const response = await fetch('/api/reservations.php', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          await fetchReservations();
          window.dispatchEvent(new Event('reservations:changed'));
          return;
        }

        let message = 'Could not update reservation.';
        try {
          const errorData = await response.json();
          message = errorData.message || message;
        } catch {
          // keep fallback message
        }
        alert(message);
      } catch (error) {
        console.error('Failed to update reservation:', error);
        alert('Failed to update reservation.');
      }
    }
  };

  // ==========================================
  // RENDER LOGIC: PROFILE MODE VS ADMIN MODE
  // ==========================================

  if (type) {
    const displayReservations = profileReservations || [];

    if (displayReservations.length === 0) {
      return (
        <div className="profile-reservations-future w-full bg-white p-4 rounded shadow-sm border mb-4">
          <h3 className="text-lg font-bold mb-2">{title}</h3>
          <p className="profile-reservation-placeholder text-gray-500 italic">No {type} reservations.</p>
        </div>
      );
    }

    return (
      <div className="profile-reservations-future w-full bg-white p-4 rounded shadow-sm border mb-4">
        <h3 className="text-lg font-bold mb-4 border-b pb-2">{title}</h3>
        <div className="overflow-x-auto">
          <table className="profile-reservations-table w-full text-left border-collapse">
            <thead>
              <tr className="table-header bg-gray-50 text-gray-700">
                <th className="p-2 border-b">Service</th>
                <th className="p-2 border-b">Start</th>
                <th className="p-2 border-b">End</th>
                <th className="p-2 border-b">{type === 'past' ? 'Rating' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {displayReservations.map((reservation) => {
                const id = reservation.reservation_id ?? reservation.id;
                const isCancelled = String(reservation.status ?? '').toLowerCase() === 'cancelled';
                
                return (
                  <tr className="table-row hover:bg-gray-50 border-b" key={id}>
                    <td className="p-2">
                      {isCancelled ? (
                        <span className="text-red-600 font-bold text-xs uppercase px-2 py-1 bg-red-50 rounded">
                          Cancelled
                        </span>
                      ) : isAssigned ? (
                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          onClick={() => onInfo && onInfo(id)}
                        >
                          Info
                        </button>
                      ) : type === 'past' ? (
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              style={{
                                cursor: "pointer",
                                fontSize: "18px",
                                color: (ratingState?.[id] || 0) >= star ? "gold" : "gray"
                              }}
                              onClick={() => onRatingChange && onRatingChange(id, star)}
                            >
                              ★
                            </span>
                          ))}

                          <button
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                            onClick={() => onSaveRating && onSaveRating(id)}
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="text-red-600 hover:text-red-800 font-medium text-sm"
                          onClick={() => profileCancel && profileCancel(id)}
                        >
                          Cancel
                        </button>
                      )}
                    </td>                 
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- ADMIN MODE: Returns your original complex table ---
  return (
    <div>
      <div className="table-div" id="reservations-table-div">
        {reservations.length === 0 ? (
          <p className="no-items-message">No reservations available.</p>
        ) : (
          <table className="inventory-table" id="reservations-table">
            <thead>
              <tr className="table-header">
                <th>Reservation No.</th>
                <th>Reservation ID</th>
                <th>User ID</th>
                <th>Service Type</th>
                <th>Status</th>
                <th>Cancelled By</th>
                <th>Reason</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation, index) => {
                const reservationId = reservation.reservation_id ?? reservation.id;
                const isCancelled = String(reservation.status ?? '').toLowerCase() === 'cancelled';
                return (
                  <tr className="table-row" key={reservationId ?? index}>
                    <td>{index + 1}</td>
                    <td>{reservationId}</td>
                    <td>{reservation.user_id ?? '—'}</td>
                    <td>{reservation.service_type ?? '—'}</td>
                    <td>{reservation.status ?? '—'}</td>
                    <td>{reservation.cancelled_by ?? '—'}</td>
                    <td>{reservation.cancel_reason ?? '—'}</td>
                    <td>{reservation.start_time ? new Date(reservation.start_time).toLocaleString() : '—'}</td>
                    <td>{reservation.end_time ? new Date(reservation.end_time).toLocaleString() : '—'}</td>
                    <td>{reservation.created_at ? new Date(reservation.created_at).toLocaleString() : '—'}</td>
                    <td className="reservation-actions-cell">
                      <div className="reservation-actions-buttons">
                        {isCancelled ? (
                          <span className="rating-controls">Cancelled</span>
                        ) : (
                          <>
                            <button
                              className="edit-item-button"
                              onClick={() => handleEditReservation(reservation)}
                            >
                              Edit
                            </button>
                            <button
                              className="delete-item-button"
                              onClick={() => handleDeleteReservation(reservationId)}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <Dialog open={showCancelModal} onClose={() => setShowCancelModal(false)} className="add-item-dialog">
          <div className="add-item-dialog-backdrop" />
          <div className="add-item-dialog-container">
            <DialogPanel className="add-item-dialog-panel">
              <DialogTitle className="add-item-header">Cancel Reservation</DialogTitle>

              <textarea
                placeholder="Enter cancellation reason..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="add-item-name-input"
              />

              <div className="button-group">
                <button onClick={submitCancellation}>Confirm Cancel</button>
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                    setSelectedReservationId(null);
                  }}
                >
                  Close
                </button>
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      </div>
    </div>
  );
}

export default ReservationTableUI;