import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useState } from 'react';
import { useEffect } from 'react';


function StaffUI() {
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [staffNameError, setStaffNameError] = useState('');
  const [staffRoleError, setStaffRoleError] = useState('');
  const [hourlyRateError, setHourlyRateError] = useState('');
  const [staff, setStaff] = useState([]);


  const validateStaffName = (name) => {
    if (!name || name.trim() === '') {
      setStaffNameError('Staff name is required');
      return false;
    }
    if (name.length > 100) {
      setStaffNameError('Staff name must be 100 characters or less');
      return false;
    }
    setStaffNameError('');
    return true;
  };

  const validateStaffRole = (role) => {
    if (!role || role.trim() === '') {
      setStaffRoleError('Role is required');
      return false;
    }
    if (role.length > 50) {
      setStaffRoleError('Role must be 50 characters or less');
      return false;
    }
    setStaffRoleError('');
    return true;
  };

  const validateHourlyRate = (rate) => {
    if (!rate || rate === '') {
      setHourlyRateError('Hourly rate is required');
      return false;
    }
    const rateNum = parseFloat(rate);
    if (isNaN(rateNum) || rateNum < 0) {
      setHourlyRateError('Hourly rate must be a positive number');
      return false;
    }
    if (rateNum > 999.99) {
      setHourlyRateError('Hourly rate must be less than $1,000');
      return false;
    }
    setHourlyRateError('');
    return true;
  };

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await fetch('/api/staff.php', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        const data = await response.json();
        setStaff(data);
      } catch (error) {
        console.error('Failed to fetch staff:', error);
      }
    };
    
    fetchStaff();
  }, []);

  const handleAddStaff = async () => {
    // Validate all fields first
    const isNameValid = validateStaffName(staffName);
    const isRoleValid = validateStaffRole(staffRole);
    const isRateValid = validateHourlyRate(hourlyRate);
    
    if (!isNameValid || !isRoleValid || !isRateValid) {
      return;
    }
    
    try {
      const response = await fetch('/api/staff.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          name: staffName,
          role: staffRole,
          hourly_rate: hourlyRate
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStaff([...staff, data.staff]); // Add new staff to list
        setStaffName('');
        setStaffRole('');
        setHourlyRate('');
        setIsAddStaffOpen(false);
      }
    } catch (error) {
      console.error('Failed to add staff:', error);
    }
  };

  return (
    <>
      <div className="table-div" id='staff-table-div'>
        
        <div className="add-item-button">
            <button onClick={() => {
              setIsAddStaffOpen(true);
            }}>Add Staff</button>
        </div>

        <table className='inventory-table' id='staff-table'>
          <tr className="table-header">
            <th>Staff No.</th>
            <th>Name</th>
            <th>Role</th>
            <th>Hourly Rate</th>
          </tr>

          {staff.map((member, index) => (
            <tr className="table-row" key={member.id}>
              <td className="table-cell-itemno">{index + 1}</td>
              <td className="table-cell-name">{member.name}</td>
              <td>{member.role}</td>
              <td>${parseFloat(member.hourly_rate).toFixed(2)}</td>
            </tr>
          ))}
        </table>

        <Dialog open={isAddStaffOpen} onClose={() => {
          setIsAddStaffOpen(false);
        }} className="add-item-dialog">
          <div className="add-item-dialog-backdrop" aria-hidden="true" />
          <div className="add-item-dialog-container">
            <DialogPanel className="add-item-dialog-panel">
              <DialogTitle className="add-item-header">Add New Staff Member</DialogTitle>
              <div className="inner-add-item-container">
                <input
                  type="text"
                  placeholder="Staff Name"
                  value={staffName}
                  onChange={(e) => {
                    setStaffName(e.target.value);
                    if (staffNameError) validateStaffName(e.target.value);
                  }}
                  onBlur={() => validateStaffName(staffName)}
                  className="add-item-name-input"
                  maxLength={100}
                  style={{
                    border: staffNameError ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
                  }}
                />
                {staffNameError && <span style={{ color: 'red', fontSize: '14px' }}>{staffNameError}</span>}

                <input
                  type="text"
                  placeholder="Role"
                  value={staffRole}
                  onChange={(e) => {
                    setStaffRole(e.target.value);
                    if (staffRoleError) validateStaffRole(e.target.value);
                  }}
                  onBlur={() => validateStaffRole(staffRole)}
                  className="add-item-type-input"
                  maxLength={50}
                  style={{
                    border: staffRoleError ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
                  }}
                />
                {staffRoleError && <span style={{ color: 'red', fontSize: '14px' }}>{staffRoleError}</span>}

                <input
                  type="number"
                  placeholder="Hourly Rate"
                  value={hourlyRate}
                  onChange={(e) => {
                    setHourlyRate(e.target.value);
                    if (hourlyRateError) validateHourlyRate(e.target.value);
                  }}
                  onBlur={() => validateHourlyRate(hourlyRate)}
                  className="add-item-price-input"
                  step="0.01"
                  min="0"
                  max="999.99"
                  style={{
                    border: hourlyRateError ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
                  }}
                />
                {hourlyRateError && <span style={{ color: 'red', fontSize: '14px' }}>{hourlyRateError}</span>}

                <div className="button-group">
                  <button 
                    onClick={() => {
                      handleAddStaff()
                    }}
                    className="inline"
                  >
                    Add Staff
                  </button>
                  <button 
                    onClick={() => {
                      setIsAddStaffOpen(false);
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

      </div>
    </>
  );
}

export default StaffUI;
