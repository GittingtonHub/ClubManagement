
function Profile() {
   return (
      <>
         <div className="profile-container">
            <div className="profile-image-container">
               {/* 1fr width, square. 300x300 */}
            </div>

            <div className="profile-details-container">
               {/* 3fr width */}
            </div>

            <div className="profile-buttons-container">
               {/* this is hidden until the user make a change, by interacting with the bio, username, or email*/}
               {/* save button, that writes the editible fileds onto the current logged-in user's record in the db */}
               {/* cancel button that clears the editible fileds of all inputs, and rewrites in the fileds based on what the db says */}
            </div>
         </div>

         <div className="profile-reservations-container">
            <div className="profile-reservations-past">
               {/* Previous Orders */}
               {/* render the reservationTableUI conditionally to only show this user's reservations AND for the end date to be in the past */}
            </div>

            <div className="profile-reservations-today">
               {/* Today at Club Management */}
               {/* render the reservationTableUI conditionally to only show this user's reservations AND for the START date to be today  */}
            </div>

            <div className="profile-reservations-future">
               {/* Coming Up */}
               {/* render the reservationTableUI conditionally to only show this user's reservations AND for the START date to be AFTER today */}
            
            </div>
         </div>
      </>
   );
}

export default Profile;