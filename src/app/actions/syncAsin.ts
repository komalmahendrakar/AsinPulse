'use server';

/**
 * @fileOverview Server Action for executing the ASIN synchronization with logging.
 */

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { fetchAmazonProduct } from '@/lib/rainforest';

/**
 * Syncs a single ASIN for a user by fetching data from Rainforest API and updating Firestore.
 */
export async function syncAsin(asin: string, userId: string) {
  console.log("syncAsin action started for ASIN:", asin, "User:", userId);
  
  try {
    const productData = await fetchAmazonProduct(asin);
    
    if (!productData) {
      throw new Error("Amazon product not found for this ASIN.");
    }

    const asinsRef = collection(db, "asins");
    const q = query(asinsRef, where("user_id", "==", userId), where("asin_code", "==", asin));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("ASIN document not found in your catalog.");
    }

    const docId = querySnapshot.docs[0].id;
    const docRef = doc(db, "asins", docId);

    // Fields to store: price, rating, reviews, stock, title, lastSyncedAt
    const updateData = {
      title: productData.title,
      product_name: productData.title,
      price: productData.price,
      rating: productData.rating,
      reviews: productData.reviews,
      stock: productData.availability,
      lastUpdated: serverTimestamp(),
      lastSyncedAt: serverTimestamp()
    };

    await updateDoc(docRef, updateData);

    console.log("Firestore updated successfully for ASIN:", asin);

    return { success: true };
  } catch (error: any) {
    console.error(`syncAsin Pipeline Failure for ${asin}:`, error.message);
    return { success: false, error: error.message || "Failed to sync product data." };
  }
}
