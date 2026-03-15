'use server';

/**
 * @fileOverview Server Action for executing the ASIN synchronization.
 */

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { fetchAmazonProduct } from '@/lib/rainforest';

/**
 * Syncs a single ASIN for a user by fetching data from Rainforest API and updating Firestore.
 */
export async function syncAsin(asin: string, userId: string) {
  try {
    // 1. Fetch data from Rainforest
    const productData = await fetchAmazonProduct(asin);
    
    if (!productData) {
      throw new Error("Could not retrieve data from Amazon.");
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

    console.log("Firestore updated");

    return { success: true };
  } catch (error: any) {
    console.error(`Sync Action Error for ${asin}:`, error);
    return { success: false, error: error.message || "Failed to sync product data." };
  }
}
