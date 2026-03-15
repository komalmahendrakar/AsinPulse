'use server';

/**
 * @fileOverview Server Action for synchronizing product data and updating Firestore.
 */

import { db } from '@/firebase/config';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { fetchAmazonProduct } from '@/lib/rainforest';

export interface ProductSyncResult {
  asin: string;
  title: string;
  price: number;
  rating: number;
  reviews: number;
  stock: string;
}

/**
 * Synchronizes live Amazon data for a single ASIN and updates relevant documents.
 */
export async function syncProductData(asin: string, userId?: string): Promise<ProductSyncResult | null> {
  try {
    const product = await fetchAmazonProduct(asin);
    
    if (!product) {
      return null;
    }

    const syncResult: ProductSyncResult = {
      asin,
      title: product.title,
      price: product.price,
      rating: product.rating,
      reviews: product.reviews,
      stock: product.stock,
    };

    // 1. Update Global Product Cache
    await setDoc(doc(db, "products", asin), {
      ...syncResult,
      lastUpdated: serverTimestamp(),
      lastSyncedAt: serverTimestamp()
    }, { merge: true });

    // 2. Update the specific Monitored ASIN document for the user
    if (userId) {
      const asinsRef = collection(db, "asins");
      const q = query(asinsRef, where("user_id", "==", userId), where("asin_code", "==", asin));
      const querySnapshot = await getDocs(q);
      
      const updatePromises = querySnapshot.docs.map(docSnap => 
        updateDoc(doc(db, "asins", docSnap.id), {
          title: product.title,
          product_name: product.title,
          price: product.price,
          rating: product.rating,
          reviews: product.reviews,
          stock: product.stock,
          lastUpdated: serverTimestamp(),
          lastSyncedAt: serverTimestamp()
        })
      );
      
      await Promise.all(updatePromises);
    }

    return syncResult;
  } catch (error) {
    console.error(`Failed to sync ASIN ${asin}:`, error);
    throw error;
  }
}
