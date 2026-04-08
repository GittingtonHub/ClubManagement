import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useState, useEffect } from 'react';

function StaffUI() {
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [staffNameError, setStaffNameError] = useState('');
  const [staffRoleError, setStaffRoleError] = useState('');
  const [hourlyRateError, setHourlyRateError] = useState('');
  const [staff, setStaff] = useState([]);

  const roleOptions = [
    "Bartender",
    "Bar Back",
    "DJ",
    "Security",
    "Bouncer",
    "Bottle Service Promoter"
  ];

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
    if (!role) {
      setStaffRoleError('Please select a role');
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
          credentials: 'include'
        });
        const data = await response.json();
        setStaff(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch staff:', error);
        setStaff([]);
      }
    };
    
    fetchStaff();
  }, []);

  const handleAddStaff = async () => {
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
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: staffName,
          role: staffRole,
          hourly_rate: hourlyRate
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (data?.staff) {
          setStaff((previousStaff) => [...previousStaff, data.staff]);
        }
        setStaffName('');
        setStaffRole('');
        setHourlyRate('');
        setIsAddStaffOpen(false);
      } else {
        console.error('Failed to add staff:', data?.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Failed to add staff:', error);
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (window.confirm('Are you sure you want to remove this staff member?')) {
      try {
        const response = await fetch(`/api/staff.php?id=${staffId}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (response.ok) {
          setStaff((previousStaff) =>
            previousStaff.filter((member) => String(member.id) !== String(staffId))
          );
          return;
        }

        const responseText = await response.text();
        let data = {};
        try {
          data = responseText ? JSON.parse(responseText) : {};
        } catch {
          data = {};
        }

        if (response.status === 409) {
          window.confirm(data?.message || 'This staff member cannot be removed right now.');
          return;
        }

        console.error('Failed to remove staff:', data?.message || response.statusText);
      } catch (error) {
        console.error('Failed to remove staff:', error);
      }
    }
  };

  return (
    <>
      <div className="table-div" id='staff-table-div'>
        
        <div className="add-item-button">
          <button onClick={() => {
            setIsAddStaffOpen(true);
          }}>
            Add Staff
          </button>
        </div>

        <table className='inventory-table' id='staff-table'>
          <tr className="table-header">
            <th>Staff No.</th>
            <th>Name</th>
            <th>Role</th>
            <th>Hourly Rate</th>
            <th>Actions</th>
          </tr>

          {staff.filter(Boolean).map((member, index) => (
            <tr className="table-row" key={member.id ?? index}>
              <td className="table-cell-itemno">{index + 1}</td>
              <td>{member.name ?? 'N/A'}</td>
              <td>{member.role ?? 'N/A'}</td>
              <td>${Number.parseFloat(member.hourly_rate ?? 0).toFixed(2)}</td>
              <td className="reservation-actions-cell">
                <div className="reservation-actions-buttons">
                  <button className="delete-item-button" onClick={() => handleDeleteStaff(member.id)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </table>

        <Dialog open={isAddStaffOpen} onClose={() => {}} className="add-item-dialog">
          <div className="add-item-dialog-backdrop" aria-hidden="true" />
          <div className="add-item-dialog-container">
            <DialogPanel className="add-item-dialog-panel">
              <DialogTitle className="add-item-header">
                Add New Staff Member
              </DialogTitle>

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
                  maxLength={100}
                  style={{
                    border: staffNameError ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
                  }}
                />
                {staffNameError && <span style={{ color: 'red' }}>{staffNameError}</span>}

                <select
                  value={staffRole}
                  onChange={(e) => {
                    setStaffRole(e.target.value);
                    if (staffRoleError) validateStaffRole(e.target.value);
                  }}
                  onBlur={() => validateStaffRole(staffRole)}
                  className="add-item-name-input"
                  style={{
                    border: staffRoleError ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <option value="">Select Role</option>
                  {roleOptions.map((role, index) => (
                    <option key={index} value={role}>{role}</option>
                  ))}
                </select>
                {staffRoleError && <span style={{ color: 'red' }}>{staffRoleError}</span>}

                <input
                  type="number"
                  placeholder="Hourly Rate"
                  value={hourlyRate}
                  onChange={(e) => {
                    setHourlyRate(e.target.value);
                    if (hourlyRateError) validateHourlyRate(e.target.value);
                  }}
                  onBlur={() => validateHourlyRate(hourlyRate)}
                  step="0.01"
                  min="0"
                  max="999.99"
                  style={{
                    border: hourlyRateError ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
                  }}
                />
                {hourlyRateError && <span style={{ color: 'red' }}>{hourlyRateError}</span>}

                <div className="button-group">
                  <button onClick={handleAddStaff}>Add Staff</button>
                  <button onClick={() => {
                    setIsAddStaffOpen(false);
                  }}>
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
