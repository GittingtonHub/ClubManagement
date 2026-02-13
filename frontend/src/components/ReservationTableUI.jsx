import { useEffect, useState } from 'react';

function ReservationTableUI() {
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    const fetchReservations = async () => {
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
    };

    fetchReservations();
  }, []);

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
          setReservations(reservations.filter((reservation) => {
            const id = reservation.reservation_id ?? reservation.id;
            return id !== reservationId;
          }));
        } else {
          console.error('Failed to delete reservation:', response.statusText);
        }
      } catch (error) {
        console.error('Failed to delete reservation:', error);
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
                  <td>
                    <button
                      className="delete-item-button"
                      onClick={() => handleDeleteReservation(reservationId)}
                    >
                      Delete
                    </button>
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
