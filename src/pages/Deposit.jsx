import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, createDeposit } from '../firebase';
import Swal from 'sweetalert2';
 

function Deposit({setLoading}) {
  const navigate = useNavigate();
  
  // State management
  const [userData, setUserData] = useState(null);
  const [depositAmount, setDepositAmount] = useState(100);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('mpesa');
  const [showPackageUpsell, setShowPackageUpsell] = useState(false);
   

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
          balance: user.balance || 0,
          loggedIn: true,
          package: user.currentPackage || null
        };

        setUserData(transformedUser);
        setShowPackageUpsell(!user.currentPackage);
        
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
  }, [navigate]);

  // Initialize with default amount
  useEffect(() => {
    setAmountButtonActive(100);
  }, []);

  // Format phone number helper
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

  // Generate random email helper
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

  // Set amount and update button state
  const setAmount = (amount) => {
    setDepositAmount(amount);
  };

  // Update active button state
  const setAmountButtonActive = (amount) => {
    return amount === depositAmount ? 'active' : '';
  };

  // Select payment method
  const handleSelectPaymentMethod = (method) => {
    setSelectedPaymentMethod(method);
  };

  // Payment polling (for M-Pesa)
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
            // Payment successful - create deposit in Firebase
            await handleSuccessfulDeposit(amount, reference);
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

  // Handle successful deposit
  const handleSuccessfulDeposit = async (amount, reference) => {
    if (!userData?.uid) {
      Swal.fire('Error', 'User not found. Please login again.', 'error');
      return;
    }

    try {
      // Create deposit in Firebase
      const result = await createDeposit(
        userData.uid,
        amount,
        selectedPaymentMethod,
        {
          reference: reference,
          platform: 'surveyrewards'
        }
      );

      if (result.success) {
        // Update local user data
        const updatedUserData = {
          ...userData,
          balance: result.newBalance
        };
        
        setUserData(updatedUserData);
        localStorage.setItem('survey_user', JSON.stringify(updatedUserData));

        Swal.fire({
          title: 'Deposit Successful! 🎉',
          html: `
            <div style="text-align: center;">
              <i class="fas fa-check-circle" style="font-size: 48px; color: #10b981;"></i>
              <h3 style="margin: 15px 0;">KSh ${amount.toLocaleString()} Added</h3>
              <p>Funds have been added to your account</p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Continue'
        }).then(() => {
          // Redirect based on package status
          if (!userData.package && amount >= 300) {
            Swal.fire({
              title: 'Purchase a Package?',
              html: `Would you like to purchase a survey package with your deposit?`,
              icon: 'question',
              showCancelButton: true,
              confirmButtonText: 'Yes, View Packages',
              cancelButtonText: 'Not Now'
            }).then((result) => {
              if (result.isConfirmed) {
                navigate('/packages');
              } else {
                navigate('/profile');
              }
            });
          } else {
            navigate('/profile');
          }
        });
      } else {
        throw new Error(result.error || 'Deposit failed');
      }
    } catch (error) {
      console.error('Deposit error:', error);
      Swal.fire('Error', error.message || 'Failed to process deposit', 'error');
    }
  };

  // Simulate PayPal payment
  const simulatePayPalPayment = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          reference: 'PAYPAL_' + Date.now(),
          status: 'success'
        });
      }, 2000);
    });
  };

  // Simulate card payment
  const simulateCardPayment = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          reference: 'CARD_' + Date.now(),
          status: 'success'
        });
      }, 2000);
    });
  };

  // Process deposit
  const processDeposit = async () => {
    if (!userData?.uid) {
      Swal.fire('Error', 'User not found. Please login again.', 'error');
      return;
    }

    // CHANGED: Minimum deposit is now KSh 100 (was 10)
    if (depositAmount < 100) {
      Swal.fire({
        title: 'Invalid Amount',
        text: 'Minimum deposit is KSh 100',
        icon: 'warning'
      });
      return;
    }

    if (depositAmount > 150000) {
      Swal.fire({
        title: 'Amount Too High',
        text: 'Maximum deposit is KSh 150,000',
        icon: 'warning'
      });
      return;
    }

    // Show confirmation based on payment method
    let confirmationHtml = '';
    if (selectedPaymentMethod === 'mpesa') {
      confirmationHtml = `
        <div style="text-align: center;">
          <i class="fab fa-mpesa" style="font-size: 40px; color: #065f46; margin-bottom: 15px;"></i>
          <p>Deposit Amount: <strong>KSh ${depositAmount.toLocaleString()}</strong></p>
          <p>Phone: <strong>${userData.phone || 'N/A'}</strong></p>
          <p><small>You'll receive an M-Pesa prompt on your phone</small></p>
        </div>
      `;
    } else if (selectedPaymentMethod === 'card') {
      confirmationHtml = `
        <div style="text-align: center;">
          <i class="far fa-credit-card" style="font-size: 40px; color: #065f46; margin-bottom: 15px;"></i>
          <p>Deposit Amount: <strong>KSh ${depositAmount.toLocaleString()}</strong></p>
          <p>Payment Method: <strong>Credit/Debit Card</strong></p>
          <p><small>You'll be redirected to a secure payment page</small></p>
        </div>
      `;
    } else {
      confirmationHtml = `
        <div style="text-align: center;">
          <i class="fab fa-paypal" style="font-size: 40px; color: #003087; margin-bottom: 15px;"></i>
          <p>Deposit Amount: <strong>KSh ${depositAmount.toLocaleString()}</strong></p>
          <p>Payment Method: <strong>PayPal</strong></p>
          <p><small>You'll be redirected to PayPal to complete payment</small></p>
        </div>
      `;
    }

    const { value: confirmed } = await Swal.fire({
      title: 'Confirm Deposit',
      html: confirmationHtml,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Proceed',
      cancelButtonText: 'Cancel'
    });

    if (!confirmed) return;

    // Show processing
    Swal.fire({
      title: 'Processing...',
      text: `Initiating ${selectedPaymentMethod === 'mpesa' ? 'M-Pesa' : selectedPaymentMethod === 'card' ? 'card' : 'PayPal'} payment`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      let paymentResult;
      
      if (selectedPaymentMethod === 'mpesa') {
        // M-Pesa payment
        const formattedPhone = formatPhoneNumber(userData.phone);
        const email = generateRandomEmail();
        
        const response = await fetch('https://genuine-flow-production-b0ae.up.railway.app/api/initialize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: email,
            amount: depositAmount,
            phone: formattedPhone
          })
        });

        paymentResult = await response.json();
        
      } else if (selectedPaymentMethod === 'card') {
        // Simulate card payment
        paymentResult = await simulateCardPayment();
        
      } else {
        // Simulate PayPal payment
        paymentResult = await simulatePayPalPayment();
      }

      if (paymentResult.success) {
        if (selectedPaymentMethod === 'mpesa' && paymentResult.requires_authorization) {
          // M-Pesa STK Push
          Swal.fire({
            title: 'Check Your Phone',
            html: `
              <div style="text-align: center;">
                <i class="fas fa-mobile-alt" style="font-size: 48px; color: #065f46;"></i>
                <h3 style="margin: 15px 0;">Enter M-Pesa PIN</h3>
                <p>Check your phone to authorize payment of <strong>KSh ${depositAmount}</strong></p>
              </div>
            `,
            icon: 'info',
            confirmButtonText: 'OK'
          }).then(() => {
            startPaymentPolling(paymentResult.reference, depositAmount);
          });
        } else {
          // Immediate success for other methods
          await handleSuccessfulDeposit(depositAmount, paymentResult.reference);
        }
      } else {
        throw new Error(paymentResult.message || 'Payment initialization failed');
      }
    } catch (error) {
      Swal.fire({
        title: 'Payment Failed',
        text: error.message || 'Unable to process payment. Please try again.',
        icon: 'error',
        confirmButtonText: 'Try Again'
      });
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
          padding: 20px;
          text-align: center;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .balance-label {
          color: var(--gray);
          font-size: 14px;
          margin-bottom: 5px;
        }

        .balance-amount {
          font-size: 32px;
          font-weight: bold;
          color: var(--primary);
        }

        .deposit-card {
          background: var(--white);
          border-radius: 15px;
          margin: 20px;
          padding: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .deposit-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
          text-align: center;
          color: var(--black);
        }

        .amount-input {
          margin-bottom: 25px;
        }

        .amount-input label {
          display: block;
          margin-bottom: 10px;
          font-weight: 500;
          color: var(--black);
        }

        .amount-field {
          width: 100%;
          padding: 15px;
          border: 2px solid #ddd;
          border-radius: 10px;
          font-size: 18px;
          text-align: center;
          font-weight: bold;
        }

        .amount-field:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
        }

        .quick-amounts {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 15px;
        }

        .amount-btn {
          padding: 12px;
          background: var(--white);
          border: 2px solid #ddd;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .amount-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .amount-btn.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .deposit-btn {
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
          margin-top: 20px;
        }

        .deposit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(5, 150, 105, 0.3);
        }

        .deposit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        .payment-info {
          background: #e8f5e9;
          border-radius: 10px;
          padding: 15px;
          margin-top: 20px;
          border-left: 4px solid var(--primary);
        }

        .payment-info h4 {
          color: var(--primary);
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .payment-info ul {
          padding-left: 20px;
        }

        .payment-info li {
          margin-bottom: 8px;
          font-size: 14px;
          line-height: 1.5;
        }

        .payment-methods {
          display: flex;
          gap: 10px;
          margin: 20px 0;
        }

        .method-btn {
          flex: 1;
          padding: 12px;
          border: 2px solid #ddd;
          border-radius: 10px;
          background: white;
          cursor: pointer;
          transition: all 0.3s;
          text-align: center;
        }

        .method-btn.active {
          border-color: var(--primary);
          background: rgba(5, 150, 105, 0.1);
        }

        .method-btn i {
          font-size: 24px;
          margin-bottom: 5px;
          display: block;
          color: var(--primary);
        }

        .method-btn span {
          font-size: 12px;
          font-weight: 500;
        }

        .package-upsell {
          background: linear-gradient(135deg, #ffd166 0%, #ffb347 100%);
          border-radius: 10px;
          padding: 15px;
          margin: 20px;
          text-align: center;
          color: #333;
        }

        .package-upsell h4 {
          margin-bottom: 8px;
          color: #333;
        }

        .package-upsell p {
          font-size: 14px;
          margin-bottom: 10px;
        }

        .upsell-btn {
          background: var(--gradient);
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 20px;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          font-size: 14px;
        }

        .note-box {
          background: #f8f9fa;
          border-radius: 10px;
          padding: 15px;
          margin-top: 20px;
          border: 1px solid #e2e8f0;
        }

        .note-box h5 {
          color: var(--primary);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .note-box p {
          font-size: 13px;
          color: var(--gray);
          line-height: 1.5;
        }

        @media (max-width: 480px) {
          .balance-card, .deposit-card {
            margin: 15px;
            padding: 15px;
          }
          
          .quick-amounts {
            grid-template-columns: repeat(3, 1fr);
          }
          
          .payment-methods {
            flex-direction: column;
          }
        }
      `}</style>

      {/*<div className="balance-card">
        <div className="balance-label">Current Balance</div>
        <div className="balance-amount">
          KSh {(userData.balance || 0).toFixed(2)}
        </div>
      </div>*/}

      {/* Package Upsell for New Users */}
      {showPackageUpsell && (
        <div className="package-upsell">
          <h4><i className="fas fa-crown" /> Unlock More Surveys!</h4>
          <p>Deposit KSh 300 or more to purchase a premium package and access high-paying surveys</p>
          <button 
            className="upsell-btn" 
            onClick={() => navigate('/packages')}
          >
            View Packages <i className="fas fa-arrow-right" />
          </button>
        </div>
      )}

      <div className="deposit-card">
        <div className="deposit-title">Add Funds to Account</div>
        
        {/* Payment Methods */}
        {/*<div className="payment-methods">
          <button 
            className={`method-btn ${selectedPaymentMethod === 'mpesa' ? 'active' : ''}`}
            onClick={() => handleSelectPaymentMethod('mpesa')}
          >
            <i className="fab fa-mpesa" />
            <span>M-Pesa</span>
          </button>
          <button 
            className={`method-btn ${selectedPaymentMethod === 'card' ? 'active' : ''}`}
            onClick={() => handleSelectPaymentMethod('card')}
          >
            <i className="far fa-credit-card" />
            <span>Card</span>
          </button>
          <button 
            className={`method-btn ${selectedPaymentMethod === 'paypal' ? 'active' : ''}`}
            onClick={() => handleSelectPaymentMethod('paypal')}
          >
            <i className="fab fa-paypal" />
            <span>PayPal</span>
          </button>
        </div>*/}

        <div className="amount-input">
          <label>Enter Amount (KSh)</label>
          {/* CHANGED: min attribute changed from 10 to 100 */}
          <input 
            type="number" 
            className="amount-field" 
            placeholder="0.00" 
            min="100" 
            value={depositAmount}
            onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 100)}
          />
          
          <div className="quick-amounts">
            {[100, 300, 500, 1000, 2000, 5000].map((amount) => (
              <button 
                key={amount}
                className={`amount-btn ${depositAmount === amount ? 'active' : ''}`}
                onClick={() => setAmount(amount)}
              >
                {amount.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <button className="deposit-btn" onClick={processDeposit}>
        <i className={
          selectedPaymentMethod === 'mpesa' ? 'fas fa-mobile-alt' :
          selectedPaymentMethod === 'card' ? 'far fa-credit-card' :
          'fab fa-paypal'
        } />
        {selectedPaymentMethod === 'mpesa' ? 'Deposit via M-Pesa' :
         selectedPaymentMethod === 'card' ? 'Pay with Card' :
         'Pay with PayPal'}
      </button>

        {/* M-Pesa Info */}
        {selectedPaymentMethod === 'mpesa' && (
          <div className="payment-info">
            <h4><i className="fas fa-mobile-alt" /> M-Pesa Deposit</h4>
            <ul>
              <li>Enter the amount you wish to deposit (minimum KSh 100)</li>
              <li>Click "Deposit via M-Pesa"</li>
              <li>Enter your M-Pesa PIN when prompted on your phone</li>
              <li>Funds will be added instantly to your account</li>
            </ul>
          </div>
        )}

        {/* Card Info */}
        {selectedPaymentMethod === 'card' && (
          <div className="payment-info">
            <h4><i className="far fa-credit-card" /> Card Payment</h4>
            <ul>
              <li>Enter the amount you wish to deposit (minimum KSh 100)</li>
              <li>Enter your card details securely</li>
              <li>Your payment is processed through secure encryption</li>
              <li>Funds will be available immediately after payment</li>
            </ul>
          </div>
        )}

        {/* PayPal Info */}
        {selectedPaymentMethod === 'paypal' && (
          <div className="payment-info">
            <h4><i className="fab fa-paypal" /> PayPal Deposit</h4>
            <ul>
              <li>Enter the amount you wish to deposit (minimum KSh 100)</li>
              <li>You'll be redirected to PayPal for secure payment</li>
              <li>Log in to your PayPal account to complete payment</li>
              <li>Funds will be added once payment is confirmed</li>
            </ul>
          </div>
        )}

        <div className="note-box">
          <h5><i className="fas fa-lightbulb" /> Tip:</h5>
          <p>Minimum deposit is KSh 100. Deposited funds can be used to purchase premium survey packages or withdrawn as earnings after completing surveys.</p>
        </div>
      </div>
    </div>
  );
}

export default Deposit;