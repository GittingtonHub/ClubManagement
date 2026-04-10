import { useCallback, useEffect, useMemo, useState } from "react";

const DEFAULT_EVENT_ANALYTICS = Object.freeze({
   allTimeReservations: 0,
   reservationsThisMonth: 0,
   top3users: ["Unavailable", "Unavailable", "Unavailable"],
});

const TOP_THREE_RANKS = Object.freeze([1, 2, 3]);

function parseTopThreeRows(values) {
   const safeValues = Array.isArray(values) ? values : [];

   return TOP_THREE_RANKS.map((rank, index) => {
      const rawValue = safeValues[index];
      const item = typeof rawValue === "string" ? rawValue.trim() : String(rawValue ?? "").trim();

      return {
         rank,
         item: item || "Unavailable",
      };
   });
}

function ClubEventAnalytics() {
   const [metrics, setMetrics] = useState(DEFAULT_EVENT_ANALYTICS);
   const [isLoading, setIsLoading] = useState(true);
   const [loadMessage, setLoadMessage] = useState("");

   // Placeholder loaders for now. Replace each with real API/data logic later.
   const getAllTimeReservations = useCallback(async () => DEFAULT_EVENT_ANALYTICS.allTimeReservations, []);
   const getReservationsThisMonth = useCallback(async () => DEFAULT_EVENT_ANALYTICS.reservationsThisMonth, []);
   const getTop3users = useCallback(async () => DEFAULT_EVENT_ANALYTICS.top3users, []);
   
   const loadEventAnalytics = useCallback(async () => {
      setIsLoading(true);
      setLoadMessage("");

      try {
         const [allTimeReservations, reservationsThisMonth, top3users] = await Promise.all([
            getAllTimeReservations(),
            getReservationsThisMonth(),
            getTop3users()
         ]);

         setMetrics({
            allTimeReservations: Number(allTimeReservations) || 0,
            reservationsThisMonth: Number(reservationsThisMonth) || 0,
            top3users: Array.isArray(top3users) ? top3users : DEFAULT_EVENT_ANALYTICS.top3users,
         });

      } catch {
         setMetrics(DEFAULT_EVENT_ANALYTICS);
         setLoadMessage("Unable to load analytics data. Showing default values.");

      } finally {
         setIsLoading(false);
      }
   }, [getAllTimeReservations, getReservationsThisMonth, getTop3users]);

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
         {
            id: "top3users",
            label: "Top 3 Users",
            // TODO: need to parse a list here, and display it like a top 3 kind of list
            // value: metrics.top3users.join(" / ") 
            rows: parseTopThreeRows(metrics.top3users)
         },
      ],
      [metrics]
   );

   return(
      <>
         <div className="clubevents-analytics-container"> 
            <h2 className="analytics-title">Event Analytics</h2>
            {isLoading ? <p className="analytics-status">Loading event metrics...</p> : null}
            {loadMessage ? <p className="analytics-status">{loadMessage}</p> : null}

            <div className="analytics-metrics-grid">
               {metricItems.map((metric) => (
                  <div className="analytics-metric" key={metric.id}>
                     <p className="analytics-label">{metric.label}</p>

                     {/* some js conditional here to render a table in the style of the top3analytics, bc one of our metrics is a list */}
                     { 
                        metric.rows ? (
                           <div className="analytics-value analytics-topthree-list" id={`analytics-${metric.id}`}>
                              {metric.rows.map((entry) => (
                                 <div className="analytics-topthree-row" key={`${metric.id}-${entry.rank}`}>
                                    <span className="analytics-topthree-rank">{entry.rank}</span>
                                    <span className="analytics-topthree-item">{entry.item}</span>
                                 </div>
                              ))}
                           </div>
                        ) : (
                           <p className="analytics-value" id={`analytics-${metric.id}`}>
                              {metric.value}
                           </p>
                        )
                     }
                  </div>
               ))}
            </div>
         </div>
      </>
   );
}

export default ClubEventAnalytics;
