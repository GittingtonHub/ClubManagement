import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAnalytics } from "../lib/analyticsApi";

const DEFAULT_EVENT_ANALYTICS = Object.freeze({
   allTimeReservations: 0,
   reservationsThisMonth: 0,
});

function ClubEventAnalytics() {
   const [metrics, setMetrics] = useState(DEFAULT_EVENT_ANALYTICS);
   const [isLoading, setIsLoading] = useState(true);
   const [loadMessage, setLoadMessage] = useState("");

   const loadEventAnalytics = useCallback(async () => {
      setIsLoading(true);
      setLoadMessage("");

      try {
         const eventAnalytics = await fetchAnalytics("events");

         const allTimeReservations = eventAnalytics?.all_time_reservations;
         const reservationsThisMonth = eventAnalytics?.monthly_reservations;

         setMetrics({
            allTimeReservations: Number(allTimeReservations) || 0,
            reservationsThisMonth: Number(reservationsThisMonth) || 0,
         });

      } catch {
         setMetrics(DEFAULT_EVENT_ANALYTICS);
         setLoadMessage("Unable to load analytics data. Showing default values.");

      } finally {
         setIsLoading(false);
      }
   }, []);

   useEffect(() => {
      loadEventAnalytics();
   }, [loadEventAnalytics]);

   const metricItems = useMemo(
      () => [
         {
            id: "allTimeReservations",
            label: "All Time Reservations",
            value: metrics.allTimeReservations.toLocaleString()
         },
         {
            id: "reservationsThisMonth",
            label: "Reservations This Month",
            value: metrics.reservationsThisMonth.toLocaleString()
         },
      ],
      [metrics]
   );

   return(
      <>
         <div className="user-analytics-container"> 
            <h2 className="analytics-title">Event Analytics</h2>
            {isLoading ? <p className="analytics-status">Loading event metrics...</p> : null}
            {loadMessage ? <p className="analytics-status">{loadMessage}</p> : null}

            <div className="analytics-metrics-grid">
               {metricItems.map((metric) => (
                  <div className="analytics-metric" key={metric.id}>
                     <p className="analytics-label">{metric.label}</p>

                     <p className="analytics-value" id={`analytics-${metric.id}`}>
                        {metric.value}
                     </p>
                  </div>
               ))}
            </div>
         </div>
      </>
   );
}

export default ClubEventAnalytics;
