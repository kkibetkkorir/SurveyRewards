import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getUserTransactions } from '../firebase';
 

function Transactions({setLoading}) {
  const navigate = useNavigate();
  
  // State management
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [displayedCount, setDisplayedCount] = useState(10);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
   
  
  // Summary state
  const [summary, setSummary] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalBets: 0,
    totalWins: 0
  });

  // Check if user is logged in and fetch transactions
  useEffect(() => {
    const fetchUserAndTransactions = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          navigate('/login');
          return;
        }

        // Fetch transactions from Firebase
        const firebaseTransactions = await getUserTransactions(user.uid);
        
        // Transform Firebase transactions to match expected format
        const transformedTransactions = firebaseTransactions.map(txn => {
          let type = txn.type;
          let description = '';
          
          switch(txn.type) {
            case 'deposit':
              description = `${txn.method ? txn.method.toUpperCase() : ''} Deposit`;
              break;
            case 'withdrawal':
              description = 'M-Pesa Withdrawal';
              break;
            case 'package_purchase':
              type = 'bet';
              description = 'Package Purchase';
              break;
            case 'survey_earning':
              type = 'win';
              description = 'Survey Earnings';
              break;
            case 'bonus':
              description = 'Bonus Credit';
              break;
            default:
              description = txn.type.replace('_', ' ').toUpperCase();
          }
          
          return {
            id: txn.id,
            type: type,
            amount: txn.amount,
            status: txn.status || 'completed',
            time: txn.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            description: description,
            reference: txn.metadata?.reference || ''
          };
        });

        // Add sample data for testing
        const sampleTransactions = [
          {
            id: 'TXN001',
            type: 'deposit',
            amount: 5000,
            status: 'completed',
            time: '2024-01-15T10:30:00',
            description: 'M-Pesa Deposit',
            reference: 'MPESA123456'
          },
          {
            id: 'TXN002',
            type: 'bet',
            amount: -100,
            status: 'completed',
            time: '2024-01-15T11:15:00',
            description: 'Survey Package',
            match: 'Basic Package'
          },
          {
            id: 'TXN003',
            type: 'win',
            amount: 185,
            status: 'completed',
            time: '2024-01-15T22:45:00',
            description: 'Survey Earnings',
            match: 'Consumer Survey'
          }
        ];

        const allTransactions = [...sampleTransactions, ...transformedTransactions];
        allTransactions.sort((a, b) => new Date(b.time) - new Date(a.time));
        
        setTransactions(allTransactions);
        
        // Set default dates (last 30 days)
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndTransactions();
  }, [navigate]);

  // Update filtered transactions and summary when transactions or filter changes
  useEffect(() => {
    filterTransactions();
    calculateSummary();
  }, [transactions, currentFilter, startDate, endDate]);

  // Filter transactions based on current filter and dates
  const filterTransactions = () => {
    let filtered = [...transactions];
    
    // Apply type filter
    if (currentFilter !== 'all') {
      filtered = filtered.filter(txn => txn.type === currentFilter);
    }
    
    // Apply date filter
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(txn => {
        const txnDate = new Date(txn.time);
        return txnDate >= start && txnDate <= end;
      });
    }
    
    setFilteredTransactions(filtered.slice(0, displayedCount));
  };

  // Calculate summary statistics
  const calculateSummary = () => {
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalBets = 0;
    let totalWins = 0;
    
    transactions.forEach(txn => {
      if (txn.type === 'deposit') {
        totalDeposits += Math.abs(txn.amount);
      } else if (txn.type === 'withdrawal') {
        totalWithdrawals += Math.abs(txn.amount);
      } else if (txn.type === 'bet') {
        totalBets += Math.abs(txn.amount);
      } else if (txn.type === 'win') {
        totalWins += Math.abs(txn.amount);
      }
    });
    
    setSummary({
      totalDeposits,
      totalWithdrawals,
      totalBets,
      totalWins
    });
  };

  // Get type icon
  const getTypeIcon = (type) => {
    switch(type) {
      case 'deposit': return <i className="fas fa-plus-circle" />;
      case 'withdrawal': return <i className="fas fa-minus-circle" />;
      case 'bet': return <i className="fas fa-ticket-alt" />;
      case 'win': return <i className="fas fa-trophy" />;
      case 'bonus': return <i className="fas fa-gift" />;
      default: return <i className="fas fa-exchange-alt" />;
    }
  };

  // Get status class
  const getStatusClass = (status) => {
    switch(status) {
      case 'completed': return 'status-completed';
      case 'pending': return 'status-pending';
      case 'failed': return 'status-failed';
      default: return '';
    }
  };

  // Format date
  const formatTime = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleDateString('en-KE', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle filter change
  const handleFilterChange = (filter) => {
    setCurrentFilter(filter);
    setDisplayedCount(10);
  };

  // Handle date filter
  const handleDateFilter = () => {
    setDisplayedCount(10);
    filterTransactions();
  };

  // Load more transactions
  const loadMoreTransactions = () => {
    setDisplayedCount(prev => prev + 10);
  };

   

  return (
    <div>
      <style>{`
        .filters {
          background: var(--white);
          margin: 20px;
          padding: 15px;
          border-radius: 15px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          display: flex;
          gap: 10px;
          overflow-x: auto;
        }

        .filter-btn {
          padding: 8px 16px;
          background: var(--light-gray);
          border: 1px solid #ddd;
          border-radius: 20px;
          color: var(--gray);
          font-size: 14px;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.3s;
          border: none;
        }

        .filter-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .filter-btn.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .date-filter {
          display: flex;
          gap: 10px;
          margin: 0 20px 15px;
        }

        .date-input {
          flex: 1;
          padding: 12px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
        }

        .date-input:focus {
          outline: none;
          border-color: var(--primary);
        }

        .transactions-container {
          padding: 0 20px;
        }

        .transaction-card {
          background: var(--white);
          border-radius: 12px;
          padding: 15px;
          margin-bottom: 10px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.3s;
        }

        .transaction-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .transaction-info {
          flex: 1;
        }

        .transaction-type {
          font-weight: 600;
          margin-bottom: 5px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .transaction-time {
          font-size: 12px;
          color: var(--gray);
        }

        .transaction-id {
          font-size: 11px;
          color: var(--gray);
          font-family: monospace;
          margin-top: 3px;
        }

        .transaction-amount {
          font-weight: 700;
          font-size: 16px;
          text-align: right;
        }

        .amount-positive {
          color: var(--success);
        }

        .amount-negative {
          color: var(--danger);
        }

        .transaction-status {
          font-size: 12px;
          padding: 3px 8px;
          border-radius: 12px;
          display: inline-block;
          margin-left: 10px;
        }

        .status-completed {
          background: #d1fae5;
          color: var(--success);
        }

        .status-pending {
          background: #fef3c7;
          color: var(--warning);
        }

        .status-failed {
          background: #fee2e2;
          color: var(--danger);
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--gray);
        }

        .empty-state i {
          font-size: 48px;
          margin-bottom: 15px;
          color: #ddd;
        }

        .summary-card {
          background: var(--white);
          border-radius: 15px;
          margin: 20px;
          padding: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .summary-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 15px;
          color: var(--black);
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }

        .summary-item {
          text-align: center;
          padding: 15px;
          background: var(--light-gray);
          border-radius: 10px;
        }

        .summary-value {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 5px;
        }

        .summary-label {
          font-size: 12px;
          color: var(--gray);
        }

        .value-positive {
          color: var(--success);
        }

        .value-negative {
          color: var(--danger);
        }

        .load-more {
          text-align: center;
          margin: 20px;
        }

        .load-btn {
          padding: 12px 30px;
          background: var(--white);
          border: 2px solid var(--primary);
          color: var(--primary);
          border-radius: 25px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          border: none;
        }

        .load-btn:hover {
          background: var(--primary);
          color: white;
        }

        @media (max-width: 480px) {
          .filters, .date-filter, .transactions-container {
            margin: 15px;
          }
          
          .summary-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="date-filter">
        <input 
          type="date" 
          className="date-input" 
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input 
          type="date" 
          className="date-input" 
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <button 
          className="filter-btn active" 
          onClick={handleDateFilter}
        >
          Filter
        </button>
      </div>

      <div className="filters">
        <button 
          className={`filter-btn ${currentFilter === 'all' ? 'active' : ''}`}
          onClick={() => handleFilterChange('all')}
        >
          All
        </button>
        <button 
          className={`filter-btn ${currentFilter === 'deposit' ? 'active' : ''}`}
          onClick={() => handleFilterChange('deposit')}
        >
          Deposits
        </button>
        <button 
          className={`filter-btn ${currentFilter === 'withdrawal' ? 'active' : ''}`}
          onClick={() => handleFilterChange('withdrawal')}
        >
          Withdrawals
        </button>
        <button 
          className={`filter-btn ${currentFilter === 'bet' ? 'active' : ''}`}
          onClick={() => handleFilterChange('bet')}
        >
          Purchases
        </button>
        <button 
          className={`filter-btn ${currentFilter === 'win' ? 'active' : ''}`}
          onClick={() => handleFilterChange('win')}
        >
          Earnings
        </button>
        <button 
          className={`filter-btn ${currentFilter === 'bonus' ? 'active' : ''}`}
          onClick={() => handleFilterChange('bonus')}
        >
          Bonuses
        </button>
      </div>

      <div className="summary-card">
        <div className="summary-title">Transaction Summary</div>
        <div className="summary-grid">
          <div className="summary-item">
            <div className="summary-value value-positive">
              KSh {summary.totalDeposits.toLocaleString()}
            </div>
            <div className="summary-label">Total Deposits</div>
          </div>
          <div className="summary-item">
            <div className="summary-value value-negative">
              KSh {summary.totalWithdrawals.toLocaleString()}
            </div>
            <div className="summary-label">Total Withdrawals</div>
          </div>
          <div className="summary-item">
            <div className="summary-value value-negative">
              KSh {summary.totalBets.toLocaleString()}
            </div>
            <div className="summary-label">Total Purchases</div>
          </div>
          <div className="summary-item">
            <div className="summary-value value-positive">
              KSh {summary.totalWins.toLocaleString()}
            </div>
            <div className="summary-label">Total Earnings</div>
          </div>
        </div>
      </div>

      <div className="transactions-container">
        {filteredTransactions.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-receipt" />
            <h3>No Transactions Found</h3>
            <p>No transactions match your current filter</p>
          </div>
        ) : (
          filteredTransactions.map((txn) => {
            const amountClass = txn.amount >= 0 ? 'amount-positive' : 'amount-negative';
            const amountSign = txn.amount >= 0 ? '+' : '';
            
            return (
              <div key={txn.id} className="transaction-card">
                <div className="transaction-info">
                  <div className="transaction-type">
                    {getTypeIcon(txn.type)} {txn.description}
                    <span className={`transaction-status ${getStatusClass(txn.status)}`}>
                      {txn.status}
                    </span>
                  </div>
                  <div className="transaction-time">{formatTime(txn.time)}</div>
                  <div className="transaction-id">ID: {txn.id}</div>
                  {txn.match && (
                    <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 3 }}>
                      {txn.match}
                    </div>
                  )}
                </div>
                <div className={`transaction-amount ${amountClass}`}>
                  {amountSign}KSh {Math.abs(txn.amount).toLocaleString()}
                </div>
              </div>
            );
          })
        )}
      </div>

      {displayedCount < transactions.length && (
        <div className="load-more">
          <button className="load-btn" onClick={loadMoreTransactions}>
            <i className="fas fa-arrow-down" /> Load More
          </button>
        </div>
      )}
    </div>
  );
}

export default Transactions;