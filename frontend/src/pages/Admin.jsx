import UsersUI from "../components/UsersUI";
import Inventory from "./Inventory";

function Admin() {
   return (
      <>
         <UsersUI />
         <EventsUI />
         <StaffUI />         
         <ResourcesUI />
         <ReservationTableUI />
      </>
   );
}

export default Admin;