import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutUser } from '../firebase';
import Swal from 'sweetalert2';

function Profile({setLoading}) {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Fetch user data from Firebase
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          // Transform Firebase user data to match the expected format
          const formattedUser = {
            ...user,
            name: user.fullName || user.displayName || 'User',
            phone: user.phone || '',
            balance: user.balance || 0,
            loggedIn: true
          };
          setUserData(formattedUser);
          
          // Also store in localStorage for compatibility
          localStorage.setItem('survey_user', JSON.stringify(formattedUser));
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        navigate('/login');
      }
    };
    
    fetchUser();
  }, [navigate]);

  // Get initials for avatar
  const getInitials = () => {
    if (!userData?.name || !userData.name.trim()) return 'U';
    return userData.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Format phone number for display
  const formatPhoneNumber = (phone) => {
    if (!phone) return 'No phone';
    const cleaned = phone.toString().replace(/\D/g, '');
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    }
    return phone;
  };

  // Handle logout
  const handleLogout = async () => {
    if (!showLogoutConfirm) {
      setShowLogoutConfirm(true);
      return;
    }

    try {
      setIsLoggingOut(true);
      const result = await logoutUser();
      
      if (result.success) {
        // Clear localStorage
        localStorage.removeItem('survey_user');
        // Auth state listener in App.jsx will handle redirect
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
      Swal.fire('Error', 'Logout failed. Please try again.', 'error');
    }
  };

  // Handle menu item click with animation
  const handleMenuItemClick = (e, path) => {
    e.currentTarget.style.backgroundColor = 'rgba(5, 150, 105, 0.05)';
    setTimeout(() => {
      e.currentTarget.style.backgroundColor = '';
    }, 200);
    
    if (path) {
      navigate(path);
    }
  };

  if (!userData) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          color: 'white',
          fontSize: '18px',
          fontWeight: '500'
        }}>
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div>
      <style>{`
        .profile-card {
          background: var(--white);
          border-radius: 15px;
          padding: 20px;
          margin: -12px 20px 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          position: relative;
          z-index: 1;
        }

        .profile-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 25px;
        }

        .profile-avatar {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: var(--gradient);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 30px;
          font-weight: bold;
        }

        .profile-info h2 {
          font-size: 20px;
          margin-bottom: 5px;
        }

        .profile-info p {
          color: var(--gray);
          font-size: 14px;
        }

        .balance-card {
          background: var(--gradient);
          border-radius: 12px;
          padding: 20px;
          color: white;
          margin-bottom: 20px;
        }

        .balance-label {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 5px;
          color: var(--white)
        }

        .balance-amount {
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 15px;
        }

        .balance-actions {
          display: flex;
          gap: 10px;
        }

        .balance-btn {
          flex: 1;
          padding: 10px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
          font-size: 14px;
          cursor: pointer;
        }

        .balance-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .menu-section {
          background: var(--white);
          border-radius: 15px;
          padding: 20px;
          margin: 20px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

        .menu-section h3 {
          font-size: 16px;
          margin-bottom: 15px;
          color: var(--gray);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .menu-item {
          display: flex;
          align-items: center;
          padding: 15px 0;
          border-bottom: 1px solid #eee;
          text-decoration: none;
          color: var(--black);
          cursor: pointer;
        }

        .menu-item:last-child {
          border-bottom: none;
        }

        .menu-item i {
          width: 40px;
          font-size: 20px;
          color: var(--primary);
        }

        .menu-item span {
          flex: 1;
          font-size: 16px;
        }

        .menu-item .arrow {
          color: var(--gray);
        }

        .menu-item:hover {
          color: var(--primary);
        }

        .logout-btn {
          background: ${showLogoutConfirm ? '#ffc107' : '#dc3545'};
          color: white;
          border: none;
          border-radius: 10px;
          padding: 15px;
          font-size: 16px;
          font-weight: 600;
          width: calc(100% - 40px);
          margin: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .logout-btn:hover {
          background: ${showLogoutConfirm ? '#e0a800' : '#c82333'};
        }

        .logout-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        @media (max-width: 480px) {          
          .profile-card {
            margin: -10px 15px 15px;
            padding: 10;
          }

          .profile-header {
          gap: 8px;
          margin-bottom: 5px;
        }


        .profile-avatar {
          width: 35px;
          height: 35px;
          font-size: 22px;
          font-weight: bold;
        }

        .profile-info h2 {
          font-size: 18px;
          margin-bottom: 5px;
        }


        .balance-card {
          border-radius: 8x;
          padding: 10;
        }

        .balance-amount {
          font-size: 20;
          margin-bottom: 10x;
        }
          
          .menu-section {
            margin: 15px;
            padding: 15px;
          }
          
          .logout-btn {
            margin: 15px;
          }
        }
      `}</style>

      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">{getInitials()}</div>
          <div className="profile-info">
            <h2>{userData.name || 'User'}</h2>
            <p>{formatPhoneNumber(userData.phone)}</p>
          </div>
        </div>

        <div className="balance-card">
          <div className="balance-label">Available Balance</div>
          <div className="balance-amount">
            KSh {(userData.balance || 0).toFixed(2)}
          </div>
          <div className="balance-actions">
            <button 
              className="balance-btn" 
              onClick={() => navigate('/deposit')}
            >
              <i className="fas fa-plus" /> Deposit
            </button>
            <button 
              className="balance-btn" 
              onClick={() => navigate('/withdraw')}
            >
              <i className="fas fa-money-bill-wave" /> Withdraw
            </button>
          </div>
        </div>
      </div>

      <div className="menu-section">
        <h3>Account</h3>
        <div 
          className="menu-item" 
          onClick={(e) => handleMenuItemClick(e, '/edit-profile')}
        >
          <i className="fas fa-user-edit" />
          <span>Edit Profile</span>
          <i className="fas fa-chevron-right arrow" />
        </div>
        <div 
          className="menu-item" 
          onClick={(e) => handleMenuItemClick(e, '/change-password')}
        >
          <i className="fas fa-lock" />
          <span>Change Password</span>
          <i className="fas fa-chevron-right arrow" />
        </div>
        <div 
          className="menu-item" 
          onClick={(e) => handleMenuItemClick(e, '/bonuses')}
        >
          <i className="fas fa-gift" />
          <span>Bonuses & Promotions</span>
          <i className="fas fa-chevron-right arrow" />
        </div>
      </div>

      <button 
        className="logout-btn" 
        onClick={handleLogout}
        disabled={isLoggingOut}
      >
        <i className={`fas ${isLoggingOut ? 'fa-spinner fa-spin' : 
          showLogoutConfirm ? 'fa-exclamation-triangle' : 'fa-sign-out-alt'}`} 
        />
        {isLoggingOut ? 'Logging out...' : 
         showLogoutConfirm ? 'Click again to confirm logout' : 
         'Logout'}
      </button>
    </div>
  );
}

export default Profile;