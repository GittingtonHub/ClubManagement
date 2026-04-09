import Analytics from "../components/Analytics";
import UsersUI from "../components/UsersUI";
import StaffUI from "../components/StaffUI";
import ResourcesUI from "../components/ResourcesUI";
import EventsUI from "../components/EventsUI";
import ReservationTableUI from "../components/ReservationTableUI";

function Admin() {
   return (
      <>
         <Analytics />
         <ReservationTableUI />         
         <EventsUI />
         <UsersUI />
         <StaffUI />         
         <ResourcesUI />
      </>
   );
}

export default Admin;