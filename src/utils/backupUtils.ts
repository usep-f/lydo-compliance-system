import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

export const triggerSystemBackup = async () => {
  const collectionsToBackup = ['users', 'submissions', 'pending_submissions', 'perennial_counts'];
  const backupData: Record<string, Record<string, unknown>[]> = {};

  for (const collName of collectionsToBackup) {
    try {
      const snapshot = await getDocs(collection(db, collName));
      backupData[collName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error(`Failed to backup collection ${collName}:`, err);
      backupData[collName] = [];
    }
  }

  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  link.setAttribute('download', `LYDO_System_Backup_${timestamp}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
