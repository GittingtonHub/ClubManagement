import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

function Profile() {
   const { user } = useAuth();
   const [bio, setBio] = useState("");
   const [savedBio, setSavedBio] = useState("");
   const [isSaving, setIsSaving] = useState(false);
   const [bioMessage, setBioMessage] = useState("");
   const [reservations, setReservations] = useState([]);
   const [reservationMessage, setReservationMessage] = useState("");

   const username = user?.username || localStorage.getItem("userUsername") || "Unavailable";
   const email = user?.email || localStorage.getItem("userEmail") || "Unavailable";
   const userId = user?.id || localStorage.getItem("userId") || "Unavailable";
   const currentUserId = user?.id || localStorage.getItem("userId") || null;

   const [dayBoundaries] = useState(() => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(todayStart.getDate() + 1);
      return {
         todayStartMs: todayStart.getTime(),
         tomorrowStartMs: tomorrowStart.getTime()
      };
   });

   useEffect(() => {
      const loadBio = async () => {
         try {
            const response = await fetch("/api/profile.php", { credentials: "include" });
            const data = await response.json();

            if (response.ok) {
               const incomingBio = data.bio ?? "";
               setBio(incomingBio);
               setSavedBio(incomingBio);
            } else {
               setBioMessage(data.message || "Could not load bio");
            }
         } catch {
            setBioMessage("Could not load bio");
         }
      };

      loadBio();
   }, []);

   const fetchMyReservations = useCallback(async () => {
      if (!currentUserId) return;

      try {
         const response = await fetch("/api/reservations.php", {
            headers: { Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` }
         });

         const text = await response.text();
         const data = text ? JSON.parse(text) : [];

         const myReservations = (Array.isArray(data) ? data : []).filter(
            (r) => String(r.user_id) === String(currentUserId)
         );

         setReservations(myReservations);
      } catch {
         setReservationMessage("Could not load reservations");
      }
   }, [currentUserId]);

   useEffect(() => {
      fetchMyReservations();
   }, [fetchMyReservations]);

   const handleEdit = (id) => {
      window.location.href = `/reservations?edit=${id}`;
   };

   const handleCancelReservation = async (reservationId) => {
      if (!window.confirm("Cancel this reservation?")) return;

      try {
         const response = await fetch('/api/reservations.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               reservation_id: reservationId,
               status: 'cancelled'
            })
         });

         if (response.ok) {
            fetchMyReservations();
         }
      } catch {
         setReservationMessage("Could not cancel reservation");
      }
   };

   const reservationGroups = useMemo(() => {
      const past = [], today = [], future = [];

      reservations.forEach((r) => {
         const startMs = new Date(r.start_time).getTime();
         if (startMs < dayBoundaries.todayStartMs) past.push(r);
         else if (startMs < dayBoundaries.tomorrowStartMs) today.push(r);
         else future.push(r);
      });

      return { past, today, future };
   }, [reservations, dayBoundaries]);

   const formatDateTime = (value) => {
      const d = new Date(value);
      return isNaN(d) ? "" : d.toLocaleString();
   };

   return (
      <>
         <div className="profile-container">
            <h2>{username}</h2>
            <p>{email}</p>

            <textarea value={bio} onChange={(e) => setBio(e.target.value)} />

            <button onClick={async () => {
               await fetch("/api/profile.php", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ bio })
               });
               setSavedBio(bio);
            }}>
               Save
            </button>
         </div>

         <h3>Today's Reservations</h3>
         {reservationGroups.today.map(r => (
            <div key={r.reservation_id}>
               {r.service_type} - {formatDateTime(r.start_time)}
               <button onClick={() => handleEdit(r.reservation_id)}>Edit</button>
               <button onClick={() => handleCancelReservation(r.reservation_id)}>Cancel</button>
            </div>
         ))}

         <h3>Future Reservations</h3>
         {reservationGroups.future.map(r => (
            <div key={r.reservation_id}>
               {r.service_type} - {formatDateTime(r.start_time)}
               <button onClick={() => handleEdit(r.reservation_id)}>Edit</button>
               <button onClick={() => handleCancelReservation(r.reservation_id)}>Cancel</button>
            </div>
         ))}
      </>
   );
}

export default Profile;
