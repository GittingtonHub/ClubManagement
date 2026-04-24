import "../styles/success.css";
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
   const eventTitle = String(rawData?.eventTitle ?? rawData?.event_title ?? DEFAULT_SUCCESS_PAGE_VALUES.eventTitle);
   const eventSTART = String(rawData?.eventSTART ?? rawData?.event_start ?? rawData?.start ?? DEFAULT_SUCCESS_PAGE_VALUES.eventSTART);
   const eventEND = String(rawData?.eventEND ?? rawData?.event_end ?? rawData?.end ?? DEFAULT_SUCCESS_PAGE_VALUES.eventEND);
   const ticketType = String(rawData?.ticketType ?? rawData?.ticket_type ?? DEFAULT_SUCCESS_PAGE_VALUES.ticketType);
   const performer = String(rawData?.performer ?? rawData?.performers ?? DEFAULT_SUCCESS_PAGE_VALUES.performer);
   const imagePATH = String(rawData?.imagePATH ?? rawData?.image_path ?? rawData?.poster ?? DEFAULT_SUCCESS_PAGE_VALUES.imagePATH);

   const parsedPrice = Number.parseFloat(rawData?.ticketPrice ?? rawData?.ticket_price);
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
   const location = useLocation();

   const successPageValues = useMemo(() => {
      const incomingValues = location.state?.successData || {};
      return normalizeSuccessData({
         ...DEFAULT_SUCCESS_PAGE_VALUES,
         ...incomingValues
      });
   }, [location.state]);

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
