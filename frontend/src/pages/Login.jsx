import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Replace with actual authentication logic
    // Should POST to PHP backend (e.g., /api/login.php)
    // Validate credentials, receive token/session
    // Example:
    // const response = await fetch('/api/login.php', {
    //   method: 'POST',
    //   body: JSON.stringify({ username, password })
    // });
    login({ email: email });
    navigate('/');
  };

  return (
    <div className="login-container">
      <header>
        <h1>Club Management</h1>
      </header>

      <div className='input-container' id="input-container">
        <input
          type="text"
          placeholder="Email"
          value={email}
          //TODO: Add regex validation
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleSubmit}>Login</button>

        <button onClick={() => {
          setIsSignUpOpen(true);
          document.getElementById("input-container").style.display = "none";
        }}>Sign Up</button>
      </div>

      <Dialog open={isSignUpOpen} onClose={() => {
        setIsSignUpOpen(false);
        document.getElementById("input-container").style.display = "flex";
      }} className="sign-up-dialog">
        
        <div className="signup-dialog-backdrop" aria-hidden="true" />
        
        <div className="signup-dialog-container">
          <DialogPanel className="signup-dialog-panel">
            <DialogTitle className="sign-up-header">Sign Up</DialogTitle>
            
            <div className="inner-signup-container">
              <input
                type="email"
                placeholder="Email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                className="signup-email-input"
              />
              <input
                type="password"
                placeholder="Password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                className="signup-password-input"
              />
              
              <div className="button-group">
                <button 
                  onClick={() => {
                    // TODO: Handle signup logic
                    setIsSignUpOpen(false);
                    document.getElementById("input-container").style.display = "flex";
                  }}
                  className="inline"
                >
                  Create Account
                </button>

                <button 
                  onClick={() => {
                    setIsSignUpOpen(false);
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
    </div>
  );
}

export default Login;