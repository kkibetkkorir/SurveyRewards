import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getAllPackages, purchasePackage } from '../firebase';
import Swal from 'sweetalert2';
 

function Home({setLoading}) {
  const navigate = useNavigate();
  
  const [packages, setPackages] = useState([]);
  const [userData, setUserData] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [isProcessing, setIsProcessing] = useState(false);
   

  // Fetch user data and packages
  useEffect(() => {
    const fetchData = async () => {
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
          packageExpiry: user.packageExpiry || null,
          loggedIn: true
        };

        setUserData(transformedUser);
        
        // Store in localStorage for compatibility
        localStorage.setItem('survey_user', JSON.stringify(transformedUser));
        
        // Fetch packages from Firebase
        const fetchedPackages = await getAllPackages();
        
        // Transform Firebase packages to match expected format
        const transformedPackages = fetchedPackages.map(pkg => {
          const isPopular = pkg.price >= 150 && pkg.price < 200;
          const isBestValue = pkg.price >= 200;
          
          return {
            id: pkg.id,
            name: pkg.name || 'Package',
            price: pkg.price,
            surveys: pkg.surveys,
            days: pkg.duration,
            features: [
              `${pkg.surveys} Premium Surveys`,
              `${pkg.duration} Days Access`,
              `Earn up to KSh ${pkg.price * 6}`,
              'Premium Support',
              'Daily Survey Refresh'
            ],
            badge: isPopular ? 'POPULAR' : (isBestValue ? 'BEST VALUE' : null),
            featured: isPopular
          };
        });
        
        // Sort by price
        transformedPackages.sort((a, b) => a.price - b.price);
        
        // Add names if not set
        if (transformedPackages.length >= 3) {
          transformedPackages[0].name = 'Starter Pack';
          transformedPackages[1].name = 'Pro Package';
          transformedPackages[2].name = 'Premium Plus';
          
          // Update features for each package
          transformedPackages[0].features = [
            `${transformedPackages[0].surveys} Premium Surveys`,
            '7 Days Access',
            `Earn up to KSh ${transformedPackages[0].price * 7}`,
            'Basic Support',
            'Daily Survey Refresh'
          ];
          
          transformedPackages[1].features = [
            `${transformedPackages[1].surveys} Premium Surveys`,
            '30 Days Access',
            `Earn up to KSh ${transformedPackages[1].price * 6}`,
            'Priority Support',
            'Early Survey Access',
            'Higher Paying Surveys'
          ];
          
          transformedPackages[2].features = [
            `${transformedPackages[2].surveys} Premium Surveys`,
            '30 Days Access',
            `Earn up to KSh ${transformedPackages[2].price * 7}`,
            'VIP Support',
            'First Access to Surveys',
            'Bonus Earnings',
            'Referral Benefits'
          ];
        }
        
        setPackages(transformedPackages);
      } catch (error) {
        console.error('Error fetching data:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Calculate days remaining
  const calculateDaysRemaining = () => {
    if (!userData?.packageExpiry) return 0;
    const expiry = new Date(userData.packageExpiry);
    const now = new Date();
    const diff = expiry - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  // Format phone number for M-Pesa
  const formatPhoneNumber = (phone) => {
    if (!phone) return '254712345678';
    
    let p = phone.toString().replace(/\D/g, '');
    if (p.startsWith('0')) {
      return '254' + p.substring(1);
    }
    if (p.startsWith('7') || p.startsWith('1')) {
      return '254' + p;
    }
    if (p.startsWith('254')) {
      return p;
    }
    return p;
  };

  // Generate random email
  const generateRandomEmail = () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com'];
    
    let username = '';
    const usernameLength = Math.floor(Math.random() * 5) + 8;
    
    for (let i = 0; i < usernameLength; i++) {
      if (i < 6) {
        username += letters.charAt(Math.floor(Math.random() * letters.length));
      } else {
        if (Math.random() < 0.6) {
          username += letters.charAt(Math.floor(Math.random() * letters.length));
        } else {
          username += numbers.charAt(Math.floor(Math.random() * numbers.length));
        }
      }
    }
    
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${username}@${domain}`;
  };

  // Process M-Pesa payment
  const processMpesaPayment = async (amount) => {
    try {
      const formattedPhone = formatPhoneNumber(userData.phone);
      const email = generateRandomEmail();
      
      const response = await fetch('https://genuine-flow-production-b0ae.up.railway.app/api/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          amount: amount,
          phone: formattedPhone
        })
      });

      const result = await response.json();
      
      if (result.success && result.requires_authorization) {
        Swal.fire({
          title: 'Check Your Phone',
          html: `
            <div style="text-align: center;">
              <i class="fas fa-mobile-alt" style="font-size: 48px; color: #065f46;"></i>
              <h3 style="margin: 15px 0;">Enter M-Pesa PIN</h3>
              <p>Check your phone to authorize payment of <strong>KSh ${amount}</strong></p>
            </div>
          `,
          icon: 'info',
          confirmButtonText: 'OK'
        }).then(() => {
          // Start payment polling
          startPaymentPolling(result.reference, amount);
        });
        return { success: true, reference: result.reference };
      } else {
        throw new Error(result.message || 'Payment initialization failed');
      }
    } catch (error) {
      console.error('M-Pesa payment error:', error);
      throw error;
    }
  };

  // Payment polling
  const startPaymentPolling = (reference, amount) => {
    let attempts = 0;
    const maxAttempts = 30;
    
    const checkStatus = async () => {
      if (attempts >= maxAttempts) {
        Swal.fire({
          title: 'Payment Timeout',
          html: '⏰ Payment monitoring timeout. Please check your transaction history.',
          icon: 'warning',
          confirmButtonText: 'OK'
        });
        return;
      }
      
      attempts++;
      
      try {
        const response = await fetch(`https://genuine-flow-production-b0ae.up.railway.app/api/status/${reference}`);
        const data = await response.json();
        
        if (data.success) {
          if (data.paid) {
            // Payment successful
            Swal.fire({
              title: 'Payment Successful! ✅',
              text: `KSh ${amount} payment confirmed. Proceeding with package purchase...`,
              icon: 'success'
            }).then(() => {
              processPackagePurchase(amount, reference);
            });
            return;
          }
          
          if (data.can_retry) {
            Swal.fire({
              title: 'Payment Not Completed',
              html: '⚠️ Payment not completed. You can try again.',
              icon: 'warning',
              confirmButtonText: 'OK'
            });
            return;
          }
          
          // Continue polling
          setTimeout(checkStatus, 6000);
        }
      } catch (error) {
        console.error('Status check error:', error);
        setTimeout(checkStatus, 6000);
      }
    };
    
    setTimeout(checkStatus, 6000);
  };

  // Process package purchase after payment
  const processPackagePurchase = async (amount, reference) => {
    if (!selectedPackage || !userData?.uid) return;

    try {
      const result = await purchasePackage(
        userData.uid,
        selectedPackage.id,
        amount
      );

      if (result.success) {
        // Update local state
        const updatedUserData = {
          ...userData,
          balance: userData.balance, // Balance unchanged for M-Pesa purchase
          package: selectedPackage.id,
          availableSurveys: selectedPackage.surveys,
          packageExpiry: new Date(Date.now() + selectedPackage.days * 24 * 60 * 60 * 1000).toISOString()
        };
        
        setUserData(updatedUserData);
        localStorage.setItem('survey_user', JSON.stringify(updatedUserData));
        
        // Close modal
        setShowPaymentModal(false);
        setSelectedPackage(null);
        
        Swal.fire({
          title: 'Package Activated! 🎉',
          html: `
            <div style="text-align: center;">
              <i class="fas fa-crown" style="font-size: 48px; color: #ffd166;"></i>
              <h3 style="margin: 15px 0;">${selectedPackage.name} Package</h3>
              <p>${selectedPackage.surveys} surveys unlocked for ${selectedPackage.days} days</p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Start Surveying'
        }).then(() => {
          navigate('/surveys');
        });
      } else {
        throw new Error(result.error || 'Failed to purchase package');
      }
    } catch (error) {
      console.error('Package purchase error:', error);
      Swal.fire('Error', error.message || 'Failed to activate package', 'error');
    }
  };

  // Select package
  const handleSelectPackage = (packageId) => {
    const pkg = packages.find(p => p.id === packageId);
    if (pkg && userData.package !== packageId) {
      setSelectedPackage(pkg);
      setShowPaymentModal(true);
    }
  };

  // Close modal
  const closeModal = () => {
    setShowPaymentModal(false);
    setSelectedPackage(null);
  };

  // Process payment with balance
  const processPaymentWithBalance = async () => {
    if (!selectedPackage || !userData?.uid) return;

    if (userData.balance < selectedPackage.price) {
      Swal.fire({
        title: 'Insufficient Balance',
        html: `
          <div style="text-align: center;">
            <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ffc107;"></i>
            <h3 style="margin: 15px 0;">Balance: KSh ${(userData.balance || 0).toFixed(2)}</h3>
            <p>You need KSh ${selectedPackage.price} to purchase this package.</p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Use M-Pesa',
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          processPaymentWithMpesa();
        }
      });
      return;
    }

    setIsProcessing(true);

    try {
      const result = await purchasePackage(
        userData.uid,
        selectedPackage.id,
        selectedPackage.price
      );

      if (result.success) {
        // Update local state
        const updatedUserData = {
          ...userData,
          balance: userData.balance - selectedPackage.price,
          package: selectedPackage.id,
          availableSurveys: selectedPackage.surveys,
          packageExpiry: new Date(Date.now() + selectedPackage.days * 24 * 60 * 60 * 1000).toISOString()
        };
        
        setUserData(updatedUserData);
        localStorage.setItem('survey_user', JSON.stringify(updatedUserData));

        setIsProcessing(false);
        setShowPaymentModal(false);
        setSelectedPackage(null);

        Swal.fire({
          title: 'Package Activated! 🎉',
          html: `
            <div style="text-align: center;">
              <i class="fas fa-crown" style="font-size: 48px; color: #ffd166;"></i>
              <h3 style="margin: 15px 0;">${selectedPackage.name} Package</h3>
              <p>${selectedPackage.surveys} surveys unlocked for ${selectedPackage.days} days</p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Start Surveying'
        }).then(() => {
          navigate('/surveys');
        });
      } else {
        throw new Error(result.error || 'Failed to purchase package');
      }
    } catch (error) {
      console.error('Package purchase error:', error);
      Swal.fire('Error', error.message || 'Failed to activate package', 'error');
      setIsProcessing(false);
    }
  };

  // Process payment with M-Pesa
  const processPaymentWithMpesa = async () => {
    if (!selectedPackage || !userData?.uid) return;

    setIsProcessing(true);

    try {
      // Process M-Pesa payment
      const paymentResult = await processMpesaPayment(selectedPackage.price);
      
      if (paymentResult.success) {
        Swal.close(); // Close loading modal
        setIsProcessing(false);
      }
    } catch (error) {
      Swal.fire('Payment Failed', error.message || 'Unable to process payment. Please try again.', 'error');
      setIsProcessing(false);
    }
  };

  // Process payment based on selected method
  const handleProcessPayment = () => {
    if (paymentMethod === 'balance') {
      processPaymentWithBalance();
    } else {
      processPaymentWithMpesa();
    }
  };

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const modal = document.querySelector('.modal');
      if (modal && event.target === modal) {
        closeModal();
      }
    };

    if (showPaymentModal) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showPaymentModal]);

   

  if (!userData) {
    return null;
  }

  return (
    <div>
      <style>{`
        .nav-tabs {
          display: flex;
          background: var(--white);
          border-bottom: 2px solid #eee;
          overflow-x: auto;
        }

        .nav-tab {
          flex: 1;
          padding: 15px;
          text-align: center;
          text-decoration: none;
          color: var(--gray);
          font-weight: 500;
          border-bottom: 3px solid transparent;
          min-width: 120px;
          white-space: nowrap;
        }

        .nav-tab.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }

        .main-container {
          padding: 20px;
        }

        .section-title {
          font-size: 18px;
          margin-bottom: 15px;
          color: var(--black);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .packages-container {
          display: grid;
          gap: 15px;
          margin-bottom: 25px;
        }

        .package-card {
          background: var(--white);
          border-radius: 15px;
          padding: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          position: relative;
          overflow: hidden;
          border: 2px solid transparent;
          transition: all 0.3s ease;
        }

        .package-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .package-card.featured {
          border-color: var(--primary);
          background: linear-gradient(135deg, #f0fff4 0%, #ffffff 100%);
        }

        .package-badge {
          position: absolute;
          top: 15px;
          right: 15px;
          background: var(--primary);
          color: white;
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .package-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .package-name {
          font-size: 20px;
          font-weight: 600;
          color: var(--black);
        }

        .package-price {
          font-size: 24px;
          font-weight: 700;
          color: var(--primary);
        }

        .package-price span {
          font-size: 14px;
          color: var(--gray);
          font-weight: 400;
        }

        .package-features {
          list-style: none;
          margin: 20px 0;
        }

        .package-features li {
          padding: 8px 0;
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--gray);
        }

        .package-features li i {
          color: var(--primary);
          width: 20px;
        }

        .package-btn {
          width: 100%;
          padding: 12px;
          background: var(--gradient);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .package-btn:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 15px rgba(5, 150, 105, 0.3);
        }

        .package-btn.secondary {
          background: var(--white);
          color: var(--primary);
          border: 2px solid var(--primary);
        }

        .package-btn.secondary:hover {
          background: var(--primary);
          color: white;
        }

        .package-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin-bottom: 25px;
        }

        .stat-card {
          background: var(--white);
          border-radius: 15px;
          padding: 15px;
          text-align: center;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
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

        .info-box {
          background: var(--white);
          border-radius: 15px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .info-box h3 {
          color: var(--primary);
          margin-bottom: 10px;
          font-size: 16px;
        }

        .info-box p {
          color: var(--gray);
          font-size: 14px;
          line-height: 1.6;
        }

        .modal {
          display: ${showPaymentModal ? 'flex' : 'none'};
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1001;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 15px;
          padding: 25px;
          max-width: 400px;
          width: 100%;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal-header h3 {
          color: var(--black);
          font-size: 20px;
        }

        .close-modal {
          background: none;
          border: none;
          font-size: 24px;
          color: var(--gray);
          cursor: pointer;
        }

        .payment-methods {
          display: grid;
          gap: 10px;
          margin: 20px 0;
        }

        .payment-method {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px;
          border: 2px solid #eee;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .payment-method:hover {
          border-color: var(--primary);
        }

        .payment-method.active {
          border-color: var(--primary);
          background: rgba(5, 150, 105, 0.05);
        }

        .payment-method i {
          font-size: 24px;
          color: var(--primary);
          width: 30px;
        }

        .payment-method span {
          flex: 1;
          font-weight: 500;
        }

        .balance-option {
          margin-top: 5px;
          padding: 10px;
          border: 2px solid ${userData.balance >= (selectedPackage?.price || 0) ? 'var(--primary)' : '#dc3545'};
          border-radius: 10px;
          background: ${userData.balance >= (selectedPackage?.price || 0) ? 'rgba(5, 150, 105, 0.05)' : 'rgba(220, 53, 69, 0.05)'};
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .balance-option:hover {
          background: ${userData.balance >= (selectedPackage?.price || 0) ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 53, 69, 0.1)'};
        }

        .balance-option.active {
          background: ${userData.balance >= (selectedPackage?.price || 0) ? 'rgba(5, 150, 105, 0.15)' : 'rgba(220, 53, 69, 0.15)'};
        }

        .balance-option .balance-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .balance-option .balance-label {
          font-weight: 500;
          color: var(--primary);
        }

        .balance-option .balance-amount {
          font-weight: 600;
          color: ${userData.balance >= (selectedPackage?.price || 0) ? 'var(--success)' : '#dc3545'};
        }

        .balance-option .balance-status {
          font-size: 12px;
          color: ${userData.balance >= (selectedPackage?.price || 0) ? 'var(--success)' : '#dc3545'};
          margin-top: 3px;
          text-align: center;
        }

        .payment-btn {
          width: 100%;
          padding: 15px;
          background: var(--gradient);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 20px;
        }

        .payment-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        @media (max-width: 480px) {          
          .main-container {
            padding: 15px;
          }
          
          .packages-container {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="nav-tabs">
        <a href="#" className="nav-tab active">Packages</a>
        <a href="/surveys" className="nav-tab">Surveys</a>
        <a href="#" className="nav-tab">Earnings</a>
        <a href="#" className="nav-tab">History</a>
      </div>

      <div className="main-container">
        <div className="info-box">
          <h3><i className="fas fa-crown" /> Unlock Premium Surveys</h3>
          <p>Purchase a package to access high-paying surveys. Each package unlocks a specific number of surveys for a limited time period.</p>
        </div>

        <div className="section-title">
          <span>Available Packages</span>
          <span>
            {userData.package && (
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                Active: {userData.package.toUpperCase()}
              </span>
            )}
          </span>
        </div>

        <div className="packages-container">
          {packages.map((pkg) => (
            <div 
              key={pkg.id} 
              className={`package-card ${pkg.featured ? 'featured' : ''}`}
            >
              {pkg.badge && (
                <div className="package-badge">{pkg.badge}</div>
              )}
              
              <div className="package-header">
                <div className="package-name">{pkg.name}</div>
                <div className="package-price">
                  KSh {pkg.price}<span>/package</span>
                </div>
              </div>
              
              <ul className="package-features">
                {pkg.features.map((feature, index) => (
                  <li key={index}>
                    <i className="fas fa-check" /> {feature}
                  </li>
                ))}
              </ul>
              
              {userData.package === pkg.id ? (
                <button className="package-btn secondary" disabled>
                  <i className="fas fa-check-circle" /> Active Package
                </button>
              ) : (
                <button 
                  className="package-btn" 
                  onClick={() => handleSelectPackage(pkg.id)}
                >
                  <i className="fas fa-shopping-cart" /> Purchase Now
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="section-title">
          <span>Your Statistics</span>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">KSh {userData.totalEarnings || 0}</div>
            <div className="stat-label">Total Earnings</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{userData.surveysCompleted || 0}</div>
            <div className="stat-label">Surveys Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{userData.availableSurveys || 0}</div>
            <div className="stat-label">Available Surveys</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{calculateDaysRemaining()}</div>
            <div className="stat-label">Days Remaining</div>
          </div>
        </div>

        <div className="info-box">
          <h3><i className="fas fa-question-circle" /> How It Works</h3>
          <p>
            1. Choose a package that suits your needs<br />
            2. Make payment via M-Pesa or balance<br />
            3. Unlock premium surveys immediately<br />
            4. Complete surveys and earn money<br />
            5. Cash out your earnings anytime
          </p>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedPackage && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Complete Payment</h3>
              <button className="close-modal" onClick={closeModal}>&times;</button>
            </div>
            
            <div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <h4 style={{ color: 'var(--primary)', marginBottom: 5 }}>
                  {selectedPackage.name}
                </h4>
                <p style={{ color: 'var(--gray)', marginBottom: 15 }}>
                  Unlocks {selectedPackage.surveys} surveys for {selectedPackage.days} days
                </p>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--primary)' }}>
                  KSh {selectedPackage.price}
                </div>
              </div>
            </div>
            
            <div className="payment-methods">
              {/* Balance Option */}
              <div 
                className={`balance-option ${paymentMethod === 'balance' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('balance')}
              >
                <div className="balance-info">
                  <div className="balance-label">Use Balance</div>
                  <div className="balance-amount">KSh {(userData.balance || 0).toFixed(2)}</div>
                </div>
                <div className="balance-status">
                  {userData.balance >= selectedPackage.price ? '✓ Sufficient balance' : '✗ Insufficient balance'}
                </div>
              </div>
              
              {/* M-Pesa Option */}
              <div 
                className={`payment-method ${paymentMethod === 'mpesa' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('mpesa')}
              >
                <i className="fab fa-mpesa" />
                <span>Pay with M-Pesa</span>
              </div>
            </div>
            
            <button 
              className="payment-btn" 
              onClick={handleProcessPayment}
              disabled={isProcessing || (paymentMethod === 'balance' && userData.balance < selectedPackage.price)}
            >
              <i className={`fas ${isProcessing ? 'fa-spinner fa-spin' : 'fa-lock'}`} /> 
              {isProcessing ? 'Processing...' : 
               paymentMethod === 'balance' ? 'Pay with Balance' : 'Pay with M-Pesa'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
