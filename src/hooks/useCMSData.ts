import { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
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
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';

export interface Bulletin {
  id: string;
  title: string;
  desc: string;
  tag: string;
  tagColor: string;
  date: Timestamp;
  memoUrl?: string;
  imageUrl?: string;
  imagePath?: string;
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

  // Storage upload helper
  const uploadBulletinImage = async (file: File): Promise<{ downloadUrl: string; storagePath: string }> => {
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `bulletins/${Date.now()}_${cleanFileName}`;
    const fileRef = storageRef(storage, filePath);
    await uploadBytes(fileRef, file);
    const downloadUrl = await getDownloadURL(fileRef);
    return { downloadUrl, storagePath: filePath };
  };

  // Storage delete helper
  const deleteBulletinImage = async (storagePath: string) => {
    if (!storagePath) return;
    try {
      const fileRef = storageRef(storage, storagePath);
      await deleteObject(fileRef);
    } catch (err) {
      console.warn('Could not delete storage image (might not exist):', err);
    }
  };

  // Admin mutation helpers
  const addBulletin = async (data: Omit<Bulletin, 'id' | 'createdAt'>) => {
    const coll = collection(db, 'cms_bulletins');
    await addDoc(coll, {
      ...data,
      createdAt: Timestamp.now()
    });
  };

  const updateBulletin = async (id: string, data: Partial<Bulletin>, oldImagePathToDelete?: string) => {
    const ref = doc(db, 'cms_bulletins', id);
    await updateDoc(ref, data);
    if (oldImagePathToDelete) {
      await deleteBulletinImage(oldImagePathToDelete);
    }
  };

  const deleteBulletin = async (id: string, imagePath?: string) => {
    const ref = doc(db, 'cms_bulletins', id);
    await deleteDoc(ref);
    if (imagePath) {
      await deleteBulletinImage(imagePath);
    }
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
    uploadBulletinImage,
    deleteBulletinImage,
    updateFacebookUrl
  };
}

