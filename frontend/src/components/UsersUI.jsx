import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useState } from 'react';
import { useEffect } from 'react';


function UsersUI() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [users, setUsers] = useState([]);


  const validateEmail = (email) => {
    if (!email || email.trim() === '') {
      setEmailError('Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    if (email.length > 255) {
      setEmailError('Email must be 255 characters or less');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (password) => {
    if (!password || password.trim() === '') {
      setPasswordError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users.php', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    
    fetchUsers();
  }, []);

  const handleAddUser = async () => {
    // Validate all fields first
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }
    
    try {
      const response = await fetch('/api/users.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setUsers([...users, data.user]); // Add new user to list
        setEmail('');
        setPassword('');
        setIsAddUserOpen(false);
        document.getElementById("users-table-div").style.display = "flex";
      }
    } catch (error) {
      console.error('Failed to add user:', error);
    }
  };

  return (
    <>
      <div className="table-div" id='users-table-div'>
        
        <div className="add-item-button">
            <button onClick={() => {
              setIsAddUserOpen(true);
              document.getElementById("users-table-div").style.display = "none";
            }}>Add User</button>
        </div>

        <table className='inventory-table' id='users-table'>
          <tr className="table-header">
            <th>User No.</th>
            <th>Email</th>
            <th>Created At</th>
          </tr>

          {users.map((user, index) => (
            <tr className="table-row" key={user.id}>
              <td className="table-cell-itemno">{index + 1}</td>
              <td className="table-cell-name">{user.email}</td>
              <td>{new Date(user.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </table>

        <Dialog open={isAddUserOpen} onClose={() => {
          setIsAddUserOpen(false);
          document.getElementById("users-table-div").style.display = "flex";
        }} className="add-item-dialog">
          <div className="add-item-dialog-backdrop" aria-hidden="true" />
          <div className="add-item-dialog-container">
            <DialogPanel className="add-item-dialog-panel">
              <DialogTitle className="add-item-header">Add New User</DialogTitle>
              <div className="inner-add-item-container">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) validateEmail(e.target.value);
                  }}
                  onBlur={() => validateEmail(email)}
                  className="add-item-name-input"
                  maxLength={255}
                  style={{
                    border: emailError ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
                  }}
                />
                {emailError && <span style={{ color: 'red', fontSize: '14px' }}>{emailError}</span>}

                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) validatePassword(e.target.value);
                  }}
                  onBlur={() => validatePassword(password)}
                  className="add-item-type-input"
                  style={{
                    border: passwordError ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
                  }}
                />
                {passwordError && <span style={{ color: 'red', fontSize: '14px' }}>{passwordError}</span>}

                <div className="button-group">
                  <button 
                    onClick={() => {
                      handleAddUser()
                    }}
                    className="inline"
                  >
                    Add User
                  </button>
                  <button 
                    onClick={() => {
                      setIsAddUserOpen(false);
                      document.getElementById("users-table-div").style.display = "block";
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

export default UsersUI;