import ResourcesUI from "../components/ResourcesUI";
import StaffUI from "../components/StaffUI";
import ReservationTableUI from "../components/ReservationTableUI";
import { Navigate, useInRouterContext, useLocation } from 'react-router-dom';

function Inventory() {
    if (localStorage.getItem('permissionStatus') == 'admin')
    {
    return(
        <>
            <ResourcesUI />
            <StaffUI />
            <ReservationTableUI />
        </>
     );
    }
    else
    {
        return(<><ReservationTableUI></ReservationTableUI></>)
    }



    
}

export default Inventory;
