
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
