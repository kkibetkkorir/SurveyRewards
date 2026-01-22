import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const SingleSurvey = () => {
  const navigate = useNavigate();
  
  // Survey Questions Data
  const surveyQuestions = [
    {
      id: 1,
      type: 'single',
      question: "What is your age group?",
      required: true,
      options: [
        "Under 18",
        "18-24 years",
        "25-34 years",
        "35-44 years",
        "45-54 years",
        "55-64 years",
        "65+ years"
      ]
    },
    {
      id: 2,
      type: 'single',
      question: "Which type of electronics do you purchase most frequently?",
      required: true,
      options: [
        "Smartphones",
        "Laptops/Computers",
        "Televisions",
        "Home Appliances",
        "Audio Equipment",
        "Gaming Consoles",
        "Other"
      ]
    },
    {
      id: 3,
      type: 'multiple',
      question: "Where do you typically purchase electronics from? (Select all that apply)",
      required: true,
      options: [
        "Online retailers (Amazon, Jumia)",
        "Brand official stores",
        "Electronics specialty stores",
        "Department stores",
        "Second-hand markets",
        "Direct from manufacturer",
        "Other online platforms"
      ]
    },
    {
      id: 4,
      type: 'rating',
      question: "How important are product reviews when making a purchase decision?",
      required: true,
      options: [
        { value: 1, label: "Not Important" },
        { value: 2, label: "Slightly Important" },
        { value: 3, label: "Moderately Important" },
        { value: 4, label: "Very Important" },
        { value: 5, label: "Extremely Important" }
      ]
    },
    {
      id: 5,
      type: 'single',
      question: "How often do you upgrade your primary smartphone?",
      required: true,
      options: [
        "Less than 1 year",
        "1-2 years",
        "2-3 years",
        "3-4 years",
        "More than 4 years",
        "Only when it breaks"
      ]
    },
    {
      id: 6,
      type: 'text',
      question: "What specific feature do you value most in a new electronic device?",
      required: false,
      placeholder: "e.g., battery life, camera quality, processing speed..."
    },
    {
      id: 7,
      type: 'rating',
      question: "How satisfied are you with your most recent electronics purchase?",
      required: true,
      options: [
        { value: 1, label: "Very Dissatisfied" },
        { value: 2, label: "Dissatisfied" },
        { value: 3, label: "Neutral" },
        { value: 4, label: "Satisfied" },
        { value: 5, label: "Very Satisfied" }
      ]
    },
    {
      id: 8,
      type: 'single',
      question: "What is the primary factor that influences your electronics purchase decisions?",
      required: true,
      options: [
        "Price",
        "Brand reputation",
        "Product features",
        "Reviews & ratings",
        "Recommendations",
        "Special offers/discounts"
      ]
    }
  ];

  // State management
  const [userResponses, setUserResponses] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showValidation, setShowValidation] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [showThankYou, setShowThankYou] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [surveyStartTime] = useState(Date.now());
  
  const totalQuestions = surveyQuestions.length;
  const currentQuestion = surveyQuestions[currentQuestionIndex];
  
  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed(Date.now() - surveyStartTime);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [surveyStartTime]);
  
  // Format time display
  const formatTime = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const formatTimeSpent = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
  };
  
  // Calculate progress
  const answeredCount = Object.keys(userResponses).length;
  const requiredQuestions = surveyQuestions.filter(q => q.required).length;
  const progressPercentage = Math.min(100, Math.round((answeredCount / requiredQuestions) * 100));
  
  // Question loading
  const loadQuestion = (index) => {
    setCurrentQuestionIndex(index);
    setShowValidation(false);
  };
  
  // Handle radio selection
  const handleRadioSelect = (questionId, optionIndex) => {
    setUserResponses(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
    setShowValidation(false);
  };
  
  // Handle checkbox toggle
  const handleCheckboxToggle = (questionId, optionIndex) => {
    setUserResponses(prev => {
      const current = prev[questionId] || [];
      const newArray = current.includes(optionIndex)
        ? current.filter(i => i !== optionIndex)
        : [...current, optionIndex];
      
      if (newArray.length === 0) {
        const { [questionId]: removed, ...rest } = prev;
        return rest;
      }
      
      return {
        ...prev,
        [questionId]: newArray
      };
    });
    setShowValidation(false);
  };
  
  // Handle rating selection
  const handleRatingSelect = (questionId, value) => {
    setUserResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
    setShowValidation(false);
  };
  
  // Handle text input
  const handleTextInput = (questionId, value) => {
    if (value.trim()) {
      setUserResponses(prev => ({
        ...prev,
        [questionId]: value
      }));
    } else {
      setUserResponses(prev => {
        const { [questionId]: removed, ...rest } = prev;
        return rest;
      });
    }
  };
  
  // Validate current question
  const validateCurrentQuestion = () => {
    if (!currentQuestion.required) return true;
    
    const response = userResponses[currentQuestion.id];
    
    if (!response) {
      setValidationMessage(`Please answer question ${currentQuestion.id} to continue`);
      setShowValidation(true);
      return false;
    }
    
    if (currentQuestion.type === 'multiple' && response.length === 0) {
      setValidationMessage(`Please select at least one option for question ${currentQuestion.id}`);
      setShowValidation(true);
      return false;
    }
    
    return true;
  };
  
  // Next question handler
  const handleNextQuestion = () => {
    if (!validateCurrentQuestion()) return;
    
    // Show thank you message after question 6
    if (currentQuestionIndex === 5) {
      setShowThankYou(true);
    }
    
    if (currentQuestionIndex < totalQuestions - 1) {
      loadQuestion(currentQuestionIndex + 1);
    } else {
      // Last question - submit survey
      handleSubmitSurvey();
    }
  };
  
  // Previous question handler
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      loadQuestion(currentQuestionIndex - 1);
    }
  };
  
  // Submit survey
  const handleSubmitSurvey = () => {
    // Validate all required questions
    const requiredQuestions = surveyQuestions.filter(q => q.required);
    const missingQuestions = requiredQuestions.filter(q => !userResponses[q.id]);
    
    if (missingQuestions.length > 0) {
      setValidationMessage(`Please answer ${missingQuestions.length} more required question${missingQuestions.length > 1 ? 's' : ''}`);
      setShowValidation(true);
      return;
    }
    
    // Save survey data
    const minutesSpent = Math.round(timeElapsed / 60000);
    saveSurveyData(minutesSpent);
    
    // Show completion modal
    setShowCompletionModal(true);
  };
  
  // Save survey data
  const saveSurveyData = (minutesSpent) => {
    const surveySubmission = {
      id: 'survey_' + Date.now(),
      title: 'Consumer Electronics Survey',
      questions: surveyQuestions,
      responses: userResponses,
      completionTime: new Date().toISOString(),
      timeSpent: minutesSpent,
      reward: 250
    };
    
    // Save to localStorage
    let submissions = JSON.parse(localStorage.getItem('survey_submissions') || '[]');
    submissions.push(surveySubmission);
    localStorage.setItem('survey_submissions', JSON.stringify(submissions));
    
    // Update user data
    const userData = JSON.parse(localStorage.getItem('survey_user') || '{}');
    const reward = 250;
    
    userData.balance = (userData.balance || 0) + reward;
    userData.totalEarnings = (userData.totalEarnings || 0) + reward;
    userData.surveysCompleted = (userData.surveysCompleted || 0) + 1;
    
    if (userData.availableSurveys && userData.availableSurveys > 0) {
      userData.availableSurveys--;
    }
    
    localStorage.setItem('survey_user', JSON.stringify(userData));
  };
  
  // Navigation handlers
  const goToNextSurvey = () => {
    setShowCompletionModal(false);
    navigate('/surveys');
  };
  
  const goToDashboard = () => {
    setShowCompletionModal(false);
    navigate('/profile');
  };
  
  // Render question based on type
  const renderQuestion = () => {
    const question = currentQuestion;
    const response = userResponses[question.id];
    
    switch (question.type) {
      case 'single':
        return (
          <div className="answer-options">
            {question.options.map((option, index) => (
              <div 
                key={index}
                className={`option-card ${response === index ? 'selected' : ''}`}
                onClick={() => handleRadioSelect(question.id, index)}
              >
                <div className={`option-radio ${response === index ? 'selected' : ''}`}></div>
                <div className="option-text">{option}</div>
              </div>
            ))}
          </div>
        );
        
      case 'multiple':
        return (
          <div className="answer-options">
            {question.options.map((option, index) => (
              <div 
                key={index}
                className={`option-card checkbox-option ${(response || []).includes(index) ? 'selected' : ''}`}
                onClick={() => handleCheckboxToggle(question.id, index)}
              >
                <div className={`option-checkbox ${(response || []).includes(index) ? 'selected' : ''}`}></div>
                <div className="option-text">{option}</div>
              </div>
            ))}
          </div>
        );
        
      case 'rating':
        return (
          <div className="rating-container">
            {question.options.map((option, index) => (
              <div 
                key={index}
                className={`rating-option ${response === option.value ? 'selected' : ''}`}
                onClick={() => handleRatingSelect(question.id, option.value)}
              >
                <div className="rating-value">{option.value}</div>
                <div className="rating-label">{option.label}</div>
              </div>
            ))}
          </div>
        );
        
      case 'text':
        return (
          <div className="text-input-container">
            <textarea 
              className="text-input"
              placeholder={question.placeholder || 'Enter your answer here...'}
              rows="4"
              value={response || ''}
              onChange={(e) => handleTextInput(question.id, e.target.value)}
            ></textarea>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="single-survey">
      <style>{`
        .single-survey {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: var(--light-gray);
          min-height: 100vh;
          padding-bottom: 80px;
        }

        .progress-header {
          background: var(--white);
          padding: 15px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

        .progress-info {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .question-counter {
          background: var(--primary);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
        }

        .progress-text {
          font-size: 14px;
          color: var(--gray);
        }

        .time-display {
          background: #f8f9fa;
          padding: 6px 12px;
          border-radius: 6px;
          font-family: monospace;
          font-weight: 600;
          color: var(--primary);
        }

        .main-container {
          padding: 20px;
        }

        .survey-section {
          background: var(--white);
          border-radius: 15px;
          padding: 25px;
          margin-bottom: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .question-number {
          font-size: 14px;
          color: var(--primary);
          font-weight: 600;
          margin-bottom: 5px;
        }

        .question-text {
          font-size: 18px;
          font-weight: 600;
          color: var(--black);
          margin-bottom: 25px;
          line-height: 1.4;
        }

        .answer-options {
          display: grid;
          gap: 12px;
          margin-bottom: 30px;
        }

        .option-card {
          background: var(--white);
          border: 2px solid #e9ecef;
          border-radius: 10px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .option-card:hover {
          border-color: var(--primary-light);
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(5, 150, 105, 0.1);
        }

        .option-card.selected {
          border-color: var(--primary);
          background: rgba(5, 150, 105, 0.05);
        }

        .option-radio {
          width: 20px;
          height: 20px;
          border: 2px solid #ced4da;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .option-radio.selected {
          border-color: var(--primary);
        }

        .option-radio.selected::after {
          content: '';
          width: 10px;
          height: 10px;
          background: var(--primary);
          border-radius: 50%;
        }

        .option-text {
          flex: 1;
          font-size: 15px;
          color: var(--black);
        }

        .option-card.checkbox-option {
          cursor: pointer;
        }

        .option-checkbox {
          width: 20px;
          height: 20px;
          border: 2px solid #ced4da;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .option-checkbox.selected {
          background: var(--primary);
          border-color: var(--primary);
        }

        .option-checkbox.selected::after {
          content: '✓';
          color: white;
          font-size: 14px;
          font-weight: bold;
        }

        .text-input-container {
          margin-bottom: 30px;
        }

        .text-input {
          width: 100%;
          padding: 15px;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          font-size: 16px;
          transition: all 0.3s ease;
          margin-top: 10px;
          font-family: inherit;
        }

        .text-input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
        }

        .text-input::placeholder {
          color: #adb5bd;
        }

        .rating-container {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 30px;
        }

        .rating-option {
          flex: 1;
          padding: 15px;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .rating-option:hover {
          border-color: var(--primary-light);
          transform: translateY(-2px);
        }

        .rating-option.selected {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .rating-value {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 5px;
        }

        .rating-label {
          font-size: 12px;
          opacity: 0.8;
        }

        .nav-buttons {
          display: flex;
          gap: 15px;
          margin-top: 30px;
        }

        .nav-btn {
          flex: 1;
          padding: 16px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 16px;
          border: none;
          font-family: inherit;
        }

        .nav-btn.primary {
          background: var(--gradient);
          color: white;
        }

        .nav-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(5, 150, 105, 0.3);
        }

        .nav-btn.secondary {
          background: transparent;
          color: var(--primary);
          border: 2px solid var(--primary);
        }

        .nav-btn.secondary:hover {
          background: var(--primary);
          color: white;
        }

        .nav-btn.disabled {
          background: #e9ecef;
          color: var(--gray);
          cursor: not-allowed;
        }

        .nav-btn.disabled:hover {
          transform: none;
          box-shadow: none;
        }

        .progress-container {
          background: var(--white);
          border-radius: 15px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .progress-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .progress-title {
          font-weight: 600;
          color: var(--black);
        }

        .progress-percentage {
          font-weight: 700;
          color: var(--primary);
          font-size: 14px;
        }

        .progress-bar {
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--gradient);
          border-radius: 4px;
          width: ${progressPercentage}%;
          transition: width 0.5s ease;
        }

        .validation-message {
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 8px;
          padding: 12px 15px;
          margin-bottom: 20px;
          display: ${showValidation ? 'flex' : 'none'};
          align-items: center;
          gap: 10px;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .survey-info {
          background: var(--white);
          border-radius: 15px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #f1f3f4;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label {
          color: var(--gray);
          font-size: 14px;
        }

        .info-value {
          color: var(--black);
          font-weight: 500;
        }

        .info-value.reward {
          color: var(--primary);
          font-weight: 700;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          z-index: 2000;
          display: ${showCompletionModal ? 'flex' : 'none'};
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 20px;
          padding: 30px;
          max-width: 400px;
          width: 100%;
          animation: slideIn 0.3s ease;
          text-align: center;
        }

        .modal-icon {
          font-size: 60px;
          color: var(--primary);
          margin-bottom: 20px;
        }

        .modal-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 15px;
          color: var(--black);
        }

        .modal-message {
          color: var(--gray);
          margin-bottom: 25px;
          line-height: 1.6;
        }

        .modal-actions {
          display: flex;
          gap: 10px;
        }

        .modal-btn {
          flex: 1;
          padding: 12px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          font-family: inherit;
        }

        .modal-btn.primary {
          background: var(--primary);
          color: white;
        }

        .modal-btn.secondary {
          background: #f8f9fa;
          color: var(--gray);
        }

        .thank-you-message {
          background: #e8f5e9;
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 20px;
          text-align: center;
          border-left: 4px solid var(--primary);
          display: ${showThankYou ? 'block' : 'none'};
        }

        .thank-you-message h3 {
          color: var(--primary);
          margin-bottom: 10px;
        }

        .thank-you-message p {
          color: #333;
          line-height: 1.5;
        }

        @media (max-width: 480px) {
          .main-container {
            padding: 15px;
          }

          .survey-section {
            padding: 20px;
          }

          .question-text {
            font-size: 16px;
          }

          .option-card {
            padding: 14px;
          }

          .nav-buttons {
            flex-direction: column;
          }

          .rating-container {
            flex-wrap: wrap;
          }

          .rating-option {
            flex: 0 0 calc(50% - 5px);
          }
        }
      `}</style>

      {/* Progress Header */}
      <div className="progress-header">
        <div className="progress-info">
          <div className="question-counter">Q{currentQuestion.id} of {totalQuestions}</div>
          <div className="progress-text">{progressPercentage}% Complete</div>
        </div>
        <div className="time-display">{formatTime(timeElapsed)}</div>
      </div>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-header-row">
          <div className="progress-title">Survey Progress</div>
          <div className="progress-percentage">{progressPercentage}%</div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill"></div>
        </div>
      </div>

      {/* Validation Message */}
      {showValidation && (
        <div className="validation-message">
          <i className="fas fa-exclamation-triangle" />
          <div className="validation-text">{validationMessage}</div>
        </div>
      )}

      {/* Main Survey Container */}
      <div className="main-container">
        {/* Question Container */}
        <div className="survey-section">
          <div className="question-number">Question {currentQuestion.id}</div>
          <h2 className="question-text">{currentQuestion.question}</h2>
          {currentQuestion.required && (
            <div style={{ fontSize: '14px', color: 'var(--primary)', marginBottom: '15px' }}>
              <i className="fas fa-asterisk" style={{ fontSize: 8 }} /> Required question
            </div>
          )}
          
          {renderQuestion()}
        </div>

        {/* Navigation Buttons */}
        <div className="nav-buttons">
          <button 
            className={`nav-btn secondary ${currentQuestionIndex === 0 ? 'disabled' : ''}`}
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <i className="fas fa-arrow-left" /> Previous
          </button>
          <button 
            className="nav-btn primary"
            onClick={handleNextQuestion}
          >
            {currentQuestionIndex === totalQuestions - 1 ? (
              <>
                Submit <i className="fas fa-check" />
              </>
            ) : (
              <>
                Next <i className="fas fa-arrow-right" />
              </>
            )}
          </button>
        </div>

        {/* Survey Info */}
        <div className="survey-info">
          <div className="info-row">
            <div className="info-label">Survey Reward</div>
            <div className="info-value reward">KSh 250</div>
          </div>
          <div className="info-row">
            <div className="info-label">Time Spent</div>
            <div className="info-value">{formatTimeSpent(timeElapsed)}</div>
          </div>
          <div className="info-row">
            <div className="info-label">Estimated Time</div>
            <div className="info-value">15-20 minutes</div>
          </div>
          <div className="info-row">
            <div className="info-label">Questions Remaining</div>
            <div className="info-value">{totalQuestions - currentQuestion.id}</div>
          </div>
        </div>

        {/* Thank You Message */}
        {showThankYou && (
          <div className="thank-you-message">
            <h3><i className="fas fa-check-circle" /> Thank You!</h3>
            <p>Your responses have been recorded. Please complete the remaining questions to receive your reward.</p>
          </div>
        )}
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon">
              <i className="fas fa-trophy" />
            </div>
            <div className="modal-title">Survey Completed! 🎉</div>
            <div className="modal-message">
              Congratulations! You've successfully completed the survey and earned <strong>KSh 250</strong>.<br /><br />
              Your payment will be processed within 24 hours and added to your account balance.
            </div>
            <div className="modal-actions">
              <button className="modal-btn primary" onClick={goToNextSurvey}>
                Next Survey
              </button>
              <button className="modal-btn secondary" onClick={goToDashboard}>
                Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SingleSurvey;