import ResourcesUI from "../components/ResourcesUI";
import StaffUI from "../components/StaffUI";
import UsersUI from "../components/UsersUI";
import ReservationTableUI from "../components/ReservationTableUI";

function Inventory() {
    return(
        <>
            <ResourcesUI />
            <StaffUI />
            <UsersUI />
            <ReservationTableUI />
        </>
    );
}

export default Inventory;
