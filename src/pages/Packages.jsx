import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getAllPackages, purchasePackage } from '../firebase';
import Swal from 'sweetalert2';
 

function Packages({setLoading}) {
  const navigate = useNavigate();
  
  const [packages, setPackages] = useState([]);
  const [userData, setUserData] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
   

  // Check if user is logged in and fetch data
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
          const isPopular = pkg.price >= 300 && pkg.price < 500;
          const isBestValue = pkg.price >= 500;
          
          return {
            id: pkg.id,
            name: pkg.name,
            price: pkg.price,
            surveys: pkg.surveys,
            days: pkg.duration,
            features: [
              `${pkg.surveys} Surveys`,
              `${pkg.duration} Days`,
              'Premium Support',
              'High-paying Surveys'
            ],
            badge: isPopular ? 'POPULAR' : (isBestValue ? 'BEST VALUE' : null),
            featured: isPopular
          };
        });
        
        // Sort by price
        transformedPackages.sort((a, b) => a.price - b.price);
        
        // Add names if not set
        if (transformedPackages.length >= 3) {
          transformedPackages[0].name = 'Basic';
          transformedPackages[1].name = 'Pro';
          transformedPackages[2].name = 'Premium';
        }
        
        setPackages(transformedPackages);
      } catch (error) {
        console.error('Error fetching packages:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Load current package info
  const loadCurrentPackage = () => {
    if (!userData?.package) return null;
    
    const pkg = packages.find(p => p.id === userData.package);
    if (!pkg) return null;
    
    let daysRemaining = 0;
    if (userData.packageExpiry) {
      const expiry = new Date(userData.packageExpiry);
      const now = new Date();
      daysRemaining = Math.max(0, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)));
    }
    
    return (
      <div className="current-package">
        <div className="package-title">
          <i className="fas fa-crown" style={{ color: '#ffd166', marginRight: 8 }} />
          Active Package
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)', marginBottom: 5 }}>
            {pkg.name} Package
          </div>
          <div style={{ fontSize: 14, color: 'var(--gray)', marginBottom: 10 }}>
            {userData.availableSurveys || 0} surveys remaining • {daysRemaining} days left
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 15 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--primary)' }}>
                {userData.surveysCompleted || 0}
              </div>
              <div style={{ fontSize: 11, color: 'var(--gray)' }}>Completed</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--primary)' }}>
                KSh {userData.totalEarnings || 0}
              </div>
              <div style={{ fontSize: 11, color: 'var(--gray)' }}>Earned</div>
            </div>
          </div>
        </div>
      </div>
    );
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
        setShowPurchaseModal(false);
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
  const handleSelectPackage = (pkg) => {
    if (userData.package === pkg.id) return;
    setSelectedPackage(pkg);
    setShowPurchaseModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowPurchaseModal(false);
    setSelectedPackage(null);
  };

  // Process purchase with M-Pesa
  const processPurchaseWithMpesa = async () => {
    if (!selectedPackage || !userData?.uid) return;

    try {
      // Show processing
      Swal.fire({
        title: 'Processing...',
        text: `Initiating M-Pesa payment of KSh ${selectedPackage.price}`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      // Process M-Pesa payment
      const paymentResult = await processMpesaPayment(selectedPackage.price);
      
      if (paymentResult.success) {
        Swal.close(); // Close loading modal
      }
    } catch (error) {
      Swal.fire('Payment Failed', error.message || 'Unable to process payment. Please try again.', 'error');
    }
  };

  // Process purchase with balance
  const processPurchaseWithBalance = async () => {
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
          processPurchaseWithMpesa();
        }
      });
      return;
    }

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
        
        // Close modal
        closeModal();
        
        Swal.fire({
          title: 'Package Activated! 🎉',
          html: `
            <div style="text-align: center;">
              <i class="fas fa-crown" style="font-size: 48px; color: #ffd166;"></i>
              <h3 style="margin: 15px 0;">${selectedPackage.name} Package</h3>
              <p>${selectedPackage.surveys} surveys unlocked for ${selectedPackage.days} days</p>
              <p>Your balance: KSh ${updatedUserData.balance.toFixed(2)}</p>
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

   

  if (!userData) {
    return null;
  }

  return (
    <div>
      <style>{`
        .balance-card {
          background: var(--white);
          border-radius: 15px;
          margin: 20px;
          padding: 18px;
          text-align: center;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .balance-label {
          color: var(--gray);
          font-size: 14px;
          margin-bottom: 5px;
        }

        .balance-amount {
          font-size: 28px;
          font-weight: bold;
          color: var(--primary);
        }

        .current-package {
          background: var(--white);
          border-radius: 15px;
          margin: 0 20px 20px;
          padding: 18px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          border-left: 4px solid var(--primary);
        }

        .package-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 15px;
          text-align: center;
          color: var(--black);
        }

        .package-list {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin: 20px;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        .package-card {
          background: var(--white);
          border-radius: 12px;
          padding: 18px 12px;
          box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: center;
          position: relative;
        }

        .package-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
        }

        .package-card.selected {
          border-color: var(--primary);
          background: linear-gradient(135deg, #f0fff4 0%, #ffffff 100%);
        }

        .package-card.featured {
          border-color: #ffd166;
        }

        .package-badge {
          position: absolute;
          top: -8px;
          right: 10px;
          background: var(--primary);
          color: white;
          padding: 4px 10px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .package-badge.featured {
          background: #ffd166;
          color: #333;
        }

        .package-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--black);
          margin-bottom: 8px;
          line-height: 1.3;
        }

        .package-price {
          font-size: 22px;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 10px;
        }

        .package-price span {
          font-size: 12px;
          color: var(--gray);
          font-weight: 400;
        }

        .package-details {
          list-style: none;
          margin: 12px 0;
          padding: 0;
        }

        .package-details li {
          padding: 4px 0;
          font-size: 11px;
          color: var(--gray);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .package-details li i {
          color: var(--primary);
          font-size: 10px;
        }

        .package-action {
          width: 100%;
          padding: 10px;
          background: var(--gradient);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .package-action:hover:not(.active) {
          transform: scale(1.03);
          box-shadow: 0 4px 15px rgba(5, 150, 105, 0.3);
        }

        .package-action.active {
          background: #6c757d;
          cursor: not-allowed;
        }

        .package-action.active:hover {
          transform: none;
          box-shadow: none;
        }

        .compare-section {
          background: var(--white);
          border-radius: 15px;
          margin: 20px;
          padding: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .compare-table {
          width: 100%;
          border-collapse: collapse;
        }

        .compare-table th {
          text-align: left;
          padding: 12px 8px;
          font-size: 12px;
          color: var(--gray);
          font-weight: 500;
          border-bottom: 1px solid #eee;
        }

        .compare-table td {
          padding: 12px 8px;
          font-size: 13px;
          border-bottom: 1px solid #f5f5f5;
        }

        .compare-table tr:last-child td {
          border-bottom: none;
        }

        .feature-indicator {
          color: var(--primary);
          font-weight: 600;
          font-size: 12px;
        }

        .info-note {
          background: #e8f5e9;
          border-radius: 10px;
          padding: 15px;
          margin: 20px;
          border-left: 4px solid var(--primary);
          font-size: 13px;
          color: #333;
        }

        .info-note h4 {
          color: var(--primary);
          margin-bottom: 8px;
          font-size: 14px;
        }

        .info-note ul {
          padding-left: 20px;
        }

        .info-note li {
          margin-bottom: 6px;
          line-height: 1.5;
        }

        .modal-overlay {
          display: ${showPurchaseModal ? 'flex' : 'none'};
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 2000;
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

        .payment-summary {
          text-align: center;
          margin-bottom: 25px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 10px;
        }

        .payment-summary h4 {
          color: var(--primary);
          margin-bottom: 10px;
        }

        .payment-amount {
          font-size: 32px;
          font-weight: 700;
          color: var(--primary);
          margin: 10px 0;
        }

        .payment-details {
          font-size: 13px;
          color: var(--gray);
          line-height: 1.5;
        }

        .confirm-btn {
          width: 100%;
          padding: 16px;
          background: var(--gradient);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .confirm-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(5, 150, 105, 0.3);
        }

        @media (max-width: 768px) {
          .package-list {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
        }

        @media (max-width: 480px) {
          .balance-card,
          .current-package,
          .compare-section,
          .info-note {
            margin: 15px;
            padding: 15px;
          }
          
          .package-list {
            grid-template-columns: 1fr;
            max-width: 300px;
          }
          
          .package-card {
            padding: 15px;
          }
        }
      `}</style>

      <div className="balance-card">
        <div className="balance-label">Available Balance</div>
        <div className="balance-amount">
          KSh {(userData.balance || 0).toFixed(2)}
        </div>
      </div>

      {loadCurrentPackage()}

      <div className="package-title" style={{ textAlign: 'center', margin: '20px 20px 0' }}>
        Choose Your Package
      </div>

      <div className="package-list">
        {packages.map((pkg) => (
          <div 
            key={pkg.id}
            className={`package-card ${pkg.featured ? 'featured' : ''} ${userData.package === pkg.id ? 'selected' : ''}`}
            onClick={() => handleSelectPackage(pkg)}
          >
            {pkg.badge && (
              <div className={`package-badge ${pkg.featured ? 'featured' : ''}`}>
                {pkg.badge}
              </div>
            )}
            <div className="package-name">{pkg.name}</div>
            <div className="package-price">KSh {pkg.price}</div>
            <ul className="package-details">
              {pkg.features.map((feature, index) => (
                <li key={index}><i className="fas fa-check" /> {feature}</li>
              ))}
            </ul>
            <button 
              className={`package-action ${userData.package === pkg.id ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectPackage(pkg);
              }}
            >
              <i className={`fas ${userData.package === pkg.id ? 'fa-check-circle' : 'fa-shopping-cart'}`} />
              {userData.package === pkg.id ? 'Current Package' : 'Select Package'}
            </button>
          </div>
        ))}
      </div>

      <div className="compare-section">
        <h3 style={{ fontSize: 16, marginBottom: 15, color: 'var(--black)' }}>Package Comparison</h3>
        <table className="compare-table">
          <thead>
            <tr>
              <th>Features</th>
              {packages.map(pkg => (
                <th key={pkg.id}>{pkg.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Surveys</td>
              {packages.map(pkg => (
                <td key={pkg.id}>{pkg.surveys}</td>
              ))}
            </tr>
            <tr>
              <td>Duration</td>
              {packages.map(pkg => (
                <td key={pkg.id}>{pkg.days} days</td>
              ))}
            </tr>
            <tr>
              <td>Earnings Potential</td>
              {packages.map(pkg => (
                <td key={pkg.id}>KSh {pkg.price * 4}</td>
              ))}
            </tr>
            <tr>
              <td>Support</td>
              {packages.map(pkg => (
                <td key={pkg.id}>Premium</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="info-note">
        <h4><i className="fas fa-info-circle" /> Package Benefits</h4>
        <ul>
          <li>Unlock premium, high-paying surveys</li>
          <li>Complete surveys at your own pace</li>
          <li>Earnings are paid directly to your account</li>
          <li>Unused surveys expire after package duration</li>
        </ul>
      </div>

      {/* Purchase Confirmation Modal */}
      {showPurchaseModal && selectedPackage && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Confirm Purchase</h3>
              <button className="close-modal" onClick={closeModal}>&times;</button>
            </div>
            
            <div>
              <div className="payment-summary">
                <h4>{selectedPackage.name} Package</h4>
                <div className="payment-amount">KSh {selectedPackage.price}</div>
                <div className="payment-details">
                  <div>{selectedPackage.surveys} Premium Surveys</div>
                  <div>{selectedPackage.days} Days Access</div>
                  <div>Estimated Earnings: KSh {selectedPackage.price * 4}</div>
                </div>
              </div>
              
              {/* Payment Options */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 16, marginBottom: 10, color: 'var(--black)' }}>
                  Choose Payment Method:
                </h4>
                
                {/* Balance Option */}
                <div 
                  style={{
                    padding: 15,
                    border: '2px solid var(--primary)',
                    borderRadius: 10,
                    marginBottom: 10,
                    background: '#f8f9fa',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onClick={processPurchaseWithBalance}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#e8f5e9'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f8f9fa'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--primary)' }}>Use Balance</div>
                      <div style={{ fontSize: 12, color: 'var(--gray)' }}>
                        Available: KSh {(userData.balance || 0).toFixed(2)}
                      </div>
                    </div>
                    <div style={{
                      color: userData.balance >= selectedPackage.price ? 'var(--success)' : '#dc3545',
                      fontWeight: 600
                    }}>
                      {userData.balance >= selectedPackage.price ? '✓ Sufficient' : 'Insufficient'}
                    </div>
                  </div>
                </div>
                
                {/* M-Pesa Option */}
                <div 
                  style={{
                    padding: 15,
                    border: '2px solid #065f46',
                    borderRadius: 10,
                    background: '#f8f9fa',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onClick={processPurchaseWithMpesa}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#e8f5e9'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f8f9fa'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <i className="fab fa-mpesa" style={{ fontSize: 24, color: '#065f46' }} />
                      <div>
                        <div style={{ fontWeight: 600, color: '#065f46' }}>Pay with M-Pesa</div>
                        <div style={{ fontSize: 12, color: 'var(--gray)' }}>
                          Instant payment to phone: {userData.phone}
                        </div>
                      </div>
                    </div>
                    <i className="fas fa-arrow-right" style={{ color: '#065f46' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Packages;