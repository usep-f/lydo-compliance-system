import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from 'react-bootstrap';

import HomeNavbar from '../components/layout/HomeNavbar';
import AuthModal from '../components/auth/AuthModal';
import HomeHero from '../components/layout/HomeHero';
import HomeStats from '../components/layout/HomeStats';
import HomeLeaderboard from '../components/layout/HomeLeaderboard';
import HomeDocGuide from '../components/layout/HomeDocGuide';
import HomeTimeline from '../components/layout/HomeTimeline';
import HomeNews from '../components/layout/HomeNews';
import HomeFAQ from '../components/layout/HomeFAQ';
import HomeContact from '../components/layout/HomeContact';
import HomeFooter from '../components/layout/HomeFooter';

import { usePublicAnalytics } from '../hooks/usePublicAnalytics';

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [barangay, setBarangay] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Set tab title
  useEffect(() => {
    document.title = "LYDO | Home";
  }, []);

  // 1. URL search parameter checking for redirect modal triggers
  useEffect(() => {
    if (searchParams.get('login') === 'true') {
      Promise.resolve().then(() => {
        setShowAuthModal(true);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('login');
        setSearchParams(newParams, { replace: true });
      });
    }
  }, [searchParams, setSearchParams]);

  // 2. Auth State subscription
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
            setBarangay(userData.barangay || null);
          } else {
            setRole('user');
            setUserName(currentUser.displayName || 'User');
            setBarangay(null);
          }
        } catch (error) {
          console.error("Error fetching user data on homepage:", error);
          setRole('user');
          setUserName(currentUser.displayName || 'User');
          setBarangay(null);
        }
      } else {
        setUser(null);
        setRole(null);
        setUserName(null);
        setBarangay(null);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // 3. Load live public analytics from the new backend aggregator
  const { analytics, loading } = usePublicAnalytics();

  const totalSubmissionsCount = analytics?.totalSubmissionsCount ?? 0;
  const activeBarangaysCount = analytics?.activeBarangaysCount ?? 0;
  const activeUsersCount = analytics?.activeUsersCount ?? 0;
  const totalSubmissions = totalSubmissionsCount;



  // 5. Scroll animation trigger via Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          } else {
            entry.target.classList.remove('visible');
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -40px 0px' }
    );

    const targets = document.querySelectorAll('.kinetic-section, .sr-item, .sr-heading');
    targets.forEach((el) => observer.observe(el));

    return () => {
      targets.forEach((el) => observer.unobserve(el));
    };
  }, []);

  const handleDashboardRedirect = () => {
    if (role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="home-layout min-vh-100 d-flex flex-column" style={{ background: '#F8FAFC' }}>
      {/* 1. Transparent-to-Glassmorphic Header */}
      <HomeNavbar
        user={user}
        role={role}
        userName={userName}
        onLoginClick={() => setShowAuthModal(true)}
      />

      {/* 2. Public Hero Block */}
      <HomeHero
        onLoginClick={() => setShowAuthModal(true)}
        user={user}
        handleDashboardRedirect={handleDashboardRedirect}
        activeBarangaysCount={activeBarangaysCount}
        activeUsersCount={activeUsersCount}
        totalSubmissions={totalSubmissions}
      />

      {/* 3. System Compliance stats */}
      <div className="kinetic-section">
        <HomeStats 
          analytics={analytics} 
          loading={loading}
        />
      </div>

      {/* 7. Bulletins board */}
      <div className="kinetic-section">
        <HomeNews />
      </div>

      {/* 4. Searchable Barangay Compliance Ledger Directory */}
      <div className="kinetic-section">
        <HomeLeaderboard 
          analytics={analytics} 
          loading={loading}
          userBarangay={barangay}
        />
      </div>

      {/* 5. Requirements Guideline Grid */}
      <div className="kinetic-section">
        <HomeDocGuide />
      </div>

      {/* 6. Onboarding timeline */}
      <div className="kinetic-section">
        <HomeTimeline />
      </div>


      {/* 8. Accordions FAQ */}
      <div className="kinetic-section">
        <HomeFAQ />
      </div>

      {/* 9. Inquiry Support */}
      <div className="kinetic-section">
        <HomeContact />
      </div>

      {/* 10. Minimalist Footer */}
      <HomeFooter />

      {/* Mobile Floating Action Button */}
      {!user && (
        <Button
          variant="primary"
          onClick={() => setShowAuthModal(true)}
          className="mobile-fab-cta d-flex align-items-center gap-2"
        >
          <span className="material-symbols-outlined fs-5">login</span>
          <span>Access Portal</span>
        </Button>
      )}

      {/* Auth Modal Component */}
      <AuthModal
        show={showAuthModal}
        onHide={() => setShowAuthModal(false)}
      />
    </div>
  );
}
