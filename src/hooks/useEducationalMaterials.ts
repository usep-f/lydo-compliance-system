import { useState, useEffect, useMemo, useCallback } from 'react';
import { db, storage } from '../firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export const EDUCATIONAL_CATEGORIES = [
  'SK Governance',
  'Financial Management',
  'Youth Programs & CBYDP/ABYIP',
  'Legal & Policy Compliance',
  'Document Templates & Guides',
  'General Resources',
] as const;

export type EducationalCategory = (typeof EDUCATIONAL_CATEGORIES)[number];

export type EducationalResourceType =
  | 'pdf'
  | 'docx'
  | 'xlsx'
  | 'pptx'
  | 'video_link'
  | 'external_link';

export interface EducationalMaterial {
  id: string;
  title: string;
  description: string;
  category: string;
  resourceType: EducationalResourceType;
  fileUrl?: string;
  storagePath?: string;
  externalUrl?: string;
  fileName?: string;
  fileSizeBytes?: number;
  uploadedBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface MaterialFormData {
  title: string;
  description: string;
  category: string;
  resourceType: EducationalResourceType;
  externalUrl?: string;
  file?: File | null;
}

export function useEducationalMaterials() {
  const [materials, setMaterials] = useState<EducationalMaterial[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');

  // Real-time Firestore subscription
  useEffect(() => {
    const q = query(
      collection(db, 'educational_materials'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: EducationalMaterial[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as EducationalMaterial);
        });
        setMaterials(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching educational materials:', err);
        setError('Failed to load educational materials.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Client-side instant filtering computed in useMemo
  const filteredMaterials = useMemo(() => {
    return materials.filter((item) => {
      // Category check
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }

      // Resource type check
      if (selectedType !== 'All') {
        if (selectedType === 'documents') {
          if (!['pdf', 'docx', 'xlsx', 'pptx'].includes(item.resourceType)) return false;
        } else if (selectedType === 'links') {
          if (!['video_link', 'external_link'].includes(item.resourceType)) return false;
        } else if (item.resourceType !== selectedType) {
          return false;
        }
      }

      // Text query match (title or description)
      if (searchQuery.trim().length > 0) {
        const queryLower = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title?.toLowerCase().includes(queryLower);
        const matchesDesc = item.description?.toLowerCase().includes(queryLower);
        const matchesCategory = item.category?.toLowerCase().includes(queryLower);
        if (!matchesTitle && !matchesDesc && !matchesCategory) {
          return false;
        }
      }

      return true;
    });
  }, [materials, selectedCategory, selectedType, searchQuery]);

  // Admin Mutations: Add new material
  const addMaterial = useCallback(
    async (formData: MaterialFormData, uploadedBy: string) => {
      let fileUrl = '';
      let storagePath = '';
      let fileName = '';
      let fileSizeBytes = 0;

      if (formData.file) {
        const timestamp = Date.now();
        const sanitizedName = formData.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        storagePath = `educational_materials/${timestamp}_${sanitizedName}`;
        const fileRef = ref(storage, storagePath);

        await uploadBytes(fileRef, formData.file);
        fileUrl = await getDownloadURL(fileRef);
        fileName = formData.file.name;
        fileSizeBytes = formData.file.size;
      }

      const coll = collection(db, 'educational_materials');
      await addDoc(coll, {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        resourceType: formData.resourceType,
        uploadedBy: uploadedBy || 'Admin',
        createdAt: Timestamp.now(),
        ...(fileUrl && { fileUrl, storagePath, fileName, fileSizeBytes }),
        ...(formData.externalUrl && { externalUrl: formData.externalUrl.trim() }),
      });
    },
    []
  );

  // Admin Mutations: Update existing material
  const updateMaterial = useCallback(
    async (
      id: string,
      formData: MaterialFormData,
      existingStoragePath?: string
    ) => {
      const docRef = doc(db, 'educational_materials', id);
      const updates: Record<string, unknown> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        resourceType: formData.resourceType,
        updatedAt: Timestamp.now(),
      };

      if (formData.externalUrl !== undefined) {
        updates.externalUrl = formData.externalUrl.trim();
      }

      // If a replacement file was supplied
      if (formData.file) {
        // Upload new file
        const timestamp = Date.now();
        const sanitizedName = formData.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const newStoragePath = `educational_materials/${timestamp}_${sanitizedName}`;
        const newFileRef = ref(storage, newStoragePath);

        await uploadBytes(newFileRef, formData.file);
        const newFileUrl = await getDownloadURL(newFileRef);

        updates.fileUrl = newFileUrl;
        updates.storagePath = newStoragePath;
        updates.fileName = formData.file.name;
        updates.fileSizeBytes = formData.file.size;

        // Clean up previous file if present
        if (existingStoragePath && existingStoragePath !== newStoragePath) {
          try {
            await deleteObject(ref(storage, existingStoragePath));
          } catch (delErr) {
            console.warn('Could not delete old storage file:', delErr);
          }
        }
      }

      await updateDoc(docRef, updates);
    },
    []
  );

  // Admin Mutations: Delete material with automated storage file cleanup
  const deleteMaterial = useCallback(
    async (id: string, storagePath?: string) => {
      // 1. Delete Firestore document
      const docRef = doc(db, 'educational_materials', id);
      await deleteDoc(docRef);

      // 2. Safely prune Storage object if it exists
      if (storagePath) {
        try {
          const fileRef = ref(storage, storagePath);
          await deleteObject(fileRef);
        } catch (err) {
          console.warn('Error deleting associated file from storage:', err);
        }
      }
    },
    []
  );

  return {
    materials,
    filteredMaterials,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedType,
    setSelectedType,
    addMaterial,
    updateMaterial,
    deleteMaterial,
  };
}
