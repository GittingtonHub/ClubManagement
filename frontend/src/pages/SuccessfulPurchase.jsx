import "../styles/success.css";
import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom"; // Swapped useLocation for useParams
import Barcode from "react-barcode";

const DEFAULT_SUCCESS_PAGE_VALUES = Object.freeze({
   eventId: "EVT-001",
   userId: "USER-001",
   eventTitle: "Event Purchased",
   eventSTART: "",
   eventEND: "",
   ticketType: "GA",
   ticketPrice: "0.00",
   performer: "TBA",
   imagePATH: "",
});

function normalizeSuccessData(rawData = {}) {
   const eventId = String(rawData?.eventId ?? rawData?.event_id ?? DEFAULT_SUCCESS_PAGE_VALUES.eventId);
   const userId = String(rawData?.userId ?? rawData?.user_id ?? DEFAULT_SUCCESS_PAGE_VALUES.userId);
   const eventTitle = String(rawData?.eventTitle ?? rawData?.event_name ?? rawData?.event_title ?? DEFAULT_SUCCESS_PAGE_VALUES.eventTitle);
   const eventSTART = String(rawData?.eventSTART ?? rawData?.event_start ?? rawData?.start ?? DEFAULT_SUCCESS_PAGE_VALUES.eventSTART);
   const eventEND = String(rawData?.eventEND ?? rawData?.event_end ?? rawData?.end ?? DEFAULT_SUCCESS_PAGE_VALUES.eventEND);
   const ticketType = String(rawData?.ticketType ?? rawData?.ticket_type ?? DEFAULT_SUCCESS_PAGE_VALUES.ticketType);
   const performer = String(rawData?.performer ?? rawData?.performers ?? DEFAULT_SUCCESS_PAGE_VALUES.performer);
   const imagePATH = String(rawData?.imagePATH ?? rawData?.image_path ?? rawData?.poster ?? DEFAULT_SUCCESS_PAGE_VALUES.imagePATH);

   const parsedPrice = Number.parseFloat(rawData?.ticketPrice ?? rawData?.price ?? rawData?.ticket_price);
   const ticketPrice = Number.isFinite(parsedPrice)
      ? parsedPrice.toFixed(2)
      : String(rawData?.ticketPrice ?? rawData?.ticket_price ?? DEFAULT_SUCCESS_PAGE_VALUES.ticketPrice);

   return {
      eventId,
      userId,
      eventTitle,
      eventSTART: eventSTART || "TBD",
      eventEND: eventEND || "TBD",
      ticketType: ticketType || "N/A",
      ticketPrice: ticketPrice || "0.00",
      performer: performer || "TBA",
      imagePATH,
      barcodeValue: `${eventId}${userId}`
   };
}

function SuccessfulPurchase() {
   const navigate = useNavigate();
   const { ticketId } = useParams(); // Grabs the ID from the URL (e.g., /success/123)

   const [rawData, setRawData] = useState(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);

   // Fetch data from the backend when the page loads
   useEffect(() => {
      fetch(`http://localhost/ClubManagement/backend/get_ticket_details.php?id=${ticketId}`)
         .then(res => {
            if (!res.ok) throw new Error("Could not find ticket details.");
            return res.json();
         })
         .then(data => {
            if (data.error) throw new Error(data.error);
            setRawData(data);
            setLoading(false);
         })
         .catch(err => {
            setError(err.message);
            setLoading(false);
         });
   }, [ticketId]);

   // Process the fetched data through your normalizer
   const successPageValues = useMemo(() => {
      return normalizeSuccessData({
         ...DEFAULT_SUCCESS_PAGE_VALUES,
         ...rawData
      });
   }, [rawData]);

   // Show a loading or error message if needed
   if (loading) {
      return <div className="successful-purchase-container"><h2 style={{color: 'white', textAlign: 'center', paddingTop: '50px'}}>Loading your ticket...</h2></div>;
   }

   if (error) {
      return (
         <div className="successful-purchase-container text-center pt-10">
            <h2 style={{color: '#ff4d4d', textAlign: 'center'}}>{error}</h2>
            <button className="mt-4 px-4 py-2 bg-white text-black rounded" onClick={() => navigate("/home")}>Go Home</button>
         </div>
      );
   }

   return (
      <div className="successful-purchase-container">
         <div className="success-ticket-content">
            <div className="success-title">
               <h1>You Got &#39;Em</h1>
            </div>

            <div className="success-ticket-container">
               <div className="ticket-details-container">
                  <div className="details-container-table">
                     <table className="success-details-table" role="presentation">
                        <tbody>
                           <tr>
                              <td>{successPageValues.eventTitle}</td>
                              <td>{successPageValues.eventSTART}</td>
                              <td>{successPageValues.eventEND}</td>
                           </tr>
                           <tr>
                              <td>{successPageValues.ticketType}</td>
                              <td>${successPageValues.ticketPrice}</td>
                              <td>{successPageValues.performer}</td>
                           </tr>
                        </tbody>
                     </table>
                  </div>

                  <div className="details-container-barcode" aria-hidden="true">
                     <div className="barcode-vertical-wrapper">
                        <Barcode
                           value={successPageValues.barcodeValue}
                           format="CODE128"
                           width={1.2}
                           height={62}
                           margin={8}
                           background="transparent"
                           displayValue={false}
                        />
                     </div>
                  </div>
               </div>

               <div className="ticket-poster-container">
                  {successPageValues.imagePATH ? (
                     <img src={successPageValues.imagePATH} alt={`${successPageValues.eventTitle} poster`} className="ticket-poster-image" />
                  ) : (
                     <div className="ticket-poster-placeholder">Poster coming soon</div>
                  )}
               </div>
            </div>

            <div className="success-go-home-button">
               <button type="button" onClick={() => navigate("/home")}>
                  Go Home
               </button>
            </div>
         </div>
      </div>
   );
}

export default SuccessfulPurchase;