import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
  orderBy,
  query,
  Timestamp
} from 'firebase/firestore';

export interface Bulletin {
  id: string;
  title: string;
  desc: string;
  tag: string;
  tagColor: string;
  date: Timestamp;
  memoUrl?: string;
  createdAt?: Timestamp;
  eventKey?: string;
}

export interface SystemSettings {
  facebookPageUrl: string;
}

export function useCMSData() {
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loadingBulletins, setLoadingBulletins] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Subscribe to bulletins collection
  useEffect(() => {
    const q = query(collection(db, 'cms_bulletins'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: Bulletin[] = [];
      snapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as Bulletin);
      });
      setBulletins(docs);
      setLoadingBulletins(false);
    }, (err) => {
      console.error('Error fetching bulletins:', err);
      setLoadingBulletins(false);
    });

    return unsubscribe;
  }, []);

  // Subscribe to system settings document
  useEffect(() => {
    const docRef = doc(db, 'settings', 'system');
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as SystemSettings);
      } else {
        setSettings({ facebookPageUrl: '' });
      }
      setLoadingSettings(false);
    }, (err) => {
      console.error('Error fetching settings:', err);
      setLoadingSettings(false);
    });

    return unsubscribe;
  }, []);

  // Admin mutation helpers
  const addBulletin = async (data: Omit<Bulletin, 'id' | 'createdAt'>) => {
    const coll = collection(db, 'cms_bulletins');
    await addDoc(coll, {
      ...data,
      createdAt: Timestamp.now()
    });
  };

  const updateBulletin = async (id: string, data: Partial<Bulletin>) => {
    const ref = doc(db, 'cms_bulletins', id);
    await updateDoc(ref, data);
  };

  const deleteBulletin = async (id: string) => {
    const ref = doc(db, 'cms_bulletins', id);
    await deleteDoc(ref);
  };

  const updateFacebookUrl = async (url: string) => {
    const ref = doc(db, 'settings', 'system');
    await setDoc(ref, { facebookPageUrl: url }, { merge: true });
  };

  return {
    bulletins,
    settings,
    loadingBulletins,
    loadingSettings,
    loading: loadingBulletins || loadingSettings,
    addBulletin,
    updateBulletin,
    deleteBulletin,
    updateFacebookUrl
  };
}
