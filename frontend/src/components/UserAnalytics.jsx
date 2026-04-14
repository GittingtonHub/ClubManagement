import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAnalytics } from "../lib/analyticsApi";

const DEFAULT_USER_ANALYTICS = Object.freeze({
   registeredUsers: 0,
   uniqueUsersThisMonth: 0,
});

function UserAnalytics() {
   const [metrics, setMetrics] = useState(DEFAULT_USER_ANALYTICS);
   const [isLoading, setIsLoading] = useState(true);
   const [loadMessage, setLoadMessage] = useState("");

   const loadUserAnalytics = useCallback(async () => {
      setIsLoading(true);
      setLoadMessage("");

      try {
         const userAnalytics = await fetchAnalytics("users");
         const registeredUsers = userAnalytics?.total_users;
         const uniqueUsersThisMonth = userAnalytics?.unique_active_this_month;

         setMetrics({
            registeredUsers: Number(registeredUsers) || 0,
            uniqueUsersThisMonth: Number(uniqueUsersThisMonth) || 0,
         });
      } catch {
         setMetrics(DEFAULT_USER_ANALYTICS);
         setLoadMessage("Unable to load analytics data. Showing default values.");
      } finally {
         setIsLoading(false);
      }
   }, []);

   useEffect(() => {
      loadUserAnalytics();
   }, [loadUserAnalytics]);

   const metricItems = useMemo(
      () => [
         {
            id: "registeredUsers",
            label: "All Time Registered Users",
            value: metrics.registeredUsers.toLocaleString()
         },
         {
            id: "uniqueUsers",
            label: "Unique Users This Month",
            value: metrics.uniqueUsersThisMonth.toLocaleString()
         },
      ],
      [metrics]
   );

   return(
         <div className="topthree-analytics-container">
            <h2 className="analytics-title">User Analytics</h2>
            {isLoading ? <p className="analytics-status">Loading user metrics...</p> : null}
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
   );
}

export default UserAnalytics;
