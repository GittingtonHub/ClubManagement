
function Reservations() {
    const [isReservationOpen, setIsReservationOpen] = useState(false);
    const [signupEmail, setSignupEmail] = useState('');
    const [signupEmailError, setSignupEmailError] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [signupPasswordError, setSignupPasswordError] = useState('');
    const [reservations, setReservations] = useState([]);
    
    useEffect(() => {
        const fetchReservations = async () => {
        try {
            const response = await fetch('/api/reservations.php', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
            });
            const data = await response.json();
            setReservations(data);
        } catch (error) {
            console.error('Failed to fetch Reservations:', error);
        }
        };
        
        fetchReservations();
    }, []);

    const validateSignupEmail = (email) => {
        // TODO: Implement email validation
    };

    const validateSignupPassword = (password) => {
        // TODO: Implement password validation
    };

    const handleMakeReservation = () => {
        // TODO: Implement make reservation logic
    };

    return (
        <>
            <div className="all-reservations-container" id="all-reservations-container">

                <div className="make-reservation-button">
                    <button onClick={() => {
                    setIsMakeReservationOpen(true);
                    document.getElementById("all-reservations-container").style.display = "none";
                    }}>Make Reservation</button>
                </div>

                <table className='reservation-table' id='reservation-table'>
                    {/* this reservation table will need to be setup based on how we want to 
                    view reservations and all the things that need to be viewable here */}
                    <tr className="reservation-table-header">
                        <th>Reservation No.</th>
                        <th>Item Name</th>
                        <th>Quantity</th>
                    </tr>

                    {reservations.map((item, index) => (
                        <tr className="table-row" key={item.id}>
                        <td className="table-cell-itemno">{index + 1}</td>
                        <td className="table-cell-name">{item.name}</td>
                        <td>{item.quantity}</td>
                        </tr>
                    ))}
                </table>
            </div>
            <Dialog open={isReservationOpen} onClose={() => {
                setIsReservationOpen(false);
                document.getElementById("input-container").style.display = "flex";
                }} className="reservation-dialog">
                
                <div className="reservation-dialog-backdrop" aria-hidden="true" />

                <div className="reservation-dialog-container">
                    <DialogPanel className="reservation-dialog-panel">
                    <DialogTitle className="reservation-header">Make a Reservation</DialogTitle>
                    
                    <div className="inner-reservation-container">
                        <input>
                            {/* an input will go here to make a reservation */}
                        </input>

                        <div className="button-group">
                            <button 
                                onClick={() => {
                                handleMakeReservation()
                                }}
                                className="inline"
                            >
                                Make Reservation
                            </button>
            
                            <button 
                                onClick={() => {
                                setIsReservationOpen(false);
                                document.getElementById("input-container").style.display = "flex";
                                }}
                                className="inline"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>

                    </DialogPanel>
                </div>
            </Dialog>
        </>
    );
}

export default Reservations;