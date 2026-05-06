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

         const allTimeAvgRating = ratingAnalytics?.overall?.average;
         const byService = Array.isArray(ratingAnalytics?.by_service) ? ratingAnalytics.by_service : [];
         const serviceAverages = byService
            .map((row) => Number(row?.average_rating))
            .filter((value) => Number.isFinite(value));
         const highestRatingThisMonth = serviceAverages.length > 0 ? Math.max(...serviceAverages) : 0;
         const lowestRatingThisMonth = serviceAverages.length > 0 ? Math.min(...serviceAverages) : 0;

         const currentMonthPrefix = new Date().toISOString().slice(0, 7);
         const monthlyRatings = (Array.isArray(ratingAnalytics?.recent_ratings) ? ratingAnalytics.recent_ratings : [])
            .filter((row) => String(row?.start_time ?? "").startsWith(currentMonthPrefix))
            .map((row) => Number(row?.rating))
            .filter((value) => Number.isFinite(value));
         const monthlyAvgRating = monthlyRatings.length > 0
            ? monthlyRatings.reduce((sum, value) => sum + value, 0) / monthlyRatings.length
            : 0;

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
