import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, updateUserProfile, uploadProfilePicture } from '../firebase';
import Swal from 'sweetalert2';
 

function EditProfile({setLoading}) {
  const navigate = useNavigate();
  
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    dateOfBirth: ''
  });
  
  const [profileColors] = useState([
    'linear-gradient(135deg, #059669 0%, #065f46 100%)',
    'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
    'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
    'linear-gradient(135deg, #d97706 0%, #92400e 100%)'
  ]);
  
  const [profileColorIndex, setProfileColorIndex] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
   

  // Check if user is logged in and fetch data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          navigate('/login');
          return;
        }

        // Transform Firebase user data to match expected format
        const transformedUser = {
          ...user,
          name: user.fullName || user.displayName || '',
          phone: user.phone || '',
          email: user.email ? user.email.replace('@surveyrewards.com', '') : '',
          dateOfBirth: user.dateOfBirth || '',
          profileColor: user.profileColor || profileColors[0],
          loggedIn: true
        };

        setUserData(transformedUser);
        
        // Initialize form data from Firebase user
        setFormData({
          fullName: transformedUser.name || '',
          email: transformedUser.email || '',
          dateOfBirth: transformedUser.dateOfBirth || ''
        });

        // Restore saved profile color index
        const savedColor = transformedUser.profileColor || profileColors[0];
        const savedIndex = profileColors.indexOf(savedColor);
        setProfileColorIndex(savedIndex >= 0 ? savedIndex : 0);

        // Store in localStorage for compatibility
        localStorage.setItem('survey_user', JSON.stringify(transformedUser));
      } catch (error) {
        console.error('Error fetching user data:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate, profileColors]);

  // Get initials for profile picture
  const getInitials = () => {
    if (!formData.fullName.trim()) return 'U';
    return formData.fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Change profile picture color
  const handleChangeProfilePic = async () => {
    try {
      const nextIndex = (profileColorIndex + 1) % profileColors.length;
      setProfileColorIndex(nextIndex);
      
      // Update in Firebase
      if (userData?.uid) {
        await updateUserProfile(userData.uid, {
          profileColor: profileColors[nextIndex]
        });
        
        // Update local state
        const updatedUserData = {
          ...userData,
          profileColor: profileColors[nextIndex]
        };
        setUserData(updatedUserData);
        localStorage.setItem('survey_user', JSON.stringify(updatedUserData));
      }
    } catch (error) {
      console.error('Error updating profile color:', error);
      Swal.fire('Error', 'Failed to update profile color', 'error');
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  // Handle profile picture upload
  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !userData?.uid) return;

    try {
      if (!file.type.startsWith('image/')) {
        Swal.fire('Error', 'Please select an image file', 'error');
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        Swal.fire('Error', 'Image size should be less than 5MB', 'error');
        return;
      }

      setIsSaving(true);
      const result = await uploadProfilePicture(userData.uid, file);
      
      if (result.success) {
        // Update local state with new profile picture URL
        const updatedUserData = {
          ...userData,
          profilePicture: result.url
        };
        setUserData(updatedUserData);
        localStorage.setItem('survey_user', JSON.stringify(updatedUserData));
        Swal.fire('Success', 'Profile picture updated successfully!', 'success');
      } else {
        Swal.fire('Error', result.error || 'Failed to upload profile picture', 'error');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      Swal.fire('Error', 'Failed to upload profile picture', 'error');
    } finally {
      setIsSaving(false);
      e.target.value = ''; // Reset file input
    }
  };

  // Email validation
  const validateEmail = (email) => {
    if (!email) return true; // Email is optional
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Save profile
  const handleSaveProfile = async () => {
    // Reset messages
    setError('');
    setSuccess('');

    // Validation
    if (!formData.fullName.trim() || formData.fullName.trim().split(' ').length < 2) {
      setError('Please enter your full name (first and last name)');
      return;
    }

    if (formData.email && !validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (formData.dateOfBirth) {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (age < 18) {
        setError('You must be 18 years or older to use this service');
        return;
      }
    }

    if (!userData?.uid) {
      setError('User not found. Please login again.');
      return;
    }

    setIsSaving(true);

    try {
      // Prepare updates for Firebase
      const updates = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        dateOfBirth: formData.dateOfBirth,
        profileColor: profileColors[profileColorIndex]
      };

      // Update in Firebase
      const result = await updateUserProfile(userData.uid, updates);
      
      if (result.success) {
        // Update local state
        const updatedUserData = {
          ...userData,
          ...result.user,
          name: result.user.fullName || result.user.displayName || formData.fullName.trim(),
          email: formData.email.trim(),
          dateOfBirth: formData.dateOfBirth,
          profileColor: profileColors[profileColorIndex]
        };
        
        setUserData(updatedUserData);
        localStorage.setItem('survey_user', JSON.stringify(updatedUserData));
        
        setSuccess('Profile updated successfully!');
        
        // Auto-hide success message
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      } else {
        throw new Error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setError(error.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

   

  if (!userData) {
    return null;
  }

  return (
    <div>
      <style>{`
        .profile-pic-section {
          text-align: center;
          margin: 20px;
        }

        .profile-pic-container {
          position: relative;
          display: inline-block;
        }

        .profile-pic {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 40px;
          font-weight: bold;
          margin: 0 auto 15px;
          border: 4px solid var(--white);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          transition: background 0.3s ease;
        }

        .change-pic-btn {
          position: absolute;
          bottom: 10px;
          right: 0;
          background: var(--primary);
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }

        .edit-form {
          background: var(--white);
          border-radius: 15px;
          margin: 20px;
          padding: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
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

        .form-input {
          width: 100%;
          padding: 15px;
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

        .form-input:disabled {
          background: #f5f5f5;
          color: var(--gray);
          cursor: not-allowed;
        }

        .save-btn {
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

        .save-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(5, 150, 105, 0.3);
        }

        .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        .info-note {
          background: #e8f5e9;
          border-radius: 10px;
          padding: 15px;
          margin-top: 20px;
          border-left: 4px solid var(--primary);
          font-size: 14px;
          color: #2e7d32;
        }

        .info-note i {
          margin-right: 8px;
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
          .edit-form {
            margin: 15px;
            padding: 15px;
          }
          
          .profile-pic {
            width: 90px;
            height: 90px;
            font-size: 36px;
          }
        }
      `}</style>
      <div className="profile-pic-section">
        <div className="profile-pic-container">
          {userData.profilePicture ? (
            <img 
              src={userData.profilePicture} 
              alt="Profile" 
              className="profile-pic"
              style={{ 
                background: profileColors[profileColorIndex],
                objectFit: 'cover' 
              }}
            />
          ) : (
            <div 
              className="profile-pic" 
              style={{ background: profileColors[profileColorIndex] }}
            >
              {getInitials()}
            </div>
          )}
          <button 
            className="change-pic-btn" 
            onClick={() => document.getElementById('profile-picture-input').click()}
          >
            <i className="fas fa-camera" />
          </button>
          <input
            id="profile-picture-input"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleProfilePictureUpload}
          />
        </div>
        <p style={{ color: 'var(--gray)', fontSize: 14 }}>
          Tap to change profile picture
        </p>
      </div>

      <div className="edit-form">
        <div className="form-group">
          <label htmlFor="fullName">Full Name</label>
          <input
            type="text"
            className="form-input"
            id="fullName"
            placeholder="Enter your full name"
            value={formData.fullName}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="phoneNumber">Phone Number</label>
          <input
            type="tel"
            className="form-input"
            id="phoneNumber"
            placeholder="07XX XXX XXX"
            value={userData.phone || ''}
            disabled
          />
          <small style={{ color: 'var(--gray)', fontSize: 12 }}>
            Phone number cannot be changed
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="email">Email Address (Optional)</label>
          <input
            type="email"
            className="form-input"
            id="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="dateOfBirth">Date of Birth</label>
          <input
            type="date"
            className="form-input"
            id="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleInputChange}
          />
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button 
          className="save-btn" 
          onClick={handleSaveProfile}
          disabled={isSaving}
        >
          <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-save'}`} />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>

        <div className="info-note">
          <i className="fas fa-info-circle" />
          Your phone number is used for authentication and cannot be changed. Contact support for assistance.
        </div>
      </div>
    </div>
  );
}

export default EditProfile;