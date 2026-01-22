import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  getCurrentUser, 
  addPackage, 
  addSurvey, 
  getAllUsers, 
  getAllWithdrawals,
  updateUserStatus,
  updateWithdrawalStatus 
} from '../firebase';
 

function Admin({setLoading}) {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('addPackage');
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Add Package State
  const [packageData, setPackageData] = useState({
    name: '',
    price: '',
    surveys: '',
    duration: '30',
    description: '',
    features: ['', '', '']
  });
  
  // Add Survey State
  const [surveyData, setSurveyData] = useState({
    title: '',
    description: '',
    reward: '',
    duration: '5-10',
    category: 'General',
    requirements: ''
  });
  
  // Users State
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  
  // Withdrawals State
  const [withdrawals, setWithdrawals] = useState([]);
  const [filteredWithdrawals, setFilteredWithdrawals] = useState([]);
  const [withdrawalSearch, setWithdrawalSearch] = useState('');
  const [withdrawalStatus, setWithdrawalStatus] = useState('all');
  
  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          navigate('/login');
          return;
        }
        
        // Check if user is admin (you can implement your own admin check logic)
        // For now, checking if email contains 'admin' or user has admin role
        const isAdminUser = user.email?.includes('admin') || user.isAdmin === true;
        
        if (!isAdminUser) {
          Swal.fire('Access Denied', 'You do not have admin privileges', 'error');
          navigate('/');
          return;
        }
        
        setIsAdmin(true);
        setLoading(false);
      } catch (error) {
        console.error('Admin check error:', error);
        navigate('/login');
      }
    };
    
    checkAdmin();
  }, [navigate]);
  
  // Load users and withdrawals when tab changes
  useEffect(() => {
    if (activeTab === 'users' && isAdmin) {
      loadUsers();
    }
    if (activeTab === 'withdrawals' && isAdmin) {
      loadWithdrawals();
    }
  }, [activeTab, isAdmin]);
  
  // Filter users when search changes
  useEffect(() => {
    if (users.length > 0) {
      const filtered = users.filter(user => 
        user.fullName?.toLowerCase().includes(userSearch.toLowerCase()) ||
        user.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        user.phone?.includes(userSearch)
      );
      setFilteredUsers(filtered);
    }
  }, [users, userSearch]);
  
  // Filter withdrawals when search or status changes
  useEffect(() => {
    if (withdrawals.length > 0) {
      let filtered = withdrawals;
      
      // Apply status filter
      if (withdrawalStatus !== 'all') {
        filtered = filtered.filter(w => w.status === withdrawalStatus);
      }
      
      // Apply search filter
      if (withdrawalSearch) {
        filtered = filtered.filter(w => 
          w.phone?.includes(withdrawalSearch) ||
          w.userId?.includes(withdrawalSearch) ||
          w.id?.includes(withdrawalSearch)
        );
      }
      
      setFilteredWithdrawals(filtered);
    }
  }, [withdrawals, withdrawalSearch, withdrawalStatus]);
  
  const loadUsers = async () => {
    try {
      const usersList = await getAllUsers();
      setUsers(usersList);
      setFilteredUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
      Swal.fire('Error', 'Failed to load users', 'error');
    }
  };
  
  const loadWithdrawals = async () => {
    try {
      const withdrawalsList = await getAllWithdrawals();
      setWithdrawals(withdrawalsList);
      setFilteredWithdrawals(withdrawalsList);
    } catch (error) {
      console.error('Error loading withdrawals:', error);
      Swal.fire('Error', 'Failed to load withdrawals', 'error');
    }
  };
  
  // Handle Add Package
  const handlePackageChange = (e) => {
    const { name, value } = e.target;
    setPackageData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleFeatureChange = (index, value) => {
    const newFeatures = [...packageData.features];
    newFeatures[index] = value;
    setPackageData(prev => ({
      ...prev,
      features: newFeatures
    }));
  };
  
  const handleAddPackage = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!packageData.name || !packageData.price || !packageData.surveys || !packageData.duration) {
      Swal.fire('Validation Error', 'Please fill all required fields', 'error');
      return;
    }
    
    const price = parseFloat(packageData.price);
    const surveys = parseInt(packageData.surveys);
    const duration = parseInt(packageData.duration);
    
    if (isNaN(price) || price <= 0) {
      Swal.fire('Validation Error', 'Please enter a valid price', 'error');
      return;
    }
    
    if (isNaN(surveys) || surveys <= 0) {
      Swal.fire('Validation Error', 'Please enter a valid number of surveys', 'error');
      return;
    }
    
    if (isNaN(duration) || duration <= 0) {
      Swal.fire('Validation Error', 'Please enter a valid duration', 'error');
      return;
    }
    
    try {
      const result = await addPackage({
        name: packageData.name,
        price,
        surveys,
        duration,
        description: packageData.description,
        features: packageData.features.filter(f => f.trim() !== '')
      });
      
      if (result.success) {
        Swal.fire('Success', 'Package added successfully!', 'success');
        setPackageData({
          name: '',
          price: '',
          surveys: '',
          duration: '30',
          description: '',
          features: ['', '', '']
        });
      } else {
        throw new Error(result.error || 'Failed to add package');
      }
    } catch (error) {
      console.error('Add package error:', error);
      Swal.fire('Error', error.message || 'Failed to add package', 'error');
    }
  };
  
  // Handle Add Survey
  const handleSurveyChange = (e) => {
    const { name, value } = e.target;
    setSurveyData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleAddSurvey = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!surveyData.title || !surveyData.reward || !surveyData.description) {
      Swal.fire('Validation Error', 'Please fill all required fields', 'error');
      return;
    }
    
    const reward = parseFloat(surveyData.reward);
    
    if (isNaN(reward) || reward <= 0) {
      Swal.fire('Validation Error', 'Please enter a valid reward amount', 'error');
      return;
    }
    
    try {
      const result = await addSurvey({
        title: surveyData.title,
        description: surveyData.description,
        reward,
        duration: surveyData.duration,
        category: surveyData.category,
        requirements: surveyData.requirements,
        isActive: true
      });
      
      if (result.success) {
        Swal.fire('Success', 'Survey added successfully!', 'success');
        setSurveyData({
          title: '',
          description: '',
          reward: '',
          duration: '5-10',
          category: 'General',
          requirements: ''
        });
      } else {
        throw new Error(result.error || 'Failed to add survey');
      }
    } catch (error) {
      console.error('Add survey error:', error);
      Swal.fire('Error', error.message || 'Failed to add survey', 'error');
    }
  };
  
  // Handle User Actions
  const handleToggleUserStatus = async (userId, currentStatus) => {
    const { value: confirmed } = await Swal.fire({
      title: 'Confirm Action',
      text: `Are you sure you want to ${currentStatus ? 'disable' : 'enable'} this user?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, proceed',
      cancelButtonText: 'Cancel'
    });
    
    if (confirmed) {
      try {
        const result = await updateUserStatus(userId, !currentStatus);
        
        if (result.success) {
          Swal.fire('Success', result.message, 'success');
          loadUsers(); // Refresh users list
        } else {
          throw new Error(result.error || 'Failed to update user status');
        }
      } catch (error) {
        console.error('Update user status error:', error);
        Swal.fire('Error', error.message || 'Failed to update user status', 'error');
      }
    }
  };
  
  // Handle Withdrawal Actions
  const handleUpdateWithdrawalStatus = async (withdrawalId, currentStatus) => {
    const { value: newStatus } = await Swal.fire({
      title: 'Update Withdrawal Status',
      input: 'select',
      inputOptions: {
        pending: 'Pending',
        processing: 'Processing',
        completed: 'Completed',
        failed: 'Failed',
        cancelled: 'Cancelled'
      },
      inputValue: currentStatus,
      showCancelButton: true,
      confirmButtonText: 'Update',
      cancelButtonText: 'Cancel'
    });
    
    if (newStatus) {
      try {
        const result = await updateWithdrawalStatus(withdrawalId, newStatus);
        
        if (result.success) {
          Swal.fire('Success', result.message, 'success');
          loadWithdrawals(); // Refresh withdrawals list
        } else {
          throw new Error(result.error || 'Failed to update withdrawal status');
        }
      } catch (error) {
        console.error('Update withdrawal error:', error);
        Swal.fire('Error', error.message || 'Failed to update withdrawal status', 'error');
      }
    }
  };
  
  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-KE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
   
  
  if (!isAdmin) {
    return null;
  }
  
  return (
    <div>
      <style>{`
        .admin-container {
          min-height: 100vh;
          background: #f5f5f5;
        }
        
        .admin-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .admin-header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .admin-header h1 {
          margin: 0;
          font-size: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .admin-nav {
          background: white;
          border-bottom: 1px solid #e0e0e0;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        
        .admin-tabs {
          display: flex;
          max-width: 1200px;
          margin: 0 auto;
          overflow-x: auto;
        }
        
        .admin-tab {
          padding: 15px 20px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          font-size: 14px;
          font-weight: 600;
          color: #666;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .admin-tab:hover {
          color: #667eea;
          background: #f8f9fa;
        }
        
        .admin-tab.active {
          color: #667eea;
          border-bottom-color: #667eea;
          background: #f8f9fa;
        }
        
        .admin-content {
          max-width: 1200px;
          margin: 20px auto;
          padding: 0 20px;
        }
        
        .admin-card {
          background: white;
          border-radius: 10px;
          padding: 25px;
          box-shadow: 0 2px 15px rgba(0, 0, 0, 0.08);
          margin-bottom: 20px;
        }
        
        .card-title {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #333;
          font-size: 14px;
        }
        
        .form-label .required {
          color: #dc3545;
          margin-left: 2px;
        }
        
        .form-input {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.3s;
        }
        
        .form-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .form-textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          resize: vertical;
          min-height: 100px;
          transition: all 0.3s;
        }
        
        .form-textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .submit-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 14px 30px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 10px;
        }
        
        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
        }
        
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }
        
        .admin-table-container {
          overflow-x: auto;
          margin-top: 20px;
        }
        
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 800px;
        }
        
        .admin-table th {
          background: #f8f9fa;
          padding: 12px 15px;
          text-align: left;
          font-weight: 600;
          color: #333;
          font-size: 13px;
          border-bottom: 2px solid #e0e0e0;
          white-space: nowrap;
        }
        
        .admin-table td {
          padding: 12px 15px;
          border-bottom: 1px solid #f0f0f0;
          font-size: 13px;
          vertical-align: middle;
        }
        
        .admin-table tr:hover {
          background: #f8f9fa;
        }
        
        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .status-active {
          background: #d1fae5;
          color: #065f46;
        }
        
        .status-inactive {
          background: #fee2e2;
          color: #991b1b;
        }
        
        .status-pending {
          background: #fef3c7;
          color: #92400e;
        }
        
        .status-processing {
          background: #dbeafe;
          color: #1e40af;
        }
        
        .status-completed {
          background: #d1fae5;
          color: #065f46;
        }
        
        .status-failed {
          background: #fee2e2;
          color: #991b1b;
        }
        
        .status-cancelled {
          background: #f3f4f6;
          color: #374151;
        }
        
        .action-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s;
          margin-right: 5px;
        }
        
        .action-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        
        .btn-edit {
          background: #dbeafe;
          color: #1e40af;
        }
        
        .btn-disable {
          background: #fee2e2;
          color: #991b1b;
        }
        
        .btn-enable {
          background: #d1fae5;
          color: #065f46;
        }
        
        .btn-update {
          background: #fef3c7;
          color: #92400e;
        }
        
        .search-container {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }
        
        .search-input {
          flex: 1;
          padding: 10px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
        }
        
        .filter-select {
          padding: 10px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          background: white;
          min-width: 150px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 30px;
        }
        
        .stat-card {
          background: white;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          text-align: center;
        }
        
        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #667eea;
          margin-bottom: 5px;
        }
        
        .stat-label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #666;
        }
        
        .empty-state i {
          font-size: 48px;
          margin-bottom: 15px;
          color: #ddd;
        }
        
        @media (max-width: 768px) {
          .admin-header-content {
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }
          
          .admin-tabs {
            justify-content: flex-start;
          }
          
          .admin-content {
            padding: 0 15px;
          }
          
          .admin-card {
            padding: 20px;
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
          }
          
          .search-container {
            flex-direction: column;
          }
        }
      `}</style>
      
      <div className="admin-container">
        <div className="admin-header">
          <div className="admin-header-content">
            <h1>
              <i className="fas fa-user-shield" />
              Admin Dashboard
            </h1>
            <button 
              onClick={() => navigate('/')}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className="fas fa-arrow-left" /> Back to App
            </button>
          </div>
        </div>
        
        <div className="admin-nav">
          <div className="admin-tabs">
            <button 
              className={`admin-tab ${activeTab === 'addPackage' ? 'active' : ''}`}
              onClick={() => setActiveTab('addPackage')}
            >
              <i className="fas fa-box" /> Add Package
            </button>
            <button 
              className={`admin-tab ${activeTab === 'addSurvey' ? 'active' : ''}`}
              onClick={() => setActiveTab('addSurvey')}
            >
              <i className="fas fa-poll" /> Add Survey
            </button>
            <button 
              className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <i className="fas fa-users" /> Users
            </button>
            <button 
              className={`admin-tab ${activeTab === 'withdrawals' ? 'active' : ''}`}
              onClick={() => setActiveTab('withdrawals')}
            >
              <i className="fas fa-money-bill-wave" /> Withdrawals
            </button>
          </div>
        </div>
        
        <div className="admin-content">
          {/* Add Package Tab */}
          {activeTab === 'addPackage' && (
            <div className="admin-card">
              <h2 className="card-title">
                <i className="fas fa-plus-circle" /> Add New Package
              </h2>
              
              <form onSubmit={handleAddPackage}>
                <div className="form-group">
                  <label className="form-label">
                    Package Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    placeholder="e.g., Premium Package"
                    value={packageData.name}
                    onChange={handlePackageChange}
                    required
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  <div className="form-group">
                    <label className="form-label">
                      Price (KSh) <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      name="price"
                      className="form-input"
                      placeholder="e.g., 500"
                      value={packageData.price}
                      onChange={handlePackageChange}
                      min="1"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">
                      Number of Surveys <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      name="surveys"
                      className="form-input"
                      placeholder="e.g., 35"
                      value={packageData.surveys}
                      onChange={handlePackageChange}
                      min="1"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">
                      Duration (Days) <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      name="duration"
                      className="form-input"
                      placeholder="e.g., 30"
                      value={packageData.duration}
                      onChange={handlePackageChange}
                      min="1"
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    className="form-textarea"
                    placeholder="Package description..."
                    value={packageData.description}
                    onChange={handlePackageChange}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Features (Optional)</label>
                  {packageData.features.map((feature, index) => (
                    <div key={index} style={{ marginBottom: '10px' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={`Feature ${index + 1}`}
                        value={feature}
                        onChange={(e) => handleFeatureChange(index, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                
                <button type="submit" className="submit-btn">
                  <i className="fas fa-plus" /> Add Package
                </button>
              </form>
            </div>
          )}
          
          {/* Add Survey Tab */}
          {activeTab === 'addSurvey' && (
            <div className="admin-card">
              <h2 className="card-title">
                <i className="fas fa-plus-circle" /> Add New Survey
              </h2>
              
              <form onSubmit={handleAddSurvey}>
                <div className="form-group">
                  <label className="form-label">
                    Survey Title <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    className="form-input"
                    placeholder="e.g., Mobile App Usage Survey"
                    value={surveyData.title}
                    onChange={handleSurveyChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    Description <span className="required">*</span>
                  </label>
                  <textarea
                    name="description"
                    className="form-textarea"
                    placeholder="Survey description..."
                    value={surveyData.description}
                    onChange={handleSurveyChange}
                    required
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  <div className="form-group">
                    <label className="form-label">
                      Reward (KSh) <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      name="reward"
                      className="form-input"
                      placeholder="e.g., 50"
                      value={surveyData.reward}
                      onChange={handleSurveyChange}
                      min="1"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Duration</label>
                    <select
                      name="duration"
                      className="form-input"
                      value={surveyData.duration}
                      onChange={handleSurveyChange}
                    >
                      <option value="5-10">5-10 minutes</option>
                      <option value="10-15">10-15 minutes</option>
                      <option value="15-20">15-20 minutes</option>
                      <option value="20-30">20-30 minutes</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      name="category"
                      className="form-input"
                      value={surveyData.category}
                      onChange={handleSurveyChange}
                    >
                      <option value="General">General</option>
                      <option value="Technology">Technology</option>
                      <option value="Shopping">Shopping</option>
                      <option value="Health">Health</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Finance">Finance</option>
                      <option value="Education">Education</option>
                      <option value="Social">Social Media</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Requirements (Optional)</label>
                  <textarea
                    name="requirements"
                    className="form-textarea"
                    placeholder="Survey requirements or eligibility criteria..."
                    value={surveyData.requirements}
                    onChange={handleSurveyChange}
                  />
                </div>
                
                <button type="submit" className="submit-btn">
                  <i className="fas fa-plus" /> Add Survey
                </button>
              </form>
            </div>
          )}
          
          {/* Users Tab */}
          {activeTab === 'users' && (
            <>
              <div className="admin-card">
                <h2 className="card-title">
                  <i className="fas fa-users" /> Users Management
                </h2>
                
                <div className="search-container">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search users by name, email, or phone..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
                
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{users.length}</div>
                    <div className="stat-label">Total Users</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">
                      {users.filter(u => u.isActive).length}
                    </div>
                    <div className="stat-label">Active Users</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">
                      {users.filter(u => u.currentPackage).length}
                    </div>
                    <div className="stat-label">With Package</div>
                  </div>
                </div>
                
                <div className="admin-table-container">
                  {filteredUsers.length === 0 ? (
                    <div className="empty-state">
                      <i className="fas fa-users" />
                      <h3>No Users Found</h3>
                      <p>No users match your search criteria</p>
                    </div>
                  ) : (
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Contact</th>
                          <th>Balance</th>
                          <th>Package</th>
                          <th>Surveys</th>
                          <th>Status</th>
                          <th>Joined</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(user => (
                          <tr key={user.id}>
                            <td>
                              <div>
                                <strong>{user.fullName || 'N/A'}</strong>
                                <div style={{ fontSize: '11px', color: '#666' }}>
                                  ID: {user.id.substring(0, 8)}...
                                </div>
                              </div>
                            </td>
                            <td>
                              <div>{user.phone || 'N/A'}</div>
                              <div style={{ fontSize: '11px', color: '#666' }}>
                                {user.email}
                              </div>
                            </td>
                            <td>
                              <strong>KSh {(user.balance || 0).toFixed(2)}</strong>
                            </td>
                            <td>
                              {user.currentPackage ? (
                                <span className="status-badge status-active">
                                  Active
                                </span>
                              ) : (
                                <span style={{ color: '#666', fontSize: '12px' }}>
                                  No Package
                                </span>
                              )}
                            </td>
                            <td>
                              <div style={{ fontSize: '12px' }}>
                                Completed: {user.surveysCompleted || 0}
                              </div>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                Available: {user.availableSurveys || 0}
                              </div>
                            </td>
                            <td>
                              <span className={`status-badge ${user.isActive ? 'status-active' : 'status-inactive'}`}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontSize: '11px' }}>
                                {formatDate(user.createdAt)}
                              </div>
                            </td>
                            <td>
                              <button
                                className={`action-btn ${user.isActive ? 'btn-disable' : 'btn-enable'}`}
                                onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                              >
                                <i className={`fas ${user.isActive ? 'fa-ban' : 'fa-check'}`} />
                                {user.isActive ? 'Disable' : 'Enable'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
          
          {/* Withdrawals Tab */}
          {activeTab === 'withdrawals' && (
            <>
              <div className="admin-card">
                <h2 className="card-title">
                  <i className="fas fa-money-bill-wave" /> Withdrawals Management
                </h2>
                
                <div className="search-container">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search by phone, user ID, or withdrawal ID..."
                    value={withdrawalSearch}
                    onChange={(e) => setWithdrawalSearch(e.target.value)}
                  />
                  <select
                    className="filter-select"
                    value={withdrawalStatus}
                    onChange={(e) => setWithdrawalStatus(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{withdrawals.length}</div>
                    <div className="stat-label">Total Withdrawals</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">
                      {withdrawals.filter(w => w.status === 'pending').length}
                    </div>
                    <div className="stat-label">Pending</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">
                      KSh {withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0).toLocaleString()}
                    </div>
                    <div className="stat-label">Total Amount</div>
                  </div>
                </div>
                
                <div className="admin-table-container">
                  {filteredWithdrawals.length === 0 ? (
                    <div className="empty-state">
                      <i className="fas fa-money-bill-wave" />
                      <h3>No Withdrawals Found</h3>
                      <p>No withdrawals match your search criteria</p>
                    </div>
                  ) : (
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Withdrawal ID</th>
                          <th>User</th>
                          <th>Amount</th>
                          <th>Phone</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredWithdrawals.map(withdrawal => (
                          <tr key={withdrawal.id}>
                            <td>
                              <div style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                                {withdrawal.id.substring(0, 12)}...
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: '11px', color: '#666' }}>
                                User ID: {withdrawal.userId?.substring(0, 8)}...
                              </div>
                            </td>
                            <td>
                              <strong>KSh {(withdrawal.amount || 0).toLocaleString()}</strong>
                              {withdrawal.serviceFee && (
                                <div style={{ fontSize: '10px', color: '#666' }}>
                                  Fee: KSh {withdrawal.serviceFee}
                                </div>
                              )}
                            </td>
                            <td>
                              <div>{withdrawal.phone || 'N/A'}</div>
                            </td>
                            <td>
                              <span className={`status-badge status-${withdrawal.status || 'pending'}`}>
                                {withdrawal.status || 'pending'}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontSize: '11px' }}>
                                {formatDate(withdrawal.createdAt)}
                              </div>
                            </td>
                            <td>
                              <button
                                className="action-btn btn-update"
                                onClick={() => handleUpdateWithdrawalStatus(withdrawal.id, withdrawal.status)}
                              >
                                <i className="fas fa-edit" /> Update
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Admin;