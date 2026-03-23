import ResourcesUI from "../components/ResourcesUI";
import StaffUI from "../components/StaffUI";
import ReservationTableUI from "../components/ReservationTableUI";
import EventsUI from "../components/EventsUI";

function Inventory() {
    return(
        <>
            <ResourcesUI />
            <EventsUI />
            <StaffUI />
            <ReservationTableUI />
        </>
    );
}

export default Inventory;
