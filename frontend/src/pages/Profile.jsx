
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

function Profile() {
   const { user } = useAuth();
   const [bio, setBio] = useState("");
   const [savedBio, setSavedBio] = useState("");
   const [isSaving, setIsSaving] = useState(false);
   const [bioMessage, setBioMessage] = useState("");
   
   // --- NEW IMAGE UPLOAD STATE ---
   const [profileImage, setProfileImage] = useState("/url_icon.png");
   const [isUploading, setIsUploading] = useState(false);
   const [uploadMessage, setUploadMessage] = useState("");

   const [reservations, setReservations] = useState([]);
   const [reservationMessage, setReservationMessage] = useState("");
   const hasChanges = bio !== savedBio;
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
            const response = await fetch("/api/profile.php", {
               method: "GET",
               credentials: "include"
            });
            const data = await response.json();

            if (response.ok) {
               const incomingBio = data.bio ?? "";
               setBio(incomingBio);
               setSavedBio(incomingBio);
               setBioMessage("");
               
               // Grab the image from the database if it exists!
               if (data.profile_image) {
                  setProfileImage(data.profile_image);
               }
            } else {
               setBioMessage(data.message || "Could not load bio");
            }
         } catch {
            setBioMessage("Could not load bio");
         }
      };

      loadBio();
   }, []);

   // --- NEW UPLOAD FUNCTION ---
   const handleImageUpload = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      setIsUploading(true);
      setUploadMessage("");

      const formData = new FormData();
      formData.append('avatar', file);

      try {
         const response = await fetch('/api/upload_avatar.php', {
            method: 'POST',
            credentials: 'include', // Crucial for session auth!
            body: formData 
         });

         const data = await response.json();

         if (data.success) {
            setProfileImage(data.image_url);
            setUploadMessage("Image updated!");
         } else {
            setUploadMessage(data.message || "Upload failed.");
         }
      } catch (error) {
         setUploadMessage("Server error during upload.");
      } finally {
         setIsUploading(false);
      }
   };

   const fetchMyReservations = useCallback(async () => {
      if (!currentUserId) {
         setReservations([]);
         return;
      }

      try {
         const response = await fetch("/api/reservations.php", {
            method: "GET",
            credentials: "include",
            headers: {
               Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`
            }
         });

         const text = await response.text();
         const data = text ? JSON.parse(text) : [];

         if (!response.ok) {
            setReservationMessage("Could not load reservations");
            setReservations([]);
            return;
         }

         const myReservations = (Array.isArray(data) ? data : []).filter(
            (reservation) => String(reservation.user_id) === String(currentUserId)
         );
         setReservations(myReservations);
         setReservationMessage("");
      } catch {
         setReservations([]);
         setReservationMessage("Could not load reservations");
      }
   }, [currentUserId]);

   useEffect(() => {
      fetchMyReservations();
   }, [fetchMyReservations]);

   const handleSaveBio = async () => {
      setIsSaving(true);
      setBioMessage("");

      try {
         const response = await fetch("/api/profile.php", {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bio })
         });
         const data = await response.json();

         if (response.ok) {
            const updatedBio = data.bio ?? "";
            setBio(updatedBio);
            setSavedBio(updatedBio);
            setBioMessage("Bio saved.");
         } else {
            setBioMessage(data.message || "Could not save bio");
         }
      } catch {
         setBioMessage("Could not save bio");
      } finally {
         setIsSaving(false);
      }
   };

   const handleCancelReservation = async (reservationId) => {
      if (!window.confirm("Cancel this reservation?")) {
         return;
      }

      try {
         const response = await fetch(`/api/reservations.php?id=${reservationId}`, {
            method: "DELETE",
            credentials: "include",
            headers: {
               Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`
            }
         });

         if (!response.ok) {
            setReservationMessage("Could not cancel reservation");
            return;
         }

         setReservations((previousReservations) =>
            previousReservations.filter((reservation) => {
               const id = reservation.reservation_id ?? reservation.id;
               return String(id) !== String(reservationId);
            })
         );
         setReservationMessage("");
      } catch {
         setReservationMessage("Could not cancel reservation");
      }
   };

   const reservationGroups = useMemo(() => {
      const past = [];
      const today = [];
      const future = [];

      reservations.forEach((reservation) => {
         const startMs = new Date(reservation.start_time).getTime();
         if (Number.isNaN(startMs)) {
            return;
         }

         if (startMs < dayBoundaries.todayStartMs) {
            past.push(reservation);
         } else if (startMs < dayBoundaries.tomorrowStartMs) {
            today.push(reservation);
         } else {
            future.push(reservation);
         }
      });

      const sortByStartTime = (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      past.sort(sortByStartTime);
      today.sort(sortByStartTime);
      future.sort(sortByStartTime);

      return { past, today, future };
   }, [reservations, dayBoundaries.todayStartMs, dayBoundaries.tomorrowStartMs]);

   const formatDateTime = (value) => {
      if (!value) {
         return "";
      }
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString();
   };

   return (
      <>
         <div className="profile-container">
            <div className="profile-image-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "20px" }}>
               <img
                  src={profileImage}
                  alt="User profile"
                  className="profile-image"
                  style={{ width: "100px", height: "100px", borderRadius: "50%", objectFit: "cover", marginBottom: "10px" }}
               />
               
               {/* THE UPLOAD BUTTON */}
               <label style={{ cursor: "pointer", color: "blue", textDecoration: "underline", fontSize: "14px" }}>
                  <input 
                     type="file" 
                     accept="image/png, image/jpeg, image/webp" 
                     onChange={handleImageUpload} 
                     disabled={isUploading} 
                     style={{ display: "none" }} 
                  />
                  {isUploading ? "Uploading..." : "Change Picture"}
               </label>
               {uploadMessage && <p style={{ fontSize: "12px", marginTop: "5px" }}>{uploadMessage}</p>}
            </div>

            <div className="profile-details-container">
               <h2>User Profile</h2>

               <p className="profile-label">Username</p>
               <p className="profile-value" id="profile-username">
                  {username}
               </p>

               <p className="profile-label">Email</p>
               <p className="profile-value" id="profile-email">
                  {email}
               </p>

               <p className="profile-label">User ID</p>
               <p className="profile-value" id="profile-id">
                  {userId}
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
                  <button type="button" onClick={handleSaveBio} disabled={isSaving}>
                     {isSaving ? "Saving..." : "Save"}
                  </button>
                  <button type="button" onClick={() => setBio(savedBio)} disabled={isSaving}>
                     Cancel
                  </button>
               </div>
            ) : null}
            {bioMessage ? <p className="profile-value">{bioMessage}</p> : null}
         </div>

         {/* --- RESERVATIONS SECTIONS BELOW REMAIN EXACTLY THE SAME --- */}
         <div className="profile-reservations-container">
            <div className="profile-reservations-past">
               <h3>Past Reservations</h3>
               {reservationGroups.past.length === 0 ? (
                  <p className="profile-reservation-placeholder">No past reservations.</p>
               ) : (
                  <table className="profile-reservations-table">
                     <thead>
                        <tr className="table-header">
                           <th>Service Type</th>
                           <th>Start</th>
                           <th>End</th>
                        </tr>
                     </thead>
                     <tbody>
                        {reservationGroups.past.map((reservation) => {
                           const id = reservation.reservation_id ?? reservation.id;
                           return (
                              <tr className="table-row" key={id}>
                                 <td>{reservation.service_type}</td>
                                 <td>{formatDateTime(reservation.start_time)}</td>
                                 <td>{formatDateTime(reservation.end_time)}</td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               )}
            </div>

            <div className="profile-reservations-today">
               <h3>Today&apos;s Reservations</h3>
               {reservationGroups.today.length === 0 ? (
                  <p className="profile-reservation-placeholder">No reservations for today.</p>
               ) : (
                  <table className="profile-reservations-table">
                     <thead>
                        <tr className="table-header">
                           <th>Service Type</th>
                           <th>Start</th>
                           <th>End</th>
                           <th>Actions</th>
                        </tr>
                     </thead>
                     <tbody>
                        {reservationGroups.today.map((reservation) => {
                           const id = reservation.reservation_id ?? reservation.id;
                           return (
                              <tr className="table-row" key={id}>
                                 <td>{reservation.service_type}</td>
                                 <td>{formatDateTime(reservation.start_time)}</td>
                                 <td>{formatDateTime(reservation.end_time)}</td>
                                 <td>
                                    <button
                                       type="button"
                                       className="profile-reservation-action-button"
                                       onClick={() => handleCancelReservation(id)}
                                    >
                                       Cancel
                                    </button>
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               )}
            </div>

            <div className="profile-reservations-future">
               <h3>Future Reservations</h3>
               {reservationGroups.future.length === 0 ? (
                  <p className="profile-reservation-placeholder">No future reservations.</p>
               ) : (
                  <table className="profile-reservations-table">
                     <thead>
                        <tr className="table-header">
                           <th>Service Type</th>
                           <th>Start</th>
                           <th>End</th>
                           <th>Actions</th>
                        </tr>
                     </thead>
                     <tbody>
                        {reservationGroups.future.map((reservation) => {
                           const id = reservation.reservation_id ?? reservation.id;
                           return (
                              <tr className="table-row" key={id}>
                                 <td>{reservation.service_type}</td>
                                 <td>{formatDateTime(reservation.start_time)}</td>
                                 <td>{formatDateTime(reservation.end_time)}</td>
                                 <td>
                                    <button
                                       type="button"
                                       className="profile-reservation-action-button"
                                       onClick={() => handleCancelReservation(id)}
                                    >
                                       Cancel
                                    </button>
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               )}
            </div>
         </div>
         {reservationMessage ? <p className="profile-value">{reservationMessage}</p> : null}
      </>
   );
}

export default Profile;
