import '../styles/success.css'
import { useCallback, useEffect, useMemo, useState } from "react";

const DEFAULT_SUCCESS_PAGE_VALUES = Object.freeze({
   eventTitle: "",
   eventSTART: "",
   eventEND: "",
   ticketType: "",
   ticketPrice: "",
   performer: "",
   imagePATH: "",
});

function SuccessfulPurchase() {

   const successPageValues = useMemo(
      () => [
         {
            
         },
      ],
      [values]
   );

   return (
      <>
         <div className="successful-purchase-container"> 
            <div className="success-title"> 
            </div>

            <div className="success-ticket-container">

               <div className="ticket-details-container"> 
                  <div className="details-container-table"> 
                  
                  </div>

                  <div className="details-container-barcode"> 
                  
                  </div>
               </div>

               <div className="ticket-poster-container"> 
               </div>

            </div>

            <div className="success-go-home-button"> 
            </div>

         </div>
      </>
   );
}

export default SuccessfulPurchase;