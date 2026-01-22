import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getAvailableSurveys, completeSurvey } from '../firebase';
import Swal from 'sweetalert2';
 

function Surveys({setLoading}) {
  const navigate = useNavigate();
  
  const [userData, setUserData] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [filter, setFilter] = useState('all');
  const [availableSurveys, setAvailableSurveys] = useState(0);
  const [completedSurveys, setCompletedSurveys] = useState(0);
   

  // Check if user is logged in and fetch data
  useEffect(() => {
    const fetchUserAndSurveys = async () => {
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
          balance: user.balance || 0,
          package: user.currentPackage || null,
          availableSurveys: user.availableSurveys || 0,
          surveysCompleted: user.surveysCompleted || 0,
          totalEarnings: user.totalEarnings || 0,
          loggedIn: true
        };

        setUserData(transformedUser);
        
        // Store in localStorage for compatibility
        localStorage.setItem('survey_user', JSON.stringify(transformedUser));
        
        // Fetch surveys from Firebase
        const fetchedSurveys = await getAvailableSurveys(user.uid);
        
        // Transform Firebase surveys to match expected format
        const transformedSurveys = fetchedSurveys.map(survey => ({
          id: survey.id,
          title: survey.title || 'Survey',
          description: survey.description || 'Share your opinion',
          reward: survey.reward || 50,
          duration: `${Math.floor(Math.random() * 10) + 5} mins`,
          category: survey.category || 'General',
          status: 'available',
          completed: survey.completed || false
        }));
        
        setSurveys(transformedSurveys);
        
        // Update stats
        updateSurveyStats(transformedSurveys);
      } catch (error) {
        console.error('Error fetching surveys:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndSurveys();
  }, [navigate]);

  // Update survey statistics
  const updateSurveyStats = (surveysList) => {
    const available = surveysList.filter(s => !s.completed).length;
    const completed = surveysList.filter(s => s.completed).length;
    
    setAvailableSurveys(available);
    setCompletedSurveys(completed);
  };

  // Handle survey click
  const handleSurveyClick = async (survey) => {
    if (!userData?.uid) {
      Swal.fire('Error', 'User not found. Please login again.', 'error');
      return;
    }

    // Check if user has an active package
    if (!userData.package || userData.availableSurveys <= 0) {
      Swal.fire({
        title: 'No Active Package',
        html: `
          <div style="text-align: center;">
            <i class="fas fa-crown" style="font-size: 48px; color: #ffd166;"></i>
            <h3 style="margin: 15px 0;">Purchase a Package</h3>
            <p>You need an active survey package to access premium surveys</p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'View Packages',
        cancelButtonText: 'Not Now'
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/packages');
        }
      });
      return;
    }

    if (survey.completed) {
      Swal.fire({
        title: 'Already Completed',
        text: 'You have already completed this survey.',
        icon: 'info'
      });
      return;
    }

    // Start the survey
    const { value: confirmed } = await Swal.fire({
      title: `Start Survey: ${survey.title}`,
      html: `
        <div style="text-align: center;">
          <div style="font-size: 20px; color: var(--primary); margin-bottom: 10px;">
            <i class="fas fa-poll"></i>
          </div>
          <p><strong>Reward:</strong> KSh ${survey.reward}</p>
          <p><strong>Duration:</strong> ${survey.duration}</p>
          <p><strong>Category:</strong> ${survey.category}</p>
          <p style="margin-top: 15px;">You will answer ${Math.floor(Math.random() * 10) + 5} questions</p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Start Survey',
      cancelButtonText: 'Cancel'
    });

    if (confirmed) {
      await startSurvey(survey);
    }
  };

  // Start survey
  const startSurvey = async (survey) => {
    Swal.fire({
      title: 'Survey in Progress...',
      html: `
        <div style="text-align: center;">
          <div style="font-size: 48px; color: var(--primary); margin-bottom: 20px;">
            <i class="fas fa-spinner fa-spin"></i>
          </div>
          <p>Completing: ${survey.title}</p>
          <p>Please wait while we simulate survey completion...</p>
        </div>
      `,
      allowOutsideClick: false,
      showConfirmButton: false,
      willOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      // Complete survey in Firebase
      const result = await completeSurvey(userData.uid, survey.id);
      
      if (result.success) {
        // Update local state
        const updatedUserData = {
          ...userData,
          balance: userData.balance + result.reward,
          availableSurveys: userData.availableSurveys - 1,
          surveysCompleted: userData.surveysCompleted + 1,
          totalEarnings: userData.totalEarnings + result.reward
        };
        
        setUserData(updatedUserData);
        localStorage.setItem('survey_user', JSON.stringify(updatedUserData));
        
        // Update surveys list
        const updatedSurveys = surveys.map(s => 
          s.id === survey.id ? { ...s, completed: true } : s
        );
        setSurveys(updatedSurveys);
        
        // Update stats
        updateSurveyStats(updatedSurveys);
        
        Swal.fire({
          title: 'Survey Completed! 🎉',
          html: `
            <div style="text-align: center;">
              <i class="fas fa-check-circle" style="font-size: 48px; color: var(--primary);"></i>
              <h3 style="margin: 15px 0;">KSh ${result.reward} Earned!</h3>
              <p>Thank you for completing: ${survey.title}</p>
              <p style="color: var(--gray); font-size: 14px;">Funds added to your balance</p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Continue'
        });
      } else {
        throw new Error(result.error || 'Failed to complete survey');
      }
    } catch (error) {
      console.error('Survey completion error:', error);
      Swal.fire('Error', error.message || 'Failed to complete survey', 'error');
    }
  };

  // Filter surveys
  const filteredSurveys = () => {
    let filtered = [...surveys];
    
    switch(filter) {
      case 'available':
        filtered = filtered.filter(s => !s.completed);
        break;
      case 'completed':
        filtered = filtered.filter(s => s.completed);
        break;
      case 'high-reward':
        filtered = filtered.filter(s => s.reward >= 80);
        break;
      case 'quick':
        filtered = filtered.filter(s => parseInt(s.duration) <= 7);
        break;
      default:
        // 'all' - show all surveys
        break;
    }
    
    return filtered;
  };

  // Get filter button class
  const getFilterClass = (filterName) => {
    return filter === filterName ? 'filter-btn active' : 'filter-btn';
  };

  if (!userData) {
    return null;
  }

  return (
    <div>
      <style>{`
        /* Survey-specific styles */
        .survey-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin: 20px;
        }
        
        .stat-card {
          background: var(--white);
          border-radius: 12px;
          padding: 15px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 5px;
        }
        
        .stat-label {
          font-size: 12px;
          color: var(--gray);
        }
        
        .survey-list {
          padding: 0 20px;
        }
        
        .survey-card {
          background: var(--white);
          border-radius: 15px;
          padding: 20px;
          margin-bottom: 15px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.3s ease;
          border-left: 4px solid transparent;
        }
        
        .survey-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }
        
        .survey-card.completed {
          border-left-color: #6c757d;
          opacity: 0.7;
        }
        
        .survey-card.available {
          border-left-color: var(--primary);
        }
        
        .survey-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
        }
        
        .survey-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--black);
          flex: 1;
        }
        
        .survey-reward {
          background: var(--gradient);
          color: white;
          padding: 5px 12px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 14px;
          white-space: nowrap;
          margin-left: 10px;
        }
        
        .survey-description {
          color: var(--gray);
          font-size: 14px;
          margin-bottom: 15px;
          line-height: 1.5;
        }
        
        .survey-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          color: var(--gray);
        }
        
        .survey-category {
          background: #e8f5e9;
          color: var(--primary);
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .survey-duration {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        
        .survey-status {
          font-size: 12px;
          padding: 3px 8px;
          border-radius: 12px;
          font-weight: 500;
        }
        
        .status-completed {
          background: #d1fae5;
          color: var(--success);
        }
        
        .status-available {
          background: #dbeafe;
          color: #2563eb;
        }
        
        .no-surveys {
          text-align: center;
          padding: 60px 20px;
          color: var(--gray);
        }
        
        .no-surveys i {
          font-size: 48px;
          margin-bottom: 15px;
          color: #ddd;
        }
        
        .package-warning {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-radius: 15px;
          margin: 20px;
          padding: 20px;
          text-align: center;
          border: 2px solid var(--bonus-gold);
        }
        
        @media (max-width: 480px) {
          .survey-stats {
            margin: 15px;
            grid-template-columns: repeat(2, 1fr);
          }
          
          .survey-list {
            padding: 0 15px;
          }
          
          .survey-card {
            padding: 15px;
          }
          
          .survey-header {
            flex-direction: column;
            gap: 10px;
          }
          
          .survey-reward {
            align-self: flex-start;
            margin-left: 0;
          }
        }
      `}</style>

      {/* Survey Stats */}
      <div className="survey-stats">
        <div className="stat-card">
          <div className="stat-value">{availableSurveys}</div>
          <div className="stat-label">Available</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{completedSurveys}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{userData.availableSurveys || 0}</div>
          <div className="stat-label">Package Left</div>
        </div>
      </div>

      {/* Package Warning if no active package */}
      {(!userData.package || userData.availableSurveys <= 0) && (
        <div className="package-warning">
          <h4><i className="fas fa-crown" /> Purchase a Package</h4>
          <p>You need an active survey package to access premium surveys</p>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/packages')}
            style={{ marginTop: 10 }}
          >
            <i className="fas fa-shopping-cart" /> View Packages
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        <button 
          className={getFilterClass('all')}
          onClick={() => setFilter('all')}
        >
          All Surveys
        </button>
        <button 
          className={getFilterClass('available')}
          onClick={() => setFilter('available')}
        >
          Available
        </button>
        <button 
          className={getFilterClass('completed')}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
        <button 
          className={getFilterClass('high-reward')}
          onClick={() => setFilter('high-reward')}
        >
          High Reward
        </button>
        <button 
          className={getFilterClass('quick')}
          onClick={() => setFilter('quick')}
        >
          Quick Surveys
        </button>
      </div>

      {/* Survey List */}
      <div className="survey-list">
        {filteredSurveys().length === 0 ? (
          <div className="no-surveys">
            <i className="fas fa-poll" />
            <h3>No Surveys Available</h3>
            <p>No surveys match your current filter</p>
          </div>
        ) : (
          filteredSurveys().map((survey) => (
            <div 
              key={survey.id}
              className={`survey-card ${survey.completed ? 'completed' : 'available'}`}
              onClick={() => handleSurveyClick(survey)}
            >
              <div className="survey-header">
                <div className="survey-title">{survey.title}</div>
                <div className="survey-reward">
                  KSh {survey.reward}
                </div>
              </div>
              
              <div className="survey-description">
                {survey.description}
              </div>
              
              <div className="survey-footer">
                <div className="survey-category">
                  {survey.category}
                </div>
                
                <div className="survey-duration">
                  <i className="far fa-clock" />
                  {survey.duration}
                </div>
                
                <div className={`survey-status ${survey.completed ? 'status-completed' : 'status-available'}`}>
                  {survey.completed ? 'Completed' : 'Available'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Surveys;