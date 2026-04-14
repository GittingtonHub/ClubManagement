
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAnalytics } from "../lib/analyticsApi";

const DEFAULT_TOP3_ANALYTICS = Object.freeze({
   top3reservedResources: ["Unavailable", "Unavailable", "Unavailable"],
   top3staff: ["Unavailable", "Unavailable", "Unavailable"],
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

function parseNameRows(values) {
   const safeValues = Array.isArray(values) ? values : [];
   return safeValues.map((row) => {
      if (typeof row === "string") {
         return row;
      }
      return String(row?.name ?? "").trim();
   });
}

function TopThreeAnalytics() {
   const [metrics, setMetrics] = useState(DEFAULT_TOP3_ANALYTICS);
   const [isLoading, setIsLoading] = useState(true);
   const [loadMessage, setLoadMessage] = useState("");

   const loadTopThreeAnalytics = useCallback(async () => {
      setIsLoading(true);
      setLoadMessage("");

      try {
         const topThreeAnalytics = await fetchAnalytics("top3");
         const top3reservedResources = parseNameRows(topThreeAnalytics?.top_resources);
         const top3staff = parseNameRows(topThreeAnalytics?.top_staff);
         const top3users = parseNameRows(topThreeAnalytics?.top_users);

         setMetrics({
            top3reservedResources: Array.isArray(top3reservedResources) ? top3reservedResources : DEFAULT_TOP3_ANALYTICS.top3reservedResources,
            top3staff: Array.isArray(top3staff) ? top3staff : DEFAULT_TOP3_ANALYTICS.top3staff,
            top3users: Array.isArray(top3users) ? top3users : DEFAULT_TOP3_ANALYTICS.top3users,
         });

      } catch {
         setMetrics(DEFAULT_TOP3_ANALYTICS);
         setLoadMessage("Unable to load analytics data. Showing default values.");
     
      } finally {
         setIsLoading(false);
      }
   }, []);

   useEffect(() => {
      loadTopThreeAnalytics();
   }, [loadTopThreeAnalytics]);

   const metricItems = useMemo(
      () => [
         {
            id: "top3reservedResources",
            label: "Top 3 Reserved Resources",
            rows: parseTopThreeRows(metrics.top3reservedResources)
         },
         {
            id: "top3staff",
            label: "Top 3 Staff",
            rows: parseTopThreeRows(metrics.top3staff)
         },
         {
            id: "top3users",
            label: "Top 3 Users",
            rows: parseTopThreeRows(metrics.top3users)
         }
      ],
      [metrics]
   );

   return(
      <>
         <div className="clubevents-analytics-container">
            <h2 className="analytics-title">Your Top Three</h2>
            {isLoading ? <p className="analytics-status">Loading top three metrics...</p> : null}
            {loadMessage ? <p className="analytics-status">{loadMessage}</p> : null} 

            <div className="analytics-metrics-grid">
               {metricItems.map((metric) => (
                  <div className="analytics-metric" key={metric.id}>
                     <p className="analytics-label">{metric.label}</p>
                     <div className="analytics-value analytics-topthree-list" id={`analytics-${metric.id}`}>
                        {metric.rows.map((entry) => (
                           <div className="analytics-topthree-row" key={`${metric.id}-${entry.rank}`}>
                              <span className="analytics-topthree-rank">{entry.rank}</span>
                              <span className="analytics-topthree-item">{entry.item}</span>
                           </div>
                        ))}
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </>
   );
}

export default TopThreeAnalytics;
