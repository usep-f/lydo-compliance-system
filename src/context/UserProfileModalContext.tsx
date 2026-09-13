/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, type ReactNode, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import UserProfileModal from '../components/common/UserProfileModal';

export interface UserProfileData {
  uid: string;
  fullName: string;
  email: string;
  role: 'admin' | 'user';
  barangay?: string;
  designation?: string;
  contactNumber?: string;
  address?: string;
  avatarUrl?: string;
  socialLinks?: Array<{
    platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'tiktok' | 'youtube' | 'website';
    url: string;
  }>;
}

interface UserProfileModalContextType {
  openUserProfile: (userId: string) => void;
}

const UserProfileModalContext = createContext<UserProfileModalContextType | undefined>(undefined);

export const useUserProfileModal = () => {
  const context = useContext(UserProfileModalContext);
  if (!context) {
    throw new Error('useUserProfileModal must be used within a UserProfileModalProvider');
  }
  return context;
};

export const UserProfileModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Client-side cache for fetched profiles to minimize Firestore reads
  const [profileCache, setProfileCache] = useState<Record<string, UserProfileData>>({});

  const openUserProfile = useCallback(async (userId: string) => {
    setShowModal(true);
    setError(null);

    // If we already have it in cache, serve it immediately
    if (profileCache[userId]) {
      setProfileData(profileCache[userId]);
      return;
    }

    setLoading(true);
    setProfileData(null); // Clear previous data

    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as Omit<UserProfileData, 'uid'>;
        const profile = { uid: userId, ...data };
        setProfileData(profile);
        
        // Update cache
        setProfileCache(prev => ({ ...prev, [userId]: profile }));
      } else {
        setError('User profile not found.');
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Could not load user profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [profileCache]);

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <UserProfileModalContext.Provider value={{ openUserProfile }}>
      {children}
      
      {/* Central Modal Render */}
      <UserProfileModal 
        show={showModal} 
        onHide={closeModal} 
        profile={profileData} 
        loading={loading}
        error={error}
      />
    </UserProfileModalContext.Provider>
  );
};
