import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAnalytics } from "../lib/analyticsApi";

const DEFAULT_RATING_ANALYTICS = Object.freeze({
   allTimeAvgRating: 0,
   monthlyAvgRating: 0,
   highestRatingThisMonth: 0,
   lowestRatingThisMonth: 0,
});

function RatingAnalytics() {
   const [metrics, setMetrics] = useState(DEFAULT_RATING_ANALYTICS);
   const [isLoading, setIsLoading] = useState(true);
   const [loadMessage, setLoadMessage] = useState("");

   const loadRatingAnalytics = useCallback(async () => {
      setIsLoading(true);
      setLoadMessage("");

      try {
         const ratingAnalytics = await fetchAnalytics("ratings");

         const allTimeAvgRating = ratingAnalytics?.all_time_avg_rating;
         const monthlyAvgRating = ratingAnalytics?.monthly_avg_rating;
         const highestRatingThisMonth = ratingAnalytics?.highest_rating_this_month;
         const lowestRatingThisMonth = ratingAnalytics?.lowest_rating_this_month;

         setMetrics({
            allTimeAvgRating: Number(allTimeAvgRating) || 0,
            monthlyAvgRating: Number(monthlyAvgRating) || 0,
            highestRatingThisMonth: Number(highestRatingThisMonth) || 0,
            lowestRatingThisMonth: Number(lowestRatingThisMonth) || 0,
         });

      } catch {
         setMetrics(DEFAULT_RATING_ANALYTICS);
         setLoadMessage("Unable to load analytics data. Showing default values.");

      } finally {
         setIsLoading(false);
      }
   }, []);

   useEffect(() => {
      loadRatingAnalytics();
   }, [loadRatingAnalytics]);

   const metricItems = useMemo(
      () => [
         {
            id: "allTimeAvgRating",
            label: "All Time Average Rating",
            value: metrics.allTimeAvgRating.toFixed(2)
         },
         {
            id: "monthlyAvgRating",
            label: "Monthly Average Rating",
            value: metrics.monthlyAvgRating.toFixed(2)
         },
         {
            id: "highestRatingThisMonth",
            label: "Highest Rating This Month",
            value: metrics.highestRatingThisMonth.toFixed(2)
         },
         {
            id: "lowestRatingThisMonth",
            label: "Lowest Rating This Month",
            value: metrics.lowestRatingThisMonth.toFixed(2)
         },
      ],
      [metrics]
   );

   return(
      <>
         <div className="user-analytics-container"> 
            <h2 className="analytics-title">Rating Analytics</h2>
            {isLoading ? <p className="analytics-status">Loading rating metrics...</p> : null}
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

export default RatingAnalytics;
