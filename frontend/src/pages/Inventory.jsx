import ResourcesUI from "../components/ResourcesUI";
import StaffUI from "../components/StaffUI";
import UsersUI from "../components/UsersUI";

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