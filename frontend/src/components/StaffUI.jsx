import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { DayPilot } from "@daypilot/daypilot-lite-react";
import { useState, useEffect } from 'react';

const STAFF_ROLE_UPDATE_ENDPOINT = '/api/staff.php';
const STAFF_RATE_UPDATE_ENDPOINT = '/api/staff.php';
const normalizeRole = (roleValue) => String(roleValue ?? '').trim();
const parseRateValue = (rateValue) => {
  const parsedRate = Number.parseFloat(rateValue);
  return Number.isNaN(parsedRate) ? null : parsedRate;
};
const formatRateValue = (rateValue) => {
  const parsedRate = parseRateValue(rateValue);
  return parsedRate === null ? '' : parsedRate.toFixed(2);
};

function StaffUI() {
  // const [staffName, setStaffName] = useState('');
  // const [staffRole, setStaffRole] = useState('');
  // const [hourlyRate, setHourlyRate] = useState('');
  // const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  // const [staffNameError, setStaffNameError] = useState('');
  // const [staffRoleError, setStaffRoleError] = useState('');
  // const [hourlyRateError, setHourlyRateError] = useState('');
  const [staff, setStaff] = useState([]);
  const [roleUpdateByStaffId, setRoleUpdateByStaffId] = useState({});
  const [rateUpdateByStaffId, setRateUpdateByStaffId] = useState({});
  const [rateDraftByStaffId, setRateDraftByStaffId] = useState({});

  const roleOptions = [
    "Bartender",
    "Bar Back",
    "DJ",
    "Security",
    "Bouncer",
    "Bottle Service Promoter"
  ];

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

  const handleRoleChange = async (member, selectedRole) => {
    const currentRole = normalizeRole(member?.role);
    const nextRole = normalizeRole(selectedRole);
    const currentRate = parseRateValue(member?.hourly_rate);
    const staffId = member?.id;

    if (!staffId || !nextRole || nextRole === currentRole || roleUpdateByStaffId[staffId]) {
      return;
    }

    if (currentRate === null) {
      await DayPilot.Modal.alert('Unable to update role because hourly rate is missing.');
      return;
    }

    const confirmation = await DayPilot.Modal.confirm(
      "Do you want to update this staff member's role?",
      { okText: 'Yes', cancelText: 'Cancel' }
    );

    if (confirmation?.canceled) {
      return;
    }

    setRoleUpdateByStaffId((previous) => ({ ...previous, [staffId]: true }));

    try {
      const response = await fetch(STAFF_ROLE_UPDATE_ENDPOINT, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          id: staffId,
          role: nextRole,
          hourly_rate: currentRate
        })
      });

      const responseText = await response.text();
      const payload = responseText ? JSON.parse(responseText) : {};

      if (!response.ok || payload?.success === false) {
        await DayPilot.Modal.alert(payload?.message || 'Unable to update staff role.');
        return;
      }

      setStaff((previousStaff) =>
        (Array.isArray(previousStaff) ? previousStaff : []).map((existingMember) =>
          existingMember?.id === staffId
            ? { ...existingMember, role: nextRole }
            : existingMember
        )
      );
    } catch (error) {
      console.error('Failed to update staff role:', error);
      await DayPilot.Modal.alert('Unable to update staff role.');
    } finally {
      setRoleUpdateByStaffId((previous) => ({ ...previous, [staffId]: false }));
    }
  };

  const resetRateDraft = (staffId) => {
    setRateDraftByStaffId((previous) => {
      const nextDrafts = { ...previous };
      delete nextDrafts[staffId];
      return nextDrafts;
    });
  };

  const handleRateDraftChange = (staffId, nextValue) => {
    setRateDraftByStaffId((previous) => ({ ...previous, [staffId]: nextValue }));
  };

  const handleRateChange = async (member, enteredRate) => {
    const staffId = member?.id;
    if (!staffId || rateUpdateByStaffId[staffId]) {
      return;
    }

    const currentRole = normalizeRole(member?.role);
    const normalizedInput = String(enteredRate ?? '').trim();
    const currentRate = parseRateValue(member?.hourly_rate ?? 0) ?? 0;
    const nextRate = parseRateValue(normalizedInput);

    if (normalizedInput === '') {
      resetRateDraft(staffId);
      return;
    }

    if (!currentRole) {
      await DayPilot.Modal.alert('Unable to update hourly rate because role is missing.');
      resetRateDraft(staffId);
      return;
    }

    if (nextRate === null || nextRate < 0 || nextRate > 999.99) {
      await DayPilot.Modal.alert('Hourly rate must be between 0 and 999.99.');
      resetRateDraft(staffId);
      return;
    }

    if (Math.abs(nextRate - currentRate) < 0.005) {
      resetRateDraft(staffId);
      return;
    }

    const confirmation = await DayPilot.Modal.confirm(
      "Do you want to update this staff member's hourly rate?",
      { okText: 'Yes', cancelText: 'Cancel' }
    );

    if (confirmation?.canceled) {
      resetRateDraft(staffId);
      return;
    }

    setRateUpdateByStaffId((previous) => ({ ...previous, [staffId]: true }));

    try {
      const response = await fetch(STAFF_RATE_UPDATE_ENDPOINT, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          id: staffId,
          role: currentRole,
          hourly_rate: nextRate
        })
      });

      const responseText = await response.text();
      const payload = responseText ? JSON.parse(responseText) : {};

      if (!response.ok || payload?.success === false) {
        await DayPilot.Modal.alert(payload?.message || 'Unable to update hourly rate.');
        return;
      }

      setStaff((previousStaff) =>
        (Array.isArray(previousStaff) ? previousStaff : []).map((existingMember) =>
          existingMember?.id === staffId
            ? { ...existingMember, hourly_rate: nextRate }
            : existingMember
        )
      );
      resetRateDraft(staffId);
    } catch (error) {
      console.error('Failed to update hourly rate:', error);
      await DayPilot.Modal.alert('Unable to update hourly rate.');
    } finally {
      setRateUpdateByStaffId((previous) => ({ ...previous, [staffId]: false }));
    }
  };

  return (
    <>
      <div className="table-div" id='staff-table-div'>

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
              <td>
                <select
                  value={normalizeRole(member.role)}
                  onChange={(event) => handleRoleChange(member, event.target.value)}
                  disabled={Boolean(roleUpdateByStaffId[member.id] || rateUpdateByStaffId[member.id])}
                >
                  {!normalizeRole(member.role) && <option value="">Select role</option>}
                  {roleOptions.map((roleOption) => (
                    <option key={`${member.id}-${roleOption}`} value={roleOption}>
                      {roleOption}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="number"
                  step="1.00"
                  min="0"
                  max="999.99"
                  value={rateDraftByStaffId[member.id] ?? formatRateValue(member.hourly_rate)}
                  onChange={(event) => handleRateDraftChange(member.id, event.target.value)}
                  onBlur={(event) => handleRateChange(member, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                  }}
                  disabled={Boolean(roleUpdateByStaffId[member.id] || rateUpdateByStaffId[member.id])}
                />
              </td>
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
      </div>
    </>
  );
}

export default StaffUI;
