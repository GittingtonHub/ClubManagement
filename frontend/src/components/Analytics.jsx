import UserAnalytics from "./UserAnalytics";
import TopThreeAnalytics from "./TopThreeAnalytics";
import ClubEventAnalytics from "./ClubEventAnalytics";
import CancellationAnalytics from "./CancellationAnalytics";

function Analytics() {
   return(
      <div className="analytics-container">
         <UserAnalytics />
         <ClubEventAnalytics />
         <TopThreeAnalytics />
         <CancellationAnalytics />
      </div>
   );
}

export default Analytics;
