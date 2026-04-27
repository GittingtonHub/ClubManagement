import AvailabilityUI from "./AvailabilityUI";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { dispatchNamedTemplateEmails } from "../lib/emailDispatch";
import ReservationTableUI from './ReservationTableUI';

function StaffProfile() {
   
   const { user } = useAuth();
   const [bio, setBio] = useState("");
   const [savedBio, setSavedBio] = useState("");
   const [isSaving, setIsSaving] = useState(false);
   const [bioMessage, setBioMessage] = useState("");
   
   const [reservations, setReservations] = useState([]);
   const [reservationMessage, setReservationMessage] = useState("");
   const [isCancelOpen, setIsCancelOpen] = useState(false);
   const [cancelReason, setCancelReason] = useState('');
   const [profileImageSrc, setProfileImageSrc] = useState("/url_icon.png");
   const [isUploadImageOpen, setIsUploadImageOpen] = useState(false);
   const [isReservationInfoOpen, setIsReservationInfoOpen] = useState(false);
   const [selectedReservationId, setSelectedReservationId] = useState(null);
   const [selectedImageFile, setSelectedImageFile] = useState(null);
   const [selectedImagePreview, setSelectedImagePreview] = useState("");
   const [isUploadingImage, setIsUploadingImage] = useState(false);
   const [imageUploadError, setImageUploadError] = useState("");
   const [imageUploadMessage, setImageUploadMessage] = useState("");
   const [ratingByReservation, setRatingByReservation] = useState({});
   const [staffDetails, setStaffDetails] = useState({
      employeeId: null,
      role: "",
      hourlyRate: null,
      contractType: ""
   });

   const hasChanges = bio !== savedBio;
   const username = user?.username || localStorage.getItem("userUsername") || "Unavailable";
   const email = user?.email || localStorage.getItem("userEmail") || "Unavailable";
   const userId = user?.id || localStorage.getItem("userId") || "Unavailable";
   const currentUserId = user?.id || localStorage.getItem("userId") || null;
   const profileImageUploadPath = import.meta.env.VITE_PFP_UPLOAD_PATH || "";
   const profileImageUploadEndpoint = import.meta.env.VITE_PROFILE_IMAGE_UPLOAD_ENDPOINT || "";
   const displayUploadPath = profileImageUploadPath || "Server .env (DB_PFP_PATH)";
   const employeeId = staffDetails.employeeId ?? "Unavailable";
   const staffRole = staffDetails.role || "Unavailable";

   const formatHourlyRate = (value) => {
      if (value === null || value === undefined || value === "") {
         return "Unavailable";
      }

      const parsedRate = Number.parseFloat(value);
      return Number.isFinite(parsedRate) ? `$${parsedRate.toFixed(2)}` : "Unavailable";
   };

   const formatContractType = (value) => {
      if (!value || typeof value !== "string") {
         return "Unavailable";
      }

      return value
         .split("_")
         .join(" ")
         .replace(/\b\w/g, (char) => char.toUpperCase());
   };

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
               const incomingStaff = data?.staff && typeof data.staff === "object" ? data.staff : null;
               setBio(incomingBio);
               setSavedBio(incomingBio);
               setBioMessage("");

               if (incomingStaff) {
                  setStaffDetails({
                     employeeId: incomingStaff.employee_id ?? incomingStaff.id ?? null,
                     role: incomingStaff.role ?? "",
                     hourlyRate: incomingStaff.hourly_rate ?? null,
                     contractType: incomingStaff.contract_type ?? incomingStaff.employment_type ?? ""
                  });
               } else {
                  setStaffDetails({
                     employeeId: null,
                     role: "",
                     hourlyRate: null,
                     contractType: ""
                  });
               }
               
               // Grab the image from the database if it exists.
               if (data.profile_image) {
                  setProfileImageSrc(data.profile_image);
               }
            } else {
               setBioMessage(data.message || "Could not load bio");
               setStaffDetails({
                  employeeId: null,
                  role: "",
                  hourlyRate: null,
                  contractType: ""
               });
            }
         } catch {
            setBioMessage("Could not load bio");
            setStaffDetails({
               employeeId: null,
               role: "",
               hourlyRate: null,
               contractType: ""
            });
         }
      };

      loadBio();
   }, []);

   useEffect(() => {
      const userProfileImage = user?.profile_image_url || user?.profile_image || user?.avatar_url;
      if (userProfileImage) {
         setProfileImageSrc(userProfileImage);
      }
   }, [user]);

   useEffect(() => {
      return () => {
         if (selectedImagePreview && selectedImagePreview.startsWith("blob:")) {
            URL.revokeObjectURL(selectedImagePreview);
         }
      };
   }, [selectedImagePreview]);

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

         const myReservations = Array.isArray(data) ? data : [];
         
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

   const handleCancelReservation = async (reservationId, options = {}) => {
      const { skipConfirm = false } = options;
      if (!skipConfirm && !window.confirm("Cancel this reservation?")) {
         return;
      }

      try {
         const response = await fetch(`/api/reservations.php?id=${reservationId}&reason=${encodeURIComponent(" ")}`, {
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

   const isCancelledReservation = (reservation) =>
      String(reservation?.status ?? "").toLowerCase() === "cancelled";

   const handleSaveRating = async (reservationId) => {
      const reservation = reservations.find((row) => {
         const id = row?.reservation_id ?? row?.id;
         return String(id) === String(reservationId);
      });

      if (!reservation || isCancelledReservation(reservation)) {
         return;
      }

      const rating = ratingByReservation[reservationId];
      if (rating === undefined || rating === "") {
         return;
      }

      try {
         const response = await fetch(`/api/reservations.php?id=${reservationId}&rating=${rating}`, {
            method: "PATCH",
            credentials: "include",
            headers: {
               Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`
            }
         });

         if (!response.ok) {
            setReservationMessage("Could not save rating");
            return;
         }

         setReservationMessage("");
      } catch {
         setReservationMessage("Could not save rating");
      }
   };

   const handleOpenUploadModal = () => {
      setIsUploadImageOpen(true);
      setImageUploadError("");
      setImageUploadMessage("");
   };

   const handleCloseUploadModal = () => {
      setIsUploadImageOpen(false);
      setSelectedImageFile(null);
      setSelectedImagePreview("");
      setImageUploadError("");
   };

   const handleOpenReservationInfoModal = (reservationId) => {
      setSelectedReservationId(reservationId);
      setIsReservationInfoOpen(true);
   };

   const handleCloseReservationInfoModal = () => {
      setIsReservationInfoOpen(false);
      setSelectedReservationId(null);
   };

   const handleRequestRemoval = async () => {
      if (!selectedReservationId || !cancelReason.trim()) return;
    
      try {
        const cancelledReservation = reservations.find((reservation) => {
          const id = reservation?.reservation_id ?? reservation?.id;
          return String(id) === String(selectedReservationId);
        });

        const response = await fetch(
          `/api/reservations.php?id=${selectedReservationId}&reason=${encodeURIComponent(cancelReason)}`,
          {
            method: 'DELETE',
            credentials: 'include'
          }
        );
    
        if (!response.ok) {
          setReservationMessage("Could not cancel reservation");
          return;
        }

        const reservationUserId = Number.parseInt(cancelledReservation?.user_id, 10);
        const recipients = Number.isInteger(reservationUserId)
          ? [{ id: reservationUserId, name: `User #${reservationUserId}` }]
          : [];

        if (recipients.length > 0) {
          const actorName =
            user?.username ||
            localStorage.getItem("userUsername") ||
            "Staff";
          const serviceType = cancelledReservation?.service_type || "reservation";
          const timeWindow = `${cancelledReservation?.start_time || ""} - ${cancelledReservation?.end_time || ""}`;
          const emailSummary = await dispatchNamedTemplateEmails({
            templateType: "SR-BU",
            title: `STAFF Reservation Cancellation #${selectedReservationId}`,
            timeWindow,
            message:
              `Reservation #${selectedReservationId} (${serviceType}) was cancelled by ${actorName} (staff). ` +
              `Reason: ${cancelReason.trim()}`,
            recipients
          });
          console.info("[EMAIL_TRIGGER_FRONTEND] Staff reservation cancellation; frontend email dispatch summary:", emailSummary);
        }
    
        await fetchMyReservations();
        setIsCancelOpen(false);
        setCancelReason('');
        handleCloseReservationInfoModal();
    
      } catch {
        setReservationMessage("Could not cancel reservation");
      }
    };

   const handleImageFileChange = (event) => {
      const incomingFile = event.target.files?.[0];
      setImageUploadError("");
      setImageUploadMessage("");

      if (!incomingFile) {
         setSelectedImageFile(null);
         setSelectedImagePreview("");
         return;
      }

      if (!incomingFile.type.startsWith("image/")) {
         setImageUploadError("Please choose a valid image file.");
         setSelectedImageFile(null);
         setSelectedImagePreview("");
         return;
      }

      const maxFileSizeBytes = 5 * 1024 * 1024;
      if (incomingFile.size > maxFileSizeBytes) {
         setImageUploadError("Image must be 5MB or smaller.");
         setSelectedImageFile(null);
         setSelectedImagePreview("");
         return;
      }

      setSelectedImageFile(incomingFile);
      setSelectedImagePreview(URL.createObjectURL(incomingFile));
   };

   const handleUploadProfileImage = async () => {
      if (!selectedImageFile) {
         setImageUploadError("Select an image before uploading.");
         return;
      }

      setIsUploadingImage(true);
      setImageUploadError("");
      setImageUploadMessage("");

      try {
         const uploadEndpoint = profileImageUploadEndpoint || "/api/upload_avatar.php";
         const formData = new FormData();
         formData.append("avatar", selectedImageFile);
         if (profileImageUploadPath) {
            formData.append("upload_path", profileImageUploadPath);
         }

         const response = await fetch(uploadEndpoint, {
            method: "POST",
            credentials: "include",
            body: formData
         });

         const responseText = await response.text();
         let data = {};
         try {
            data = responseText ? JSON.parse(responseText) : {};
         } catch {
            data = {};
         }

         if (!response.ok) {
            const fallbackMessage = responseText
               ? responseText.slice(0, 240)
               : `Upload failed (${response.status})`;
            setImageUploadError(data.message || fallbackMessage || "Could not upload profile image.");
            return;
         }

         const incomingImageUrl =
            data.profile_image_url || data.profileImageUrl || data.image_url || data.imageUrl || "";
         if (incomingImageUrl) {
            setProfileImageSrc(incomingImageUrl);
         }

         setImageUploadMessage(data.message || "Profile image uploaded.");
         setIsUploadImageOpen(false);
         setSelectedImageFile(null);
         setSelectedImagePreview("");
      } catch {
         setImageUploadError("Could not upload profile image.");
      } finally {
         setIsUploadingImage(false);
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

   const guestReservations = useMemo(() => {
      if (!currentUserId) {
         return [];
      }

      const normalizedCurrentUserId = String(currentUserId);
      const filteredReservations = reservations.filter(
         (reservation) => String(reservation.user_id) === normalizedCurrentUserId
      );

      filteredReservations.sort(
         (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

      return filteredReservations;
   }, [reservations, currentUserId]);


   const guestGroups = useMemo(() => {
      const past = [];
      const today = [];
      const future = [];
      guestReservations.forEach((reservation) => {
         const startMs = new Date(reservation.start_time).getTime();
         if (Number.isNaN(startMs)) return;
         if (startMs < dayBoundaries.todayStartMs) past.push(reservation);
         else if (startMs < dayBoundaries.tomorrowStartMs) today.push(reservation);
         else future.push(reservation);
      });
      return { past, today, future };
   }, [guestReservations, dayBoundaries]);

   const selectedReservation = useMemo(() => {
      if (!selectedReservationId) {
         return null;
      }

      return (
         reservations.find((reservation) => {
            const id = reservation?.reservation_id ?? reservation?.id;
            return String(id) === String(selectedReservationId);
         }) ?? null
      );
   }, [reservations, selectedReservationId]);

   const formatCurrency = (value) => {
      if (value === null || value === undefined || value === "") {
         return "N/A";
      }

      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? `$${parsed.toFixed(2)}` : "N/A";
   };

   const formatDateTime = (value) => {
      if (!value) {
         return "";
      }
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString();
   };

   return (
      <>
         {/* --- TOP HALF: PROFILE, BIO, AND DETAILS --- */}
         <div className="profile-container">
            <div className="profile-image-container">
               <button type="button" className="profile-image-button" onClick={handleOpenUploadModal}>
                  <img
                     src={profileImageSrc}
                     alt="User profile"
                     className="profile-image"
                  />
               </button>
               <p className="profile-upload-hint">Click profile photo to upload a new image.</p>
               {imageUploadMessage ? <p className="profile-upload-success">{imageUploadMessage}</p> : null}
               {imageUploadError ? <p className="profile-upload-error">{imageUploadError}</p> : null}
            </div>

            <div
               className="profile-details-container"
               style={{ background: "transparent", border: "none", backdropFilter: "none", WebkitBackdropFilter: "none" }}
            >
               <h2>Staff Profile</h2>
               <table
                  className="profile-details-table"
                  role="presentation"
                  style={{ background: "transparent", backgroundColor: "transparent", border: "none", boxShadow: "none", backdropFilter: "none", WebkitBackdropFilter: "none", margin: 0 }}
               >
                  <tbody style={{ background: "transparent", border: "none", backdropFilter: "none", WebkitBackdropFilter: "none" }}>
                     <tr style={{ background: "transparent", border: "none", backdropFilter: "none", WebkitBackdropFilter: "none" }}>
                        <td className="profile-details-column" style={{ background: "transparent", border: "none", backdropFilter: "none", WebkitBackdropFilter: "none" }}>
                           <p className="profile-label">Username</p>
                           <p className="profile-value" id="profile-username">{username}</p>

                           <p className="profile-label">Email</p>
                           <p className="profile-value" id="profile-email">{email}</p>

                           <p className="profile-label">User ID</p>
                           <p className="profile-value" id="profile-id">{userId}</p>

                           <label className="profile-label" htmlFor="profile-bio">Biography</label>
                           <textarea
                              id="profile-bio"
                              className="profile-bio-input"
                              value={bio}
                              onChange={(e) => setBio(e.target.value)}
                              placeholder="Write a short biography here..."
                              rows={4}
                           />
                        </td>
                        <td className="profile-details-column" style={{ background: "transparent", border: "none", backdropFilter: "none", WebkitBackdropFilter: "none" }}>
                           <p className="profile-label">Employee ID</p>
                           <p className="profile-value" id="profile-employee-id">{employeeId}</p>

                           <p className="profile-label">Role</p>
                           <p className="profile-value" id="profile-role">{staffRole}</p>

                           <p className="profile-label">Hourly Rate</p>
                           <p className="profile-value" id="profile-hourly-rate">{formatHourlyRate(staffDetails.hourlyRate)}</p>

                           <p className="profile-label">Contract Type</p>
                           <p className="profile-value" id="profile-contract-type">{formatContractType(staffDetails.contractType)}</p>
                        </td>
                     </tr>
                  </tbody>
               </table>
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

         {/* --- UPLOAD MODAL --- */}
         <Dialog open={isUploadImageOpen} onClose={handleCloseUploadModal} className="add-item-dialog">
            <div className="add-item-dialog-backdrop" aria-hidden="true" />
            <div className="add-item-dialog-container">
               <DialogPanel className="add-item-dialog-panel">
                  <DialogTitle className="add-item-header">Upload Profile Image</DialogTitle>
                  <div className="inner-add-item-container">
                     <p className="profile-upload-modal-subtitle">
                        Select an image file (PNG, JPG, GIF, or WEBP). Maximum file size is 5MB.
                     </p>
                     <input
                        id="profile-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="profile-upload-input"
                     />
                     <label className="profile-label" htmlFor="profile-image-upload-path">Upload Path</label>
                     <input
                        id="profile-image-upload-path"
                        type="text"
                        readOnly
                        value={displayUploadPath}
                        className="profile-upload-path"
                     />
                     {selectedImageFile ? <p className="profile-upload-file">Selected: {selectedImageFile.name}</p> : null}
                     {selectedImagePreview ? <img src={selectedImagePreview} alt="Selected profile preview" className="profile-upload-preview" /> : null}
                     {imageUploadError ? <span className="profile-upload-error">{imageUploadError}</span> : null}

                     <div className="button-group">
                        <button type="button" onClick={handleUploadProfileImage} disabled={isUploadingImage}>
                           {isUploadingImage ? "Uploading..." : "Upload Image"}
                        </button>
                        <button type="button" onClick={handleCloseUploadModal} disabled={isUploadingImage}>
                           Cancel
                        </button>
                     </div>
                  </div>
               </DialogPanel>
            </div>
         </Dialog>

         {/* Availability UI */}
         <AvailabilityUI />

               {/* --- BOTTOM HALF: START OF THE NEW CLEAN LAYOUT --- */}
               <div className="max-w-7xl mx-auto mt-8 w-full" style={{ width: "95%" }}>
                  
                  {/* --- TOP: 1x2 GRID (ASSIGNED SHIFTS) --- */}
                  <h2 className="text-2xl font-bold mb-4 text-gray-800">My Shifts (Assigned)</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                     <ReservationTableUI title="Today's Assigned" reservations={reservationGroups.today} type="today" isAssigned={true} onInfo={handleOpenReservationInfoModal} />
                     <ReservationTableUI title="Future Assigned" reservations={reservationGroups.future} type="future" isAssigned={true} onInfo={handleOpenReservationInfoModal} />
                  </div>
                  {reservationMessage ? (
                     <div className="mb-6 p-3 bg-blue-50 text-blue-800 rounded border border-blue-200">
                        {reservationMessage}
                     </div>
                  ) : null}

                  <hr className="my-10 border-gray-300" />

                  {/* --- BOTTOM: 1x3 GRID (GUEST RESERVATIONS) --- */}
                  <h2 className="text-2xl font-bold mb-4 text-gray-800">My Reservations (As Guest)</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                     <ReservationTableUI title="Today's Reservations" reservations={guestGroups.today} type="today" onCancel={(id) => handleCancelReservation(id, { skipConfirm: false })} />
                     <ReservationTableUI title="Future Reservations" reservations={guestGroups.future} type="future" onCancel={(id) => handleCancelReservation(id, { skipConfirm: false })} />
                     <ReservationTableUI title="Past Reservations" reservations={guestGroups.past} type="past" ratingState={ratingByReservation} onRatingChange={(id, val) => setRatingByReservation(prev => ({...prev, [id]: val}))} onSaveRating={handleSaveRating} />
                  </div>
                  
               </div>

               {/* --- INFO DIALOG --- */}
               <Dialog open={isReservationInfoOpen} onClose={handleCloseReservationInfoModal} className="add-item-dialog">
                  <div className="add-item-dialog-backdrop" aria-hidden="true" />
                  <div className="add-item-dialog-container">
                     <DialogPanel className="add-item-dialog-panel">
                        <div className="inner-add-item-container" style={{ minHeight: "140px", display: "flex", flexDirection: "column", gap: "14px", justifyContent: "flex-end" }}>
                           <div style={{ width: "100%" }}>
                              {selectedReservation ? (
                                 <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px 16px", fontSize: "0.96rem" }}>
                                    <p><strong>Reservation ID:</strong> {selectedReservation.reservation_id ?? selectedReservation.id ?? "N/A"}</p>
                                    <p><strong>Status:</strong> {selectedReservation.status || "N/A"}</p>
                                    <p><strong>Service:</strong> {selectedReservation.service_type || "N/A"}</p>
                                    <p><strong>Resource:</strong> {selectedReservation.resource_name || "N/A"}</p>
                                    <p><strong>Start:</strong> {formatDateTime(selectedReservation.start_time) || "N/A"}</p>
                                    <p><strong>End:</strong> {formatDateTime(selectedReservation.end_time) || "N/A"}</p>
                                    <p><strong>Event ID:</strong> {selectedReservation.event_id ?? "N/A"}</p>
                                    <p><strong>Ticket Tier:</strong> {selectedReservation.ticket_tier || "N/A"}</p>
                                    <p><strong>Ticket Qty:</strong> {selectedReservation.quantity ?? "N/A"}</p>
                                    <p><strong>Section #:</strong> {selectedReservation.section_number ?? "N/A"}</p>
                                    <p><strong>Guest Count:</strong> {selectedReservation.guest_count ?? "N/A"}</p>
                                    <p><strong>Min Spend:</strong> {formatCurrency(selectedReservation.minimum_spend)}</p>
                                 </div>
                              ) : (
                                 <p className="profile-reservation-placeholder">Reservation details unavailable.</p>
                              )}
                           </div>

                           <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", width: "100%" }}>
                              <button type="button" onClick={() => { setCancelReason(''); setIsCancelOpen(true); }}>Request to be removed</button>
                              <button type="button" onClick={handleCloseReservationInfoModal}>OK</button>
                           </div>
                        </div>
                     </DialogPanel>
                  </div>
               </Dialog>

               {/* --- CANCEL DIALOG --- */}
               <Dialog open={isCancelOpen} onClose={() => setIsCancelOpen(false)} className="add-item-dialog">
                  <div className="add-item-dialog-backdrop" />
                  <div className="add-item-dialog-container">
                     <DialogPanel className="add-item-dialog-panel">
                        <DialogTitle className="add-item-header">Request Removal</DialogTitle>
                        <textarea placeholder="Enter reason..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="add-item-name-input" />
                        <div className="button-group">
                           <button onClick={handleRequestRemoval}>Submit</button>
                           <button onClick={() => setIsCancelOpen(false)}>Close</button>
                        </div>
                     </DialogPanel>
                  </div>
               </Dialog>
            </>
         );
   }

export default StaffProfile;
