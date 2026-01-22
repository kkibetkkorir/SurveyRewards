import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../firebase';
import Swal from 'sweetalert2';

function Login({setLoading}) {
  const [showOTPSection, setShowOTPSection] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const navigate = useNavigate();
  
  const otpRefs = useRef([]);

  // Format phone number as user types
  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 0) {
      if (value.length <= 3) {
        value = value;
      } else if (value.length <= 6) {
        value = value.slice(0, 3) + ' ' + value.slice(3);
      } else {
        value = value.slice(0, 3) + ' ' + value.slice(3, 6) + ' ' + value.slice(6, 10);
      }
    }
    setPhone(value);
    setLoginError('');
  };

  // Handle login with Firebase
  const handleLogin = async () => {
    const phoneDigits = phone.replace(/\D/g, '');
    setLoginError('');

    // Validation
    if (!phoneDigits || phoneDigits.length !== 10) {
      setLoginError('Please enter a valid 10-digit phone number');
      return;
    }

    if (!password) {
      setLoginError('Please enter your password');
      return;
    }

    setIsLoggingIn(true);

    try {
      const result = await loginUser(phoneDigits, password);
      
      if (result.success) {
        // Login successful - Firebase auth state listener will handle redirect
        // For backward compatibility, also store in localStorage
        const userData = {
          ...result.user,
          name: result.user.fullName || result.user.displayName || 'User',
          loggedIn: true,
          lastLogin: new Date().toISOString()
        };
        localStorage.setItem('survey_user', JSON.stringify(userData));
        
        // Clear any errors
        setLoginError('');
      } else {
        setLoginError(result.error || 'Invalid phone number or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  const sendOTP = (phoneNumber) => {
    // This is kept for backward compatibility but won't be used with Firebase
    console.log(`OTP sent to ${phoneNumber}: 123456`);
  };

  const handleOtpChange = (index, value) => {
    // Allow only digits
    const digit = value.replace(/\D/g, '');
    
    if (digit) {
      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);

      // Move to next input if available
      if (index < 5 && otpRefs.current[index + 1]) {
        otpRefs.current[index + 1].focus();
      }
    } else {
      // Clear current field
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Move to previous input
      if (otpRefs.current[index - 1]) {
        otpRefs.current[index - 1].focus();
      }
    }
  };

  const verifyOTP = () => {
    const otpValue = otp.join('');
    setOtpError('');

    if (otpValue.length !== 6) {
      setOtpError('Please enter the complete 6-digit OTP');
      return;
    }

    setIsVerifyingOTP(true);

    // For backward compatibility, still allow OTP verification
    // This won't be used in normal Firebase login flow
    setTimeout(() => {
      // Store user data in localStorage for compatibility
      const userData = {
        phone: phone.replace(/\D/g, ''),
        name: 'Demo User',
        balance: 5000,
        loggedIn: true,
        lastLogin: new Date().toISOString()
      };
      localStorage.setItem('survey_user', JSON.stringify(userData));
      
      // Redirect to home page
      navigate('/');
      setIsVerifyingOTP(false);
    }, 1000);
  };

  const resendOTP = () => {
    const phoneDigits = phone.replace(/\D/g, '');
    sendOTP(phoneDigits);
    Swal.fire({
      title: 'OTP Sent',
      text: 'OTP has been resent to your phone!',
      icon: 'info'
    });
  };

  const showForgotPassword = (e) => {
    e.preventDefault();
    const phoneDigits = prompt('Enter your registered phone number:');
    if (phoneDigits && phoneDigits.replace(/\D/g, '').length === 10) {
      Swal.fire({
        title: 'Reset Request Sent',
        text: 'Password reset instructions have been sent to your phone!',
        icon: 'info'
      });
    }
  };

  // Focus first OTP input when OTP section is shown
  useEffect(() => {
    if (showOTPSection && otpRefs.current[0]) {
      otpRefs.current[0].focus();
    }
  }, [showOTPSection]);

  // Initialize OTP refs
  useEffect(() => {
    otpRefs.current = otpRefs.current.slice(0, 6);
  }, []);

  return (
  <>
  <style>{`
    .login-container {
    background: var(--white);
    border-radius: var(--border-radius);
    width: 100%;
    max-width: 400px;
    padding: 30px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: var(--black);
    font-size: 14px;
}

.input-with-icon {
    position: relative;
}

.input-with-icon i {
    position: absolute;
    left: 15px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--gray);
}

.input-with-icon input {
    width: 100%;
    padding: 15px 15px 15px 45px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 16px;
    transition: all 0.3s;
}

.input-with-icon input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
}

.login-btn {
    width: 100%;
    padding: 15px;
    background: var(--gradient);
    color: var(--white);
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    margin-top: 10px;
}

.login-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(5, 150, 105, 0.3);
}

.login-btn:active {
    transform: translateY(0);
}

.divider {
    text-align: center;
    margin: 25px 0;
    position: relative;
}

.divider::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: #eee;
}

.divider span {
    background: var(--white);
    padding: 0 15px;
    color: var(--gray);
    font-size: 14px;
}

.register-link {
    text-align: center;
    margin-top: 25px;
    font-size: 14px;
}

.register-link a {
    color: var(--primary);
    text-decoration: none;
    font-weight: 600;
}

.register-link a:hover {
    text-decoration: underline;
}

.forgot-password {
    text-align: center;
    margin-top: 15px;
}

.forgot-password a {
    color: var(--gray);
    text-decoration: none;
    font-size: 14px;
}

.forgot-password a:hover {
    color: var(--primary);
}

.otp-section {
    display: none;
    margin-top: 20px;
}

.otp-inputs {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.otp-inputs input {
    width: 60px;
    height: 60px;
    text-align: center;
    font-size: 24px;
    border: 2px solid #ddd;
    border-radius: 8px;
}

.otp-inputs input:focus {
    border-color: var(--primary);
    outline: none;
}

.resend-otp {
    text-align: center;
    margin-top: 15px;
    font-size: 14px;
}

.resend-otp a {
    color: var(--primary);
    text-decoration: none;
}

.error-message {
    color: #dc3545;
    font-size: 14px;
    margin-top: 10px;
    display: block;
}

@media (max-width: 480px) {
    .login-container {
        padding: 20px;
    }

    .otp-inputs input {
        width: 50px;
        height: 50px;
        font-size: 20px;
    }
}
  `}</style>
    <div className="login-container">
      {!showOTPSection ? (
        <div id="phone-section">
          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <div className="input-with-icon">
              <i className="fas fa-phone" />
              <input
                type="tel"
                id="phone"
                placeholder="07XX XXX XXX"
                maxLength={12}
                value={phone}
                onChange={handlePhoneChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <i className="fas fa-lock" />
              <input
                type="password"
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {loginError && (
            <div id="login-error" className="error-message">
              {loginError}
            </div>
          )}

          <button
            className="login-btn"
            onClick={handleLogin}
            disabled={isLoggingIn}
          >
            <i className={`fas ${isLoggingIn ? 'fa-spinner fa-spin' : 'fa-sign-in-alt'}`} />
            {isLoggingIn ? 'Logging in...' : 'Login'}
          </button>

          <div className="forgot-password">
            <a href="#" onClick={showForgotPassword}>Forgot Password?</a>
          </div>
        </div>
      ) : (
        <div id="otp-section" className="otp-section">
          <p style={{ textAlign: "center", marginBottom: 20 }}>
            Enter the 6-digit OTP sent to your phone
          </p>
          
          <div className="otp-inputs">
            {[...Array(6)].map((_, index) => (
              <input
                key={index}
                type="text"
                maxLength={1}
                value={otp[index]}
                ref={(el) => (otpRefs.current[index] = el)}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                style={{ textAlign: 'center' }}
              />
            ))}
          </div>

          {otpError && (
            <div id="otp-error" className="error-message">
              {otpError}
            </div>
          )}

          <button
            className="login-btn"
            onClick={verifyOTP}
            disabled={isVerifyingOTP}
          >
            <i className={`fas ${isVerifyingOTP ? 'fa-spinner fa-spin' : 'fa-check'}`} />
            {isVerifyingOTP ? 'Verifying...' : 'Verify OTP'}
          </button>

          <div className="resend-otp">
            Didn't receive OTP? <a href="#" onClick={resendOTP}>Resend</a>
          </div>
        </div>
      )}

      <div className="divider"><span>or</span></div>

      <div className="register-link">
        Don't have an account? <a href="/register">Register here</a>
      </div>
    </div>
  </>
  );
}

export default Login;