
import { useCallback, useEffect, useMemo, useState } from "react";

const DEFAULT_USER_ANALYTICS = Object.freeze({
   registeredUsers: 0,
   uniqueUsersThisMonth: 0,
});

function UserAnalytics() {
   const [metrics, setMetrics] = useState(DEFAULT_USER_ANALYTICS);
   const [isLoading, setIsLoading] = useState(true);
   const [loadMessage, setLoadMessage] = useState("");

   // Placeholder loaders for now. Replace each with real API/data logic later.
   const getRegisteredUsers = useCallback(async () => DEFAULT_USER_ANALYTICS.registeredUsers, []);
   const getUniqueUsersThisMonth = useCallback(async () => DEFAULT_USER_ANALYTICS.uniqueUsersThisMonth, []);

   const loadUserAnalytics = useCallback(async () => {
      setIsLoading(true);
      setLoadMessage("");

      try {
         const [registeredUsers, uniqueUsersThisMonth] = await Promise.all([
            getRegisteredUsers(),
            getUniqueUsersThisMonth()
         ]);

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
   }, [getRegisteredUsers, getUniqueUsersThisMonth]);

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
         <div className="user-analytics-container">
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
