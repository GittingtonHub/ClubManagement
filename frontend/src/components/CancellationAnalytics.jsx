
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAnalytics } from "../lib/analyticsApi";

const DEFAULT_CANCELLATION_ANALYTICS = Object.freeze({
   totalCancellations: 0,
   cancellationsThisMonth: 0,
   cancellationsByCategory: [],
});

function parseCancellationCategoryRows(values) {
   const safeValues = Array.isArray(values) ? values : [];
   if (safeValues.length === 0) {
      return [{ categoryLabel: "Unavailable", value: "0" }];
   }

   return safeValues.map((entry) => ({
      categoryLabel: String(entry?.category ?? "Unavailable"),
      value: (Number(entry?.count) || 0).toLocaleString(),
   }));
}

function CancellationAnalytics() {
   const [metrics, setMetrics] = useState(DEFAULT_CANCELLATION_ANALYTICS);
   const [isLoading, setIsLoading] = useState(true);
   const [loadMessage, setLoadMessage] = useState("");

   const loadCancellationAnalytics = useCallback(async () => {
      setIsLoading(true);
      setLoadMessage("");

      try {
         const cancellationAnalytics = await fetchAnalytics("cancellations");
         const totalCancellations = cancellationAnalytics?.total_cancellations;
         const cancellationsThisMonth = cancellationAnalytics?.monthly_cancellations;
         const cancellationsByCategory = cancellationAnalytics?.by_category;

         setMetrics({
            totalCancellations: Number(totalCancellations) || 0,
            cancellationsThisMonth: Number(cancellationsThisMonth) || 0,
            cancellationsByCategory: Array.isArray(cancellationsByCategory) ? cancellationsByCategory : DEFAULT_CANCELLATION_ANALYTICS.cancellationsByCategory,
         });

      } catch {
         setMetrics(DEFAULT_CANCELLATION_ANALYTICS);
         setLoadMessage("Unable to load analytics data. Showing default values.");
      
      } finally {
         setIsLoading(false);
      }
   }, []);

   useEffect(() => {
      loadCancellationAnalytics();
   }, [loadCancellationAnalytics]);

   const metricItems = useMemo(
      () => [
         {
            id: "totalCancellations",
            label: "Total Cancellations",
            value: metrics.totalCancellations.toLocaleString()
         },
         {
            id: "cancellationsThisMonth",
            label: "Cancellations This Month",
            value: metrics.cancellationsThisMonth.toLocaleString()
         },
         {
            id: "cancellationsByCategory",
            label: "Cancellations by Category",
            rows: parseCancellationCategoryRows(metrics.cancellationsByCategory)
         }
      ],
      [metrics]
   );


   return(
      <>
         <div className="cancellation-analytics-container"> 
            <h2 className="analytics-title">Cancellation Analytics</h2>
            {isLoading ? <p className="analytics-status">Loading cancellation metrics...</p> : null}
            {loadMessage ? <p className="analytics-status">{loadMessage}</p> : null} 

            <div className="analytics-metrics-grid">
               {metricItems.map((metric) => (
                  <div className="analytics-metric" key={metric.id}>
                     <p className="analytics-label">{metric.label}</p>
                     {/* some js conditional here to render a table in the style of the top3analytics, bc one of our metrics is a list */}
                     { 
                        metric.rows ? (
                           <div className="analytics-value analytics-category-list" id={`analytics-${metric.id}`}>
                              {metric.rows.map((entry) => (
                                 <div className="analytics-category-row" key={`${metric.id}-${entry.categoryLabel}`}>
                                    <span className="analytics-category-label">{entry.categoryLabel}</span>
                                    <span className="analytics-category-value">{entry.value}</span>
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

export default CancellationAnalytics;
