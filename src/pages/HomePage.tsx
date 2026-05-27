import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import HomeNavbar from '../components/layout/HomeNavbar';
import AuthModal from '../components/auth/AuthModal';

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('login') === 'true') {
      Promise.resolve().then(() => {
        setShowAuthModal(true);
        // Clean up URL so refresh doesn't reopen it
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('login');
        setSearchParams(newParams, { replace: true });
      });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setRole(userData.role || 'user');
            setUserName(userData.fullName || currentUser.displayName || 'User');
          } else {
            setRole('user');
            setUserName(currentUser.displayName || 'User');
          }
        } catch (error) {
          console.error("Error fetching user data on homepage:", error);
          setRole('user');
          setUserName(currentUser.displayName || 'User');
        }
      } else {
        setUser(null);
        setRole(null);
        setUserName(null);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  return (
    <div className="home-layout min-vh-100 bg-light d-flex flex-column">
      {/* Header / Public Navbar */}
      <HomeNavbar
        user={user}
        role={role}
        userName={userName}
        onLoginClick={() => setShowAuthModal(true)}
      />



      {/* Auth Modal Component */}
      <AuthModal
        show={showAuthModal}
        onHide={() => setShowAuthModal(false)}
      />
    </div>
  );
}
