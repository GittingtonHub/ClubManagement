import { useCallback, useEffect, useState } from 'react';
import { DayPilot } from "@daypilot/daypilot-lite-react";
import { useAuth } from "../context/AuthContext";

function ReservationTableUI() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [resources, setResources] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [eventOptions, setEventOptions] = useState([]);
  const userId = user?.id || localStorage.getItem("userId") || "Unavailable";
  const currentUserId = user?.id || localStorage.getItem("userId") || null;

  const fetchReservations = useCallback(async () => {


      if (localStorage.getItem('permissionStatus') == 'user')
      {
         if (!currentUserId) {
         setReservations([]);
         return;
         }
      console.log(localStorage.getItem("authToken"))

      try {
          console.log("i works")
         const response = await fetch("/api/reservations.php", {
            method: "GET",
            credentials: "include",
            headers: {
               Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`
            }
         });

         const text = await response.text();
         const data = text ? JSON.parse(text) : [];
           console.log("here works")
         if (!response.ok) {
            //setReservationMessage("Could not load reservations");
            console.log("could not load reservations")
            setReservations([]);
            return;
         }
  console.log("a works")  
         const myReservations = (Array.isArray(data) ? data : []).filter(
            (reservation) => String(reservation.user_id) === String(currentUserId)
         );
           console.log("uhoh works")
         setReservations(myReservations);
                 console.log("could not load reservations")
         //setReservationMessage("");
      } catch {
         setReservations([]);
                 console.log("could not load reservations")
         //setReservationMessage("Could not load reservations"); 
      }
      return;
      }
      else
      {
      try {
        const response = await fetch('/api/reservations.php', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
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
    }
  }, []);

  const fetchFormOptions = useCallback(async () => {
    try {
      const [resourcesResponse, sectionsResponse, eventsResponse] = await Promise.all([
        fetch('/api/inventory.php'),
        fetch('/api/sections.php'),
        fetch('/api/events.php')
      ]);

      const resourcesJson = await resourcesResponse.json();
      const sectionsJson = await sectionsResponse.json();
      const eventsJson = await eventsResponse.json();

      const resourcesData = Array.isArray(resourcesJson) ? resourcesJson : [];
      const sectionsData = Array.isArray(sectionsJson) ? sectionsJson : [];
      const eventsData = Array.isArray(eventsJson) ? eventsJson : [];

      setResources(resourcesData.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description
      })));
      setSectionOptions(sectionsData.map((s) => ({
        id: s.section_number,
        name: String(s.section_number)
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
    fetchReservations();
    fetchFormOptions();
    const handleRefresh = () => fetchReservations();
    window.addEventListener('reservations:changed', handleRefresh);
    return () => window.removeEventListener('reservations:changed', handleRefresh);
  }, [fetchReservations, fetchFormOptions]);

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

    if (resource.name === "Bottle Service Silver" || resource.name === "Bottle Service Gold") {
      return [
        base[0],
        base[1],
        { name: "Section Number", id: "section_number", type: "select", options: sectionOptions },
        { name: "Guest Count", id: "guest_count", type: "number" },
        { name: "Minimum Spend", id: "minimum_spend", type: "number" },
        base[2],
        base[3],
        base[4]
      ];
    }

    if (resource.name === "Event Ticket GA" || resource.name === "Event Ticket VIP") {
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

  const handleDeleteReservation = async (reservationId) => {
    if (window.confirm('Are you sure you want to delete this reservation?')) {
      try {
        const response = await fetch(`/api/reservations.php?id=${reservationId}` , {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });

        if (response.ok) {
          setReservations((prevReservations) => prevReservations.filter((reservation) => {
            const id = reservation.reservation_id ?? reservation.id;
            return id !== reservationId;
          }));
          window.dispatchEvent(new Event('reservations:changed'));
        } else {
          console.error('Failed to delete reservation:', response.statusText);
        }
      } catch (error) {
        console.error('Failed to delete reservation:', error);
      }
    }
  };

  const handleEditReservation = async (reservation) => {
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
      section_number: reservation.section_number ?? '',
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

      const payload = {
        reservation_id: reservationId,
        user_id: reservation.user_id,
        resource_id: reservation.resource_id,
        service_type: reservation.service_type,
        status: modalData.status,
        start_time: toApiDateTime(modalData.start),
        end_time: toApiDateTime(modalData.end)
      };

      if (resource.name === "Bottle Service Silver" || resource.name === "Bottle Service Gold") {
        payload.section_number = modalData.section_number;
        payload.guest_count = modalData.guest_count;
        payload.minimum_spend = modalData.minimum_spend;
        if (!payload.section_number || !payload.guest_count || !payload.minimum_spend) {
          alert('Please fill out section number, guest count, and minimum spend.');
          continue;
        }
      }

      if (resource.name === "Event Ticket GA" || resource.name === "Event Ticket VIP") {
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

  return (
    <>
      <div className="table-div" id="reservations-table-div">
        {reservations.length === 0 ? (
          <p className="no-items-message">No reservations available.</p>
        ) : (
          <table className="inventory-table" id="reservations-table">
            <tr className="table-header">
              <th>Reservation No.</th>
              <th>Reservation ID</th>
              <th>User ID</th>
              <th>Service Type</th>
              <th>Status</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>

            {reservations.map((reservation, index) => {
              const reservationId = reservation.reservation_id ?? reservation.id;
              return (
                <tr className="table-row" key={reservationId ?? index}>
                  <td className="table-cell-itemno">{index + 1}</td>
                  <td>{reservationId}</td>
                  <td>{reservation.user_id}</td>
                  <td>{reservation.service_type}</td>
                  <td>{reservation.status}</td>
                  <td>{reservation.start_time ? new Date(reservation.start_time).toLocaleString() : ''}</td>
                  <td>{reservation.end_time ? new Date(reservation.end_time).toLocaleString() : ''}</td>
                  <td>{reservation.created_at ? new Date(reservation.created_at).toLocaleString() : ''}</td>
                  <td className="reservation-actions-cell">
                    <div className="reservation-actions-buttons">
                      <button
                        className="edit-item-button"
                        onClick={() => handleEditReservation(reservation)}
                      >
                        Edit
                      </button>
                    <button
                      className="delete-item-button"
                      onClick={() => handleDeleteReservation(reservationId)}
                      // if user = normal do cancel reservation instead, whatever that means
                      // also change v delete to cancel if that's the case
                    >
                      Delete
                    </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </table>
        )}
      </div>
    </>
  );
}

export default ReservationTableUI;
