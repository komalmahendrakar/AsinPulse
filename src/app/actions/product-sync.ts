'use server';

/**
 * @fileOverview Server Action for synchronizing product data and updating Firestore.
 */

import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { fetchRainforestData } from '@/lib/amazon';

export interface ProductData {
  asin: string;
  title: string;
  price: number;
  rating: number;
  reviews: number;
  stock: number;
  lastUpdated: any;
}

/**
 * Synchronizes live Amazon data for a single ASIN and updates relevant documents.
 */
export async function syncProductData(asin: string, userId?: string): Promise<ProductData | null> {
  try {
    const data = await fetchRainforestData(asin);
    
    const productData: ProductData = {
      asin,
      title: data.title,
      price: data.price,
      rating: data.rating,
      reviews: data.reviews,
      stock: data.stock,
      lastUpdated: serverTimestamp(),
    };

    // 1. Update Global Product Cache
    await setDoc(doc(db, "products", asin), productData, { merge: true });

    // 2. Update the specific Monitored ASIN document for the user
    if (userId) {
      const asinsRef = collection(db, "asins");
      const q = query(asinsRef, where("user_id", "==", userId), where("asin_code", "==", asin));
      const querySnapshot = await getDocs(q);
      
      const updatePromises = querySnapshot.docs.map(docSnap => 
        updateDoc(doc(db, "asins", docSnap.id), {
          product_name: data.title,
          price: data.price,
          rating: data.rating,
          reviews: data.reviews,
          stock: data.stock,
          lastUpdated: serverTimestamp()
        })
      );
      
      await Promise.all(updatePromises);
    }

    return productData;
  } catch (error) {
    console.error(`Failed to sync ASIN ${asin}:`, error);
    throw error;
  }
}
