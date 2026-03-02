<<<<<<< HEAD

import { useState } from "react";

function Profile() {
   const [bio, setBio] = useState("");
   const initialBio = "";
   const hasChanges = bio !== initialBio;

   return (
      <>
         <div className="profile-container">
            <div className="profile-image-container">
               <img
                  src="/url_icon.png"
                  alt="User profile"
                  className="profile-image"
               />
            </div>

            <div className="profile-details-container">
               <h2>User Profile</h2>

               <p className="profile-label">Username</p>
               <p className="profile-value" id="profile-username">
                  Loading username...
               </p>

               <p className="profile-label">Email</p>
               <p className="profile-value" id="profile-email">
                  Loading email...
               </p>

               <p className="profile-label">User ID</p>
               <p className="profile-value" id="profile-id">
                  Loading user ID...
               </p>

               <label className="profile-label" htmlFor="profile-bio">
                  Biography
               </label>
               <textarea
                  id="profile-bio"
                  className="profile-bio-input"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Write a short biography here..."
                  rows={4}
               />
            </div>

            {hasChanges ? (
               <div className="profile-buttons-container">
                  <button type="button">Save</button>
                  <button type="button" onClick={() => setBio(initialBio)}>
                     Cancel
                  </button>
               </div>
            ) : null}
         </div>

         <div className="profile-reservations-container">
            <div className="profile-reservations-past">
               <h3>Past Reservations</h3>
               <p className="profile-reservation-placeholder">
                  Reservations that already occurred will render here.
               </p>
            </div>

            <div className="profile-reservations-today">
               <h3>Today&apos;s Reservations</h3>
               <p className="profile-reservation-placeholder">
                  Today&apos;s reservations will render here.
               </p>
            </div>

            <div className="profile-reservations-future">
               <h3>Future Reservations</h3>
               <p className="profile-reservation-placeholder">
                  Upcoming reservations will render here.
               </p>
            </div>
         </div>
      </>
   );
}

export default Profile;
=======
import { useEffect, useState } from "react";

function Profile() {
  const [user, setUser] = useState(null);
  const [bio, setBio] = useState("");
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    const userId = localStorage.getItem("userId");

    if (!userId) return;

    fetch("/api/reservations.php")
      .then(res => res.json())
      .then(data => {
        const userReservations = data.filter(r => 
          String(r.user_id) === String(userId)
        );
        setReservations(userReservations);
      });

    setUser({
      id: userId,
      email: localStorage.getItem("userEmail")
    });
  }, []);

  const now = new Date();

  const past = reservations.filter(r => new Date(r.end_time) < now);
  const today = reservations.filter(r => {
    const start = new Date(r.start_time);
    return start.toDateString() === now.toDateString();
  });
  const future = reservations.filter(r => new Date(r.start_time) > now);

  return (
    <div style={{ padding: "40px" }}>
      <h2>User Profile</h2>

      {user && (
        <>
          <p><strong>User ID:</strong> {user.id}</p>
          <p><strong>Email:</strong> {user.email}</p>

          <img 
            src="/default.png" 
            alt="Profile" 
            width="120"
          />

          <div>
            <h3>Biography</h3>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write something about yourself..."
              rows={4}
              cols={50}
            />
          </div>
        </>
      )}

      <hr />

      <h3>Past Reservations</h3>
      {past.map(r => <p key={r.reservation_id}>{r.service_type}</p>)}

      <h3>Today's Reservations</h3>
      {today.map(r => <p key={r.reservation_id}>{r.service_type}</p>)}

      <h3>Future Reservations</h3>
      {future.map(r => <p key={r.reservation_id}>{r.service_type}</p>)}
    </div>
  );
}

export default Profile;
>>>>>>> 526fa97a3b7d8b81a85ead3861e5b65dbe5eeb21
