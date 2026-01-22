import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom';

function Header({userData}) {
    const location = useLocation();
    const navigate = useNavigate();

  // Define content for each page
  const pageContent = {
    '/': {
      title: 'SurveyEarn',
    },
    '/change-password': {
      title: 'Change Password',
    },
    '/deposit': {
      title: 'Deposit Funds',
    },
    '/transactions': {
      title: 'Transaction History',
    },
    '/withdraw': {
      title: 'Withdraw Funds',
    },
    '/packages': {
      title: 'Survey Packages',
    },
    '/edit-profile': {
      title: 'Edit Profile',
    },
    '/bonuses': {
      title: 'Bonuses & Promotions',
    },
    '/surveys': {
      title: 'Available Surveys',
    },
    '/single-Survey': {
      title: 'Consumer Electronics Survey',
    },
    '/profile': {
      title: 'My Profile',
    },
    '/login': {
      title: 'Welcome Back',
    },
    '/register': {
      title: 'Get Started',
    }
  };

  // Get current page content or default to home
  const currentContent = pageContent[location.pathname] || pageContent['/'];
  return (
    <div className="header">
        <div className="header-content">
          {
            
            ["/" , "/register", "/login"].includes(location.pathname) ? 
          <>
            {
              ["/" , "/register", "/login"].includes(location.pathname) ? 
              <div className="logo">
              <h1><i className="fas fa-poll" /> {currentContent.title}</h1>
            </div>
            :
            <div className="balance-display">
              KSh {(userData?.balance || 0).toFixed(2)}
            </div>}
          </> :
          <>
            <a className="back-btn" onClick={() => navigate(-1)}>
              <i className="fas fa-arrow-left" />
            </a>
            <h1>{currentContent.title}</h1>
            <div style={{ width: 40 }} />
          </>
          }
        </div>
    </div>
  )
}

export default Header