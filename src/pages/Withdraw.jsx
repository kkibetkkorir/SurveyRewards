import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, createWithdrawal } from '../firebase';
import Swal from 'sweetalert2';
 

function Withdraw({setLoading}) {
  const navigate = useNavigate();
  
  const [userData, setUserData] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState(100);
  const [currentBalance, setCurrentBalance] = useState(0);
  const serviceFeeRate = 0.01; // 1%
   

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
          loggedIn: true
        };

        setUserData(transformedUser);
        setCurrentBalance(user.balance || 0);
        
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

  // Set amount and update button state
  const setAmount = (amount) => {
    setWithdrawAmount(amount);
  };

  // Get button active class
  const getButtonActiveClass = (amount) => {
    return withdrawAmount === amount ? 'active' : '';
  };

  // Process withdrawal
  const processWithdrawal = async () => {
    if (!userData?.uid || !userData?.phone) {
      Swal.fire('Error', 'User information not found. Please login again.', 'error');
      return;
    }

    if (withdrawAmount < 100) {
      Swal.fire('Error', 'Minimum withdrawal is KSh 100', 'error');
      return;
    }

    if (withdrawAmount > 70000) {
      Swal.fire('Error', 'Maximum withdrawal per transaction is KSh 70,000', 'error');
      return;
    }

    const serviceFee = Math.round(withdrawAmount * serviceFeeRate);
    const netAmount = withdrawAmount - serviceFee;

    if (withdrawAmount + serviceFee > currentBalance) {
      Swal.fire('Error', 'Insufficient balance for withdrawal and service fee', 'error');
      return;
    }

    try {
      // Show confirmation
      const { value: confirmed } = await Swal.fire({
        title: 'Confirm Withdrawal',
        html: `
          <div style="text-align: center;">
            <i class="fas fa-money-bill-wave" style="font-size: 40px; color: #065f46; margin-bottom: 15px;"></i>
            <p>Withdraw Amount: <strong>KSh ${withdrawAmount.toLocaleString()}</strong></p>
            <p>Service Fee: <strong>KSh ${serviceFee}</strong></p>
            <p>Net Amount: <strong>KSh ${netAmount}</strong></p>
            <p>Funds will be sent to: <strong>${userData.phone}</strong></p>
          </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Proceed',
        cancelButtonText: 'Cancel'
      });

      if (!confirmed) return;

      // Process withdrawal with Firebase
      const result = await createWithdrawal(
        userData.uid,
        withdrawAmount,
        userData.phone
      );

      if (result.success) {
        // Update local state
        setCurrentBalance(result.newBalance);
        const updatedUserData = {
          ...userData,
          balance: result.newBalance
        };
        setUserData(updatedUserData);
        localStorage.setItem('survey_user', JSON.stringify(updatedUserData));

        Swal.fire({
          title: 'Withdrawal Request Submitted! ✅',
          html: `
            <div style="text-align: center;">
              <i class="fas fa-check-circle" style="font-size: 48px; color: #10b981;"></i>
              <h3 style="margin: 15px 0;">Processing Your Withdrawal</h3>
              <p>KSh ${netAmount} will be sent to your M-Pesa within 30 minutes.</p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'OK'
        }).then(() => {
          navigate('/profile');
        });
      } else {
        throw new Error(result.error || 'Withdrawal failed');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      Swal.fire('Error', error.message || 'Unable to process withdrawal. Please try again.', 'error');
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

        .withdrawable {
          color: var(--gray);
          font-size: 14px;
          margin-top: 10px;
        }

        .withdraw-card {
          background: var(--white);
          border-radius: 15px;
          margin: 20px;
          padding: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .withdraw-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
          text-align: center;
        }

        .amount-input {
          margin-bottom: 25px;
        }

        .amount-input label {
          display: block;
          margin-bottom: 10px;
          font-weight: 500;
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

        .mpesa-info {
          background: #e8f5e9;
          border-radius: 10px;
          padding: 15px;
          margin-top: 20px;
          border-left: 4px solid var(--primary);
        }

        .mpesa-info h4 {
          color: var(--primary);
          margin-bottom: 10px;
        }

        .mpesa-info ul {
          padding-left: 20px;
        }

        .mpesa-info li {
          margin-bottom: 8px;
          font-size: 14px;
        }

        .withdraw-btn {
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

        .withdraw-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(5, 150, 105, 0.3);
        }

        .withdraw-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        .terms {
          margin-top: 20px;
          font-size: 12px;
          color: var(--gray);
          text-align: center;
        }

        @media (max-width: 480px) {
          .balance-card, .withdraw-card {
            margin: 15px;
            padding: 15px;
          }
          
          .quick-amounts {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      <div className="balance-card">
        <div className="balance-label">Available Balance</div>
        <div className="balance-amount">
          KSh {currentBalance.toFixed(2)}
        </div>
        <div className="withdrawable">Minimum withdrawal: KSh 100</div>
      </div>

      <div className="withdraw-card">
        <div className="withdraw-title">Withdrawal Amount</div>
        
        <div className="amount-input">
          <label>Enter Amount (KSh)</label>
          <input
            type="number"
            className="amount-field"
            placeholder="0.00"
            min="100"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(parseFloat(e.target.value) || 0)}
          />
          
          <div className="quick-amounts">
            {[100, 500, 1000, 2000, 5000, 10000].map((amount) => (
              <button
                key={amount}
                className={`amount-btn ${getButtonActiveClass(amount)}`}
                onClick={() => setAmount(amount)}
              >
                {amount.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <div className="mpesa-info">
          <h4><i className="fas fa-info-circle" /> Withdrawal Information</h4>
          <ul>
            <li>Withdrawals are processed to your M-Pesa account</li>
            <li>Minimum withdrawal: KSh 100</li>
            <li>Maximum withdrawal: KSh 70,000 per transaction</li>
            <li>Processing time: 5-30 minutes</li>
            <li>Service fee: 1% (deducted from withdrawal amount)</li>
          </ul>
        </div>

        <button 
          className="withdraw-btn" 
          onClick={processWithdrawal}
        >
          <i className="fas fa-money-bill-wave" /> Withdraw to M-Pesa
        </button>

        <div className="terms">
          By withdrawing, you agree to our terms and conditions
        </div>
      </div>
    </div>
  );
}

export default Withdraw;