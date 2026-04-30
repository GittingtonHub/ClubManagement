import "../styles/success.css";
import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
   console.log("[SuccessfulPurchase] normalizeSuccessData input JSON:", JSON.stringify(rawData));
   const eventId = String(rawData?.event_id ?? rawData?.eventId ?? DEFAULT_SUCCESS_PAGE_VALUES.eventId);
   const userId = String(rawData?.user_id ?? rawData?.userId ?? DEFAULT_SUCCESS_PAGE_VALUES.userId);
   const eventTitle = String(rawData?.event_title ?? rawData?.event_name ?? rawData?.eventTitle ?? DEFAULT_SUCCESS_PAGE_VALUES.eventTitle);
   const eventSTART = String(rawData?.event_start ?? rawData?.start ?? rawData?.eventSTART ?? DEFAULT_SUCCESS_PAGE_VALUES.eventSTART);
   const eventEND = String(rawData?.event_end ?? rawData?.end ?? rawData?.eventEND ?? DEFAULT_SUCCESS_PAGE_VALUES.eventEND);
   const ticketType = String(rawData?.ticket_type ?? rawData?.ticketType ?? DEFAULT_SUCCESS_PAGE_VALUES.ticketType);
   const performer = String(rawData?.performer ?? rawData?.performers ?? DEFAULT_SUCCESS_PAGE_VALUES.performer);
   const imagePATH = String(rawData?.image_path ?? rawData?.poster ?? rawData?.imagePATH ?? DEFAULT_SUCCESS_PAGE_VALUES.imagePATH);

   const parsedPrice = Number.parseFloat(rawData?.ticket_price ?? rawData?.price ?? rawData?.ticketPrice);
   const ticketPrice = Number.isFinite(parsedPrice)
      ? parsedPrice.toFixed(2)
      : String(rawData?.ticket_price ?? rawData?.ticketPrice ?? DEFAULT_SUCCESS_PAGE_VALUES.ticketPrice);

   const normalized = {
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

   console.log("[SuccessfulPurchase] normalizeSuccessData output JSON:", JSON.stringify(normalized));
   return normalized;
}

function resolvePosterUrl(value) {
   const raw = String(value ?? "").trim();
   if (!raw) {
      return "";
   }
   if (/^https?:\/\//i.test(raw)) {
      return raw;
   }
   if (!raw.includes("/")) {
      const normalizedFileName = raw.replace(/\\/g, "/").replace(/^\/+/, "");
      return `${window.location.origin}/api/private_uploads/posters/${normalizedFileName}`;
   }
   const normalizedPath = raw
      .replace(/^(\.\/)+/, "")
      .replace(/^\/+/, "")
      .replace(/\\/g, "/");
   return `${window.location.origin}/${normalizedPath}`;
}

function SuccessfulPurchase() {
   const navigate = useNavigate();
   const { ticketId } = useParams();

   const [rawData, setRawData] = useState(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);

   useEffect(() => {
      console.log("[SuccessfulPurchase] loader effect start", { ticketId });
      if (!ticketId) {
         console.warn("[SuccessfulPurchase] missing ticketId param");
         setError("Missing receipt ID.");
         setLoading(false);
         return;
      }

      const detailsUrl = `/api/get_ticket_details.php?id=${ticketId}`;
      console.log("[SuccessfulPurchase] fetching ticket details:", detailsUrl);
      fetch(`/api/get_ticket_details.php?id=${ticketId}`, {
         credentials: "include"
      })
         .then(res => {
            console.log("[SuccessfulPurchase] fetch response status:", {
               ok: res.ok,
               status: res.status,
               statusText: res.statusText
            });
            if (!res.ok) throw new Error("Could not find ticket details.");
            return res.json();
         })
         .then(data => {
            console.log("[SuccessfulPurchase] fetch response JSON:", data);
            if (data.error) throw new Error(data.error);
            setRawData(data);
            console.log("[SuccessfulPurchase] rawData set successfully");
            setLoading(false);
         })
         .catch(err => {
            console.error("[SuccessfulPurchase] loader failed:", err);
            setError(err.message);
            setLoading(false);
         });
   }, [ticketId]);

   // Process the fetched data through your normalizer
   const successPageValues = useMemo(() => {
      const mergedData = {
         ...DEFAULT_SUCCESS_PAGE_VALUES,
         ...rawData
      };
      console.log("[SuccessfulPurchase] merged data before normalize JSON:", JSON.stringify(mergedData));
      return normalizeSuccessData(mergedData);
   }, [rawData]);

   console.log(
      "[SuccessfulPurchase] render snapshot:",
      `title=${successPageValues.eventTitle} | start=${successPageValues.eventSTART} | end=${successPageValues.eventEND} | tier=${successPageValues.ticketType} | price=${successPageValues.ticketPrice} | performer=${successPageValues.performer} | imagePATH=${successPageValues.imagePATH}`
   );

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
                     <img src={resolvePosterUrl(successPageValues.imagePATH)} alt={`${successPageValues.eventTitle} poster`} className="ticket-poster-image" />
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
