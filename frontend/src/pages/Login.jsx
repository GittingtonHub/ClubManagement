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
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [signupEmailError, setSignupEmailError] = useState('');
  const [signupPasswordError, setSignupPasswordError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (password) => {
    if (!password) {
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

  const validateSignupEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setSignupEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setSignupEmailError('Please enter a valid email address');
      return false;
    }
    setSignupEmailError('');
    return true;
  };

  const validateSignupPassword = (password) => {
    if (!password) {
      setSignupPasswordError('Password is required');
      return false;
    }
    if (password.length < 8) {
      setSignupPasswordError('Password must be at least 8 characters');
      return false;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setSignupPasswordError('Password must contain uppercase, lowercase, and number');
      return false;
    }
    setSignupPasswordError('');
    return true;
  };

  const handleSignup = async () => {
    if (!validateSignupEmail(signupEmail) || !validateSignupPassword(signupPassword)) {
      return;
    }
    
    try {
      const response = await fetch('/api/signup.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupEmail, password: signupPassword })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setIsSignUpOpen(false);
        document.getElementById("input-container").style.display = "flex";
        // Optionally auto-login or show success message
      } else {
        setSignupEmailError(data.message || 'Signup failed');
      }
    } catch (error) {
      setSignupEmailError('Server error. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate first
    if (!validateEmail(email) || !validatePassword(password)) {
      return;
    }
    
    try {
      const response = await fetch('/api/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        login({ email: email });
        navigate('/');
      } else {
        setPasswordError(data.message || 'Login failed');
      }
    } catch (error) {
      setPasswordError('Server error. Please try again.');
    }
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
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) validateEmail(e.target.value);
          }}
          onBlur={() => validateEmail(email)}
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
          style={{
            border: passwordError ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
          }}
        />
        {passwordError && <span style={{ color: 'red', fontSize: '14px' }}>{passwordError}</span>}

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
                onChange={(e) => {
                  setSignupEmail(e.target.value);
                  if (signupEmailError) validateSignupEmail(e.target.value);
                }}
                onBlur={() => validateSignupEmail(signupEmail)}
                className="signup-email-input"
                style={{
                  border: signupEmailError ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
                }}
              />
              {signupEmailError && <span style={{ color: 'red', fontSize: '14px' }}>{signupEmailError}</span>}

              <input
                type="password"
                placeholder="Password"
                value={signupPassword}
                onChange={(e) => {
                  setSignupPassword(e.target.value);
                  if (signupPasswordError) validateSignupPassword(e.target.value);
                }}
                onBlur={() => validateSignupPassword(signupPassword)}
                className="signup-password-input"
                style={{
                  border: signupPasswordError ? '2px solid red' : '1px solid rgba(0, 0, 0, 0.2)'
                }}
              />
              {signupPasswordError && <span style={{ color: 'red', fontSize: '14px' }}>{signupPasswordError}</span>}
              
              <div className="button-group">
                <button 
                  onClick={() => {
                    handleSignup()
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