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
    // 1. Fetch data from Rainforest
    const productData = await fetchAmazonProduct(asin);
    
    if (!productData) {
      throw new Error("Amazon product data is unavailable.");
    }

    // 2. Find the user's monitored ASIN document
    const asinsRef = collection(db, "asins");
    const q = query(asinsRef, where("user_id", "==", userId), where("asin_code", "==", asin));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("ASIN document not found in your catalog.");
    }

    // 3. Update the document with fresh data
    const docId = querySnapshot.docs[0].id;
    const docRef = doc(db, "asins", docId);

    await updateDoc(docRef, {
      product_name: productData.title,
      price: productData.price,
      rating: productData.rating,
      reviews: productData.reviews,
      availability_raw: productData.stock,
      // Store numeric stock for internal tracking/charts
      stock: productData.stock.toLowerCase().includes('in stock') ? 99 : 0,
      lastUpdated: serverTimestamp()
    });

    console.log("Firestore updated successfully for ASIN:", asin);

    return { success: true };
  } catch (error: any) {
    console.error(`syncAsin Pipeline Failure for ${asin}:`, error.message);
    return { success: false, error: error.message || "Failed to sync product data." };
  }
}
