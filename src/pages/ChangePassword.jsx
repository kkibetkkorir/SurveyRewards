import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, changeUserPassword } from '../firebase';
import Swal from 'sweetalert2';

function ChangePassword({setLoading}) {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [requirements, setRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [user, setUser] = useState(null);

  // Check if user is logged in and fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      const userData = await getCurrentUser();
      if (!userData) {
        navigate('/login');
      } else {
        setUser(userData);
      }
    };

    fetchUser();
  }, [navigate]);

  // Check password strength and requirements
  useEffect(() => {
    const newRequirements = {
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      special: /[^A-Za-z0-9]/.test(newPassword)
    };
    
    setRequirements(newRequirements);

    // Calculate strength
    let strength = 0;
    if (newRequirements.length) strength += 20;
    if (newRequirements.uppercase) strength += 20;
    if (newRequirements.lowercase) strength += 20;
    if (newRequirements.number) strength += 20;
    if (newRequirements.special) strength += 20;
    
    setPasswordStrength(strength);
  }, [newPassword]);

  // Validate form
  useEffect(() => {
    const isValid = 
      currentPassword.trim() !== '' &&
      newPassword.trim() !== '' &&
      confirmPassword.trim() !== '' &&
      passwordStrength >= 75 &&
      newPassword === confirmPassword;
    
    setIsFormValid(isValid);
  }, [currentPassword, newPassword, confirmPassword, passwordStrength]);

  const togglePassword = (field) => {
    switch(field) {
      case 'current':
        setShowCurrentPassword(!showCurrentPassword);
        break;
      case 'new':
        setShowNewPassword(!showNewPassword);
        break;
      case 'confirm':
        setShowConfirmPassword(!showConfirmPassword);
        break;
      default:
        break;
    }
  };

  const getStrengthClass = () => {
    if (passwordStrength <= 25) return 'strength-weak';
    if (passwordStrength <= 50) return 'strength-fair';
    if (passwordStrength <= 75) return 'strength-good';
    return 'strength-strong';
  };

  const changePassword = async () => {
    if (!isFormValid) return;

    if (!user?.uid) {
      setError('User not found. Please login again.');
      return;
    }

    setError('');
    setSuccess('');
    setIsChanging(true);

    // Validation
    if (newPassword === currentPassword) {
      setError('New password must be different from current password');
      setIsChanging(false);
      return;
    }

    try {
      // Call Firebase change password function
      const result = await changeUserPassword(
        user.uid,
        currentPassword,
        newPassword
      );
      
      if (result.success) {
        // Clear form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordStrength(0);
        setRequirements({
          length: false,
          uppercase: false,
          lowercase: false,
          number: false,
          special: false
        });

        // Show success
        setSuccess('Password changed successfully!');
        
        // Auto-hide success message and navigate back
        setTimeout(() => {
          setSuccess('');
          navigate('/profile');
        }, 3000);
      } else {
        setError(result.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setError('Failed to change password. Please try again.');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div>
      <style>{`
        .password-form {
          background: var(--white);
          border-radius: 15px;
          margin: 20px;
          padding: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .form-group {
          margin-bottom: 20px;
          position: relative;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: var(--black);
          font-size: 14px;
        }

        .form-input {
          width: 100%;
          padding: 15px 45px 15px 15px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 16px;
          transition: all 0.3s;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
        }

        .toggle-password {
          position: absolute;
          right: 15px;
          top: 45px;
          background: none;
          border: none;
          color: var(--gray);
          cursor: pointer;
          font-size: 18px;
        }

        .password-strength {
          margin-top: 10px;
          height: 5px;
          background: #eee;
          border-radius: 3px;
          overflow: hidden;
        }

        .strength-meter {
          height: 100%;
          border-radius: 3px;
          transition: all 0.3s;
        }

        .strength-weak { background: #dc3545; width: 25%; }
        .strength-fair { background: #fd7e14; width: 50%; }
        .strength-good { background: #ffc107; width: 75%; }
        .strength-strong { background: #28a745; width: 100%; }

        .password-requirements {
          background: #f8f9fa;
          border-radius: 10px;
          padding: 15px;
          margin-bottom: 20px;
          font-size: 14px;
          color: var(--gray);
        }

        .password-requirements h4 {
          color: var(--primary);
          margin-bottom: 10px;
          font-size: 14px;
        }

        .password-requirements ul {
          padding-left: 20px;
        }

        .password-requirements li {
          margin-bottom: 5px;
        }

        .requirement-met {
          color: var(--primary);
        }

        .requirement-unmet {
          color: var(--gray);
        }

        .change-btn {
          background: var(--gradient);
          color: white;
          border: none;
          padding: 16px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s;
          margin-top: 10px;
        }

        .change-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(5, 150, 105, 0.3);
        }

        .change-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        .error-message {
          color: #dc3545;
          font-size: 14px;
          margin-top: 10px;
          display: block;
        }

        .success-message {
          color: var(--primary);
          font-size: 14px;
          margin-top: 10px;
          display: block;
        }

        @media (max-width: 480px) {
          .password-form {
            margin: 15px;
            padding: 15px;
          }
        }
      `}</style>
      <div className="password-form">
        <div className="password-requirements">
          <h4><i className="fas fa-shield-alt" /> Password Requirements</h4>
          <ul>
            <li className={requirements.length ? 'requirement-met' : 'requirement-unmet'}>
              At least 8 characters
            </li>
            <li className={requirements.uppercase ? 'requirement-met' : 'requirement-unmet'}>
              One uppercase letter
            </li>
            <li className={requirements.lowercase ? 'requirement-met' : 'requirement-unmet'}>
              One lowercase letter
            </li>
            <li className={requirements.number ? 'requirement-met' : 'requirement-unmet'}>
              One number
            </li>
            <li className={requirements.special ? 'requirement-met' : 'requirement-unmet'}>
              One special character
            </li>
          </ul>
        </div>

        <div className="form-group">
          <label htmlFor="currentPassword">Current Password</label>
          <input
            type={showCurrentPassword ? 'text' : 'password'}
            className="form-input"
            id="currentPassword"
            placeholder="Enter current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <button 
            className="toggle-password" 
            onClick={() => togglePassword('current')}
            type="button"
          >
            <i className={showCurrentPassword ? 'fas fa-eye-slash' : 'fas fa-eye'} />
          </button>
        </div>

        <div className="form-group">
          <label htmlFor="newPassword">New Password</label>
          <input
            type={showNewPassword ? 'text' : 'password'}
            className="form-input"
            id="newPassword"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button 
            className="toggle-password" 
            onClick={() => togglePassword('new')}
            type="button"
          >
            <i className={showNewPassword ? 'fas fa-eye-slash' : 'fas fa-eye'} />
          </button>
          <div className="password-strength">
            <div className={`strength-meter ${getStrengthClass()}`} />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm New Password</label>
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            className="form-input"
            id="confirmPassword"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button 
            className="toggle-password" 
            onClick={() => togglePassword('confirm')}
            type="button"
          >
            <i className={showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'} />
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button 
          className="change-btn" 
          onClick={changePassword}
          disabled={!isFormValid || isChanging}
        >
          <i className={`fas ${isChanging ? 'fa-spinner fa-spin' : 'fa-key'}`} /> 
          {isChanging ? 'Changing...' : 'Change Password'}
        </button>
      </div>
    </div>
  );
}

export default ChangePassword;