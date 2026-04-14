
import { useCallback, useEffect, useMemo, useState } from "react";

const DEFAULT_CANCELLATION_ANALYTICS = Object.freeze({
   totalCancellations: 0,
   cancellationsThisMonth: 0,
   // how many admin cancelled, how many staff cancelled, how many users cancelled
   cancellationsByCategory: [0, 0, 0], 
});

const CANCELLATION_CATEGORY_LABELS = Object.freeze(["Admin", "Staff", "Users"]);

function parseCancellationCategoryRows(values) {
   const safeValues = Array.isArray(values) ? values : [];

   return CANCELLATION_CATEGORY_LABELS.map((categoryLabel, index) => ({
      categoryLabel,
      value: (Number(safeValues[index]) || 0).toLocaleString(),
   }));
}

function CancellationAnalytics() {
   const [metrics, setMetrics] = useState(DEFAULT_CANCELLATION_ANALYTICS);
   const [isLoading, setIsLoading] = useState(true);
   const [loadMessage, setLoadMessage] = useState("");

   // Placeholder loaders for now. Replace each with real API/data logic later.
   const getTotalCancellations = useCallback(async () => DEFAULT_CANCELLATION_ANALYTICS.totalCancellations, []);
   const getCancellationsThisMonth = useCallback(async () => DEFAULT_CANCELLATION_ANALYTICS.cancellationsThisMonth, []);
   const getCancellationsByCategory = useCallback(async () => DEFAULT_CANCELLATION_ANALYTICS.cancellationsByCategory, []);

   const loadCancellationAnalytics = useCallback(async () => {
      setIsLoading(true);
      setLoadMessage("");

      try {
         const [totalCancellations, cancellationsThisMonth, cancellationsByCategory] = await Promise.all([
            getTotalCancellations(),
            getCancellationsThisMonth(),
            getCancellationsByCategory()
         ]);

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
   }, [getTotalCancellations, getCancellationsThisMonth, getCancellationsByCategory]);

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
