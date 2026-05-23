import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import HomePage from './pages/HomePage';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SetupPasswordPage from './pages/SetupPasswordPage';
import RegistrationSuccessPage from './pages/RegistrationSuccessPage';
import { ToastProvider, useToast } from './context/ToastContext';
import './App.css';

function AppInner() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        // Fetch user document to get role
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            if (userData.status === 'approved') {
              setUser(currentUser);
              setRole(userData.role || 'user');
            } else {
              // Should not happen with Approach A, but just in case
              await signOut(auth);
              setUser(null);
              setRole(null);
              addToast('Your account is not approved yet.', 'warning');
            }
          } else {
            // User authenticated but no document found.
            // This means they are not an approved user in our system.
            await signOut(auth);
            setUser(null);
            setRole(null);
            addToast('No user profile found. Please ensure you have an approved account.', 'error');
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          await signOut(auth);
          setUser(null);
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [addToast]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
      <Routes>
        <Route 
          path="/" 
          element={<HomePage />} 
        />

        <Route 
          path="/setup-password" 
          element={<SetupPasswordPage />} 
        />

        <Route 
          path="/registration-success" 
          element={<RegistrationSuccessPage />} 
        />
        
        <Route 
          path="/dashboard" 
          element={
            user && role === 'user' ? <UserDashboard /> : <Navigate to="/" />
          } 
        />
        
        <Route 
          path="/admin" 
          element={
            user && role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />
          } 
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
  );
}

function App() {
  return (
    <ToastProvider>
      <Router>
        <AppInner />
      </Router>
    </ToastProvider>
  );
}

export default App;
