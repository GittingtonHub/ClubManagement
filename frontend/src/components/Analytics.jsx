import UserAnalytics from "./UserAnalytics";
import TopThreeAnalytics from "./TopThreeAnalytics";
import ClubEventAnalytics from "./ClubEventAnalytics";
import CancellationAnalytics from "./CancellationAnalytics";

function Analytics() {
   return(
      <div className="analytics-container">
         <div className="analytics-top"> 
            <TopThreeAnalytics />
         </div>
         <div className="analytics-middle"> 
            <ClubEventAnalytics />
            <CancellationAnalytics />
         </div>
         <div className="analytics-bottom"> 
            <UserAnalytics />
         </div>
      </div>
   );
}

export default Analytics;
