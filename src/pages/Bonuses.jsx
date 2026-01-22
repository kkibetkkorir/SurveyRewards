import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getUserBonuses, claimBonus } from '../firebase';
import Swal from 'sweetalert2';
 

function Bonuses({setLoading}) {
  const navigate = useNavigate();
  
  const [userData, setUserData] = useState(null);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [activeBonuses, setActiveBonuses] = useState([]);
   

  // Check if user is logged in and fetch bonus data
  useEffect(() => {
    const fetchUserAndBonuses = async () => {
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
          loggedIn: true
        };

        setUserData(transformedUser);
        
        // Get user bonuses from Firebase
        const bonuses = await getUserBonuses(user.uid);
        if (bonuses) {
          setBonusBalance(bonuses.totalBonusEarned || 0);
          setActiveBonuses(bonuses.claimedBonuses || []);
        }
        
        // Store in localStorage for compatibility
        localStorage.setItem('survey_user', JSON.stringify(transformedUser));
      } catch (error) {
        console.error('Error fetching user data:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndBonuses();
  }, [navigate]);

  // Claim bonus function
  const handleClaimBonus = async (bonusId) => {
    if (!userData?.uid) {
      Swal.fire('Error', 'User not found. Please login again.', 'error');
      return;
    }

    try {
      const result = await claimBonus(userData.uid, bonusId);
      
      if (result.success) {
        // Update local state
        setBonusBalance(prev => prev + (result.amount || 0));
        setActiveBonuses(prev => [...prev, bonusId]);
        
        Swal.fire({
          title: 'Bonus Claimed! 🎉',
          html: `Successfully claimed ${result.bonus.name} for KSh ${result.amount || 0}`,
          icon: 'success',
          confirmButtonText: 'Great!'
        });
      } else {
        Swal.fire('Error', result.error || 'Failed to claim bonus', 'error');
      }
    } catch (error) {
      console.error('Error claiming bonus:', error);
      Swal.fire('Error', 'Failed to claim bonus. Please try again.', 'error');
    }
  };

  // Show bonus details
  const showBonusDetails = (bonusType) => {
    let details = '';
    
    switch(bonusType) {
      case 'welcome':
        details = `
          Welcome Bonus Details\n
          Offer: 100% up to KSh 5,000\n
          Minimum Deposit: KSh 100\n
          Wagering Requirement: 10x bonus amount\n
          Validity: 30 days\n
          Eligibility: New players only, first deposit
        `;
        break;
        
      case 'deposit':
        details = `
          Deposit Bonus Details\n
          Offer: 50% up to KSh 10,000\n
          Minimum Deposit: KSh 500\n
          Wagering Requirement: 8x bonus amount\n
          Validity: 14 days\n
          Maximum Bonus: KSh 10,000
        `;
        break;
        
      case 'jackpot':
        details = `
          Jackpot Bonus Details\n
          Offer: Free Jackpot Ticket\n
          Requirement: Place 5 bets in a week\n
          Ticket Value: KSh 50\n
          Validity: Next jackpot round only\n
          Claim Period: Monday to Friday
        `;
        break;
        
      case 'referral':
        details = `
          Referral Bonus Details\n
          Offer: KSh 500 per successful referral\n
          Friend Requirements:\n
          - Minimum deposit: KSh 500\n
          - Place at least 3 bets\n
          - Use your referral code\n
          Maximum Referrals: 5 per month\n
          Payout: Instant to bonus balance
        `;
        break;
    }
    
    alert(details);
  };

  // Share referral
  const shareReferral = () => {
    const referralCode = userData?.phone ? userData.phone.substring(7) + 'SURVEY' : 'SURVEYREWARDS';
    const message = `Join me on SurveyRewards! Use my referral code ${referralCode} to get KSh 100 bonus on your first deposit!`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Join SurveyRewards',
        text: message,
        url: window.location.origin
      });
    } else {
      navigator.clipboard.writeText(message).then(() => {
        Swal.fire('Success', 'Referral link copied to clipboard!', 'success');
      }).catch(() => {
        prompt('Copy this referral link:', message);
      });
    }
  };

   

  if (!userData) {
    return null;
  }

  return (
    <div>
      <style>{`
        .bonus-balance {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-radius: 15px;
          margin: 20px;
          padding: 20px;
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.2);
          border: 2px solid var(--bonus-gold);
          text-align: center;
        }

        .bonus-balance-label {
          font-size: 14px;
          color: #92400e;
          margin-bottom: 5px;
        }

        .bonus-balance-amount {
          font-size: 36px;
          font-weight: bold;
          color: #92400e;
          margin-bottom: 15px;
        }

        .use-bonus-btn {
          background: var(--bonus-gold);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 25px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .use-bonus-btn:hover {
          background: #d97706;
          transform: translateY(-2px);
        }

        .bonus-section {
          padding: 0 20px;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          margin: 25px 0 15px;
          color: var(--black);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .bonus-card {
          background: var(--white);
          border-radius: 15px;
          margin-bottom: 15px;
          padding: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          border-top: 4px solid var(--primary);
          position: relative;
          overflow: hidden;
        }

        .bonus-card.featured {
          border-color: var(--bonus-gold);
          background: linear-gradient(135deg, #fff8e1 0%, #fff3e0 100%);
        }

        .bonus-badge {
          position: absolute;
          top: 15px;
          right: 15px;
          background: var(--primary);
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .bonus-card.featured .bonus-badge {
          background: var(--bonus-gold);
        }

        .bonus-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 10px;
          color: var(--black);
        }

        .bonus-amount {
          font-size: 28px;
          font-weight: bold;
          color: var(--primary);
          margin-bottom: 15px;
        }

        .bonus-card.featured .bonus-amount {
          color: var(--bonus-gold);
        }

        .bonus-description {
          font-size: 14px;
          color: var(--gray);
          margin-bottom: 15px;
          line-height: 1.5;
        }

        .bonus-terms {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 12px;
          margin: 15px 0;
          font-size: 12px;
          color: var(--gray);
        }

        .bonus-terms ul {
          padding-left: 20px;
          margin: 8px 0;
        }

        .bonus-terms li {
          margin-bottom: 5px;
        }

        .bonus-actions {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }

        .claim-btn {
          flex: 1;
          padding: 12px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .claim-btn:hover:not(:disabled) {
          background: var(--secondary);
          transform: translateY(-2px);
        }

        .claim-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        .claim-btn.claimed {
          background: var(--gray);
        }

        .details-btn {
          padding: 12px 20px;
          background: var(--white);
          border: 2px solid var(--primary);
          color: var(--primary);
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .details-btn:hover {
          background: rgba(5, 150, 105, 0.1);
        }

        .progress-container {
          margin: 15px 0;
        }

        .progress-label {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          margin-bottom: 5px;
        }

        .progress-bar {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--primary);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .progress-bar.gold .progress-fill {
          background: var(--bonus-gold);
        }

        .my-bonuses {
          background: var(--white);
          border-radius: 15px;
          margin: 20px;
          padding: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .bonus-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 0;
          border-bottom: 1px solid #eee;
        }

        .bonus-item:last-child {
          border-bottom: none;
        }

        .bonus-item-info h4 {
          font-size: 16px;
          margin-bottom: 5px;
        }

        .bonus-item-info p {
          font-size: 14px;
          color: var(--gray);
        }

        .bonus-item-amount {
          font-weight: 700;
          color: var(--primary);
        }

        .bonus-item-status {
          font-size: 12px;
          padding: 3px 8px;
          border-radius: 12px;
          background: #d1fae5;
          color: var(--primary);
        }

        .empty-bonuses {
          text-align: center;
          padding: 40px 20px;
          color: var(--gray);
        }

        .empty-bonuses i {
          font-size: 48px;
          margin-bottom: 15px;
          color: #ddd;
        }

        @media (max-width: 480px) {
          .bonus-balance, .bonus-section, .my-bonuses {
            margin: 15px;
          }
          
          .bonus-actions {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="bonus-balance">
        <div className="bonus-balance-label">Available Bonus Balance</div>
        <div className="bonus-balance-amount">
          KSh {bonusBalance.toLocaleString()}
        </div>
        <button className="use-bonus-btn" onClick={() => navigate('/deposit')}>
          <i className="fas fa-gift" /> Use for Deposit
        </button>
      </div>

      <div className="bonus-section">
        <h2 className="section-title"><i className="fas fa-star" /> Available Bonuses</h2>
        
        {/* Welcome Bonus */}
        <div className="bonus-card featured">
          <div className="bonus-badge">FEATURED</div>
          <div className="bonus-title">Welcome Bonus</div>
          <div className="bonus-amount">100% up to KSh 5,000</div>
          <div className="bonus-description">
            Get 100% bonus on your first deposit! {/*Perfect for new players starting their betting journey.*/}
          </div>
          <div className="bonus-terms">
            <strong>Terms:</strong>
            <ul>
              <li>Minimum deposit: KSh 100</li>
              <li>10x wagering requirement</li>
              <li>Valid for 30 days</li>
              <li>New players only</li>
            </ul>
          </div>
          <div className="bonus-actions">
            <button 
              className={`claim-btn ${activeBonuses.includes('welcome_bonus') ? 'claimed' : ''}`}
              onClick={() => handleClaimBonus('welcome_bonus')}
              disabled={activeBonuses.includes('welcome_bonus')}
            >
              <i className={`fas ${activeBonuses.includes('welcome_bonus') ? 'fa-check' : 'fa-gift'}`} />
              {activeBonuses.includes('welcome_bonus') ? 'Claimed' : 'Claim Now'}
            </button>
            <button 
              className="details-btn" 
              onClick={() => showBonusDetails('welcome')}
            >
              Details
            </button>
          </div>
        </div>

        {/* Deposit Bonus */}
        <div className="bonus-card">
          <div className="bonus-title">Deposit Bonus</div>
          <div className="bonus-amount">50% up to KSh 10,000</div>
          <div className="bonus-description">
            Get 50% extra on every deposit you make. Perfect for regular participants.
          </div>
          <div className="progress-container">
            <div className="progress-label">
              <span>Progress: KSh {/*2,500*/0} / KSh 5,000</span>
              <span>50%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '50%' }} />
            </div>
          </div>
          <div className="bonus-actions">
            <button 
              className="claim-btn" 
              onClick={() => handleClaimBonus('deposit_bonus')}
              disabled={activeBonuses.includes('deposit_bonus')}
            >
              <i className="fas fa-plus-circle" /> Claim Bonus
            </button>
            <button 
              className="details-btn" 
              onClick={() => showBonusDetails('deposit')}
            >
              Details
            </button>
          </div>
        </div>

        {/* Jackpot Bonus */}
        {/*<div className="bonus-card">
          <div className="bonus-title">Jackpot Bonus</div>
          <div className="bonus-amount">Free Jackpot Ticket</div>
          <div className="bonus-description">
            Place 5 bets this week and get a FREE jackpot ticket for the weekend!
          </div>
          <div className="progress-container">
            <div className="progress-label">
              <span>Progress: 3 / 5 bets placed</span>
              <span>60%</span>
            </div>
            <div className="progress-bar gold">
              <div className="progress-fill" style={{ width: '60%' }} />
            </div>
          </div>
          <div className="bonus-actions">
            <button 
              className="claim-btn" 
              onClick={() => handleClaimBonus('jackpot_bonus')}
              disabled={true}
            >
              <i className="fas fa-ticket-alt" /> Complete to Claim
            </button>
            <button 
              className="details-btn" 
              onClick={() => showBonusDetails('jackpot')}
            >
              Details
            </button>
          </div>
        </div>*/}

        {/* Referral Bonus */}
        <div className="bonus-card">
          <div className="bonus-title">Referral Bonus</div>
          <div className="bonus-amount">KSh 50 per friend</div>
          <div className="bonus-description">
            Invite friends to join SurveyRewards and earn KSh 50 for each successful referral.
          </div>
          <div className="bonus-terms">
            <strong>Terms:</strong>
            <ul>
              <li>Friend must deposit at least KSh 50</li>
              <li>Friend must parchase at least 1 package</li>
              <li>Maximum 30 referrals per month</li>
            </ul>
          </div>
          <div className="bonus-actions">
            <button 
              className="claim-btn" 
              onClick={shareReferral}
            >
              <i className="fas fa-share-alt" /> Share Referral
            </button>
            <button 
              className="details-btn" 
              onClick={() => showBonusDetails('referral')}
            >
              Details
            </button>
          </div>
        </div>
      </div>

      <div className="my-bonuses">
        <h2 className="section-title"><i className="fas fa-history" /> My Active Bonuses</h2>
        <div>
          {activeBonuses.length === 0 ? (
            <div className="empty-bonuses">
              <i className="fas fa-gift" />
              <h3>No Active Bonuses</h3>
              <p>Claim a bonus above to see it here</p>
            </div>
          ) : (
            activeBonuses.map((bonusId, index) => (
              <div key={index} className="bonus-item">
                <div className="bonus-item-info">
                  <h4>{bonusId.replace('_', ' ').toUpperCase()}</h4>
                  <p>Claimed on: {new Date().toLocaleDateString()}</p>
                </div>
                <div>
                  <div className="bonus-item-amount">
                    KSh 500
                  </div>
                  <div className="bonus-item-status">Active</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Bonuses;