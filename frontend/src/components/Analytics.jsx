import UserAnalytics from "./UserAnalytics";
import TopThreeAnalytics from "./TopThreeAnalytics";
import ClubEventAnalytics from "./ClubEventAnalytics";
import CancellationAnalytics from "./CancellationAnalytics";

function Analytics() {
   return(
      <div className="analytics-container">
         <div className="analytics-top"> 
            <UserAnalytics />
         </div>
         <div className="analytics-middle"> 
            <TopThreeAnalytics />
            <CancellationAnalytics />
         </div>
         <div className="analytics-bottom"> 
            <ClubEventAnalytics />
         </div>
      </div>
   );
}

export default Analytics;
