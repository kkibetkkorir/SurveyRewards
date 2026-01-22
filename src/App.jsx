import './App.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChange } from './firebase';
import LoadingSpinner from './components/LoadingSpinner';

// Import pages
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Home from './pages/Home';
import Deposit from './pages/Deposit';
import EditProfile from './pages/EditProfile';
import Profile from './pages/Profile';
import Bonuses from './pages/Bonuses';
import Register from './pages/Register';
import Withdraw from './pages/Withdraw';
import Transactions from './pages/Transactions';
import Packages from './pages/Packages';
import Surveys from './pages/Surveys';
import Admin from './pages/Admin';
import MetaTagsManager from './MetaTagsManager';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import SingleSurvey from './pages/SingleSurvey';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setCurrentUser(user);
      setLoading(false);
      
      // Sync with localStorage for components that still use it
      if (user) {        
        localStorage.setItem('survey_user', JSON.stringify({
          ...user,
          loggedIn: true
        }));
      } else {
        localStorage.removeItem('survey_user');
      }
    });

    return () => unsubscribe();
  }, []);

  // Protected route wrapper
  const ProtectedRoute = ({ children }) => {
    if (loading) {
      return <LoadingSpinner />;
    }
    
    if (!currentUser) {
      return <Navigate to="/login" replace />;
    }
    
    return children;
  };

  // Public route wrapper (for login/register when already logged in)
  const PublicRoute = ({ children }) => {
    if (loading) {
      return <LoadingSpinner />;
    }
    
    if (currentUser) {
      return <Navigate to="/" replace />;
    }
    
    return children;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
    <MetaTagsManager  />
    <Header userData={currentUser}/>
    <Routes>
      
      {/* Public routes */}
      <Route path="/login" element={
        <PublicRoute>
          <Login setLoading/>
        </PublicRoute>
      } />
      
      <Route path="/register" element={
        <PublicRoute>
          <Register isLoading setLoading/>
        </PublicRoute>
      } />
      
      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Home setLoading/>
        </ProtectedRoute>
      } />

      <Route path="/surveys" element={
        <ProtectedRoute>
          <Surveys setLoading/>
        </ProtectedRoute>
      } />
      
      <Route path="/deposit" element={
        <ProtectedRoute>
          <Deposit setLoading/>
        </ProtectedRoute>
      } />
      
      <Route path="/withdraw" element={
        <ProtectedRoute>
          <Withdraw setLoading/>
        </ProtectedRoute>
      } />
      
      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile setLoading/>
        </ProtectedRoute>
      } />
      
      <Route path="/edit-profile" element={
        <ProtectedRoute>
          <EditProfile setLoading/>
        </ProtectedRoute>
      } />
      
      <Route path="/change-password" element={
        <ProtectedRoute>
          <ChangePassword setLoading/>
        </ProtectedRoute>
      } />
      
      <Route path="/bonuses" element={
        <ProtectedRoute>
          <Bonuses setLoading/>
        </ProtectedRoute>
      } />
      
      <Route path="/transactions" element={
        <ProtectedRoute>
          <Transactions setLoading/>
        </ProtectedRoute>
      } />
      
      <Route path="/packages" element={
        <ProtectedRoute>
          <Packages setLoading/>
        </ProtectedRoute>
      } />
      <Route path="/single-survey" element={
        <ProtectedRoute>
          <SingleSurvey setLoading/>
        </ProtectedRoute>
      } />

      <Route path="/admin" element={
          <ProtectedRoute>
          <Admin setLoading/>
        </ProtectedRoute>
      } />
      
      {/* Catch all route */}
      <Route path="*" element={
        <Navigate to={currentUser ? "/" : "/login"} replace />
      } />
      
    </Routes>
    <BottomNav />
    </>
  );
}

export default App;