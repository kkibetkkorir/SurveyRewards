import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../firebase';
import Swal from 'sweetalert2';

function Register() {
  const navigate = useNavigate();
  
  // State management
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Component-level loading state

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
    
    setFormData(prev => ({
      ...prev,
      phone: value
    }));
    
    // Clear error when user types
    if (error) setError('');
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
    
    // Clear error when user types
    if (error) setError('');
  };

  // Handle registration with Firebase
  const handleRegister = async () => {
    const { fullName, phone, password, confirmPassword } = formData;
    const phoneDigits = phone.replace(/\D/g, '');
    
    // Reset messages
    setError('');

    // Validation
    if (!fullName.trim() || fullName.trim().split(' ').length < 2) {
      Swal.fire('Error', 'Please enter your full name (first and last name)', 'error');
      return;
    }

    if (!phoneDigits || phoneDigits.length !== 10) {
      Swal.fire('Error', 'Please enter a valid 10-digit phone number', 'error');
      return;
    }

    if (!password || password.length < 6) {
      Swal.fire('Error', 'Password must be at least 6 characters', 'error');
      return;
    }

    if (password !== confirmPassword) {
      Swal.fire('Error', 'Passwords do not match', 'error');
      return;
    }

    setIsLoading(true); // Use component-level loading state

    try {
      const result = await registerUser(phoneDigits, password, fullName.trim());
      
      if (result.success) {
        Swal.fire({
          title: 'Success!',
          text: 'Registration successful! Welcome to SurveyRewards',
          icon: 'success',
          confirmButtonText: 'Continue'
        }).then(() => {
          // User will be automatically redirected by App.jsx auth state listener
          // No need to manually navigate
        });
      } else {
        Swal.fire('Error', result.error || 'Registration failed', 'error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Swal.fire('Error', 'Registration failed. Please try again.', 'error');
    } finally {
      setIsLoading(false); // Use component-level loading state
    }
  };

  return (
    <div className="auth-page">
      <div className="register-container">
        <div id="register-section">
          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <div className="input-with-icon">
              <i className="fas fa-user" />
              <input
                type="text"
                id="fullName"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <div className="input-with-icon">
              <i className="fas fa-phone" />
              <input
                type="tel"
                id="phone"
                placeholder="07XX XXX XXX"
                maxLength={12}
                value={formData.phone}
                onChange={handlePhoneChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Create Password</label>
            <div className="input-with-icon">
              <i className="fas fa-lock" />
              <input
                type="password"
                id="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-with-icon">
              <i className="fas fa-lock" />
              <input
                type="password"
                id="confirmPassword"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button 
            className="register-btn" 
            onClick={handleRegister}
            disabled={isLoading}
          >
            <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-user-plus'}`} />
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>

          <div className="terms">
            By registering, you agree to our <a href="#">Terms & Conditions</a> and <a href="#">Privacy Policy</a>
          </div>
        </div>

        <div className="login-link">
          Already have an account? <a href="/login">Login here</a>
        </div>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .register-container {
          background: var(--white);
          border-radius: var(--border-radius);
          width: 100%;
          max-width: 400px;
          padding: 30px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
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
          background: white;
        }

        .input-with-icon input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
        }

        .input-with-icon input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .register-btn {
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
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
        }

        .register-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(5, 150, 105, 0.3);
        }

        .register-btn:active {
          transform: translateY(0);
        }

        .register-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none !important;
        }

        .login-link {
          text-align: center;
          margin-top: 25px;
          font-size: 14px;
        }

        .login-link a {
          color: var(--primary);
          text-decoration: none;
          font-weight: 600;
        }

        .login-link a:hover {
          text-decoration: underline;
        }

        .error-message {
          color: #dc3545;
          font-size: 14px;
          margin-top: 10px;
          display: block;
          text-align: center;
        }

        .terms {
          margin-top: 20px;
          font-size: 12px;
          color: var(--gray);
          text-align: center;
        }

        .terms a {
          color: var(--primary);
          text-decoration: none;
        }

        .terms a:hover {
          text-decoration: underline;
        }

        @media (max-width: 480px) {
          .register-container {
            padding: 20px;
          }
          
          .auth-page {
            padding: 10px;
            background: #f5f5f5;
          }
          
          .register-container {
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
        }
      `}</style>
    </div>
  );
}

export default Register;
