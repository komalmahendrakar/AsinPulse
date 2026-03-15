'use server';

/**
 * @fileOverview Server Action for executing the ASIN synchronization with detailed debugging.
 */

import { db } from '@/firebase/config';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { fetchAmazonProduct } from '@/lib/rainforest';

/**
 * Validates a single ASIN before adding to catalog.
 */
export async function validateAsin(asin: string, userId: string) {
  const cleanAsin = asin.trim().toUpperCase();
  
  console.log("[VALIDATE] Checking Amazon for ASIN:", cleanAsin);

  try {
    const product = await fetchAmazonProduct(cleanAsin);
    if (!product) throw new Error("Amazon product not found for this ASIN.");
    return { success: true, product };
  } catch (error: any) {
    console.error("[VALIDATE ERROR]:", error.message);
    return { success: false, error: error.message || "Invalid ASIN or product not found on Amazon." };
  }
}

/**
 * Syncs a single ASIN for a user by fetching data from Rainforest API and updating Firestore.
 */
export async function syncAsin(asin: string, userId: string) {
  const cleanAsin = asin.trim().toUpperCase();
  console.log(`[SYNC START] ASIN: ${cleanAsin} | User: ${userId}`);

  try {
    // 1. Fetch live data from Amazon
    const productData = await fetchAmazonProduct(cleanAsin);
    
    if (!productData) {
      throw new Error("Amazon product not found for this ASIN.");
    }

    // 2. Locate the document in the user's catalog
    const asinsRef = collection(db, "asins");
    const q = query(asinsRef, where("asin_code", "==", cleanAsin), where("user_id", "==", userId));
    const querySnapshot = await getDocs(q);
    
    console.log(`[QUERY] Documents found for ${cleanAsin}:`, querySnapshot.size);

    if (querySnapshot.empty) {
      // Detailed debug log for troubleshooting
      const allUserAsins = await getDocs(query(asinsRef, where("user_id", "==", userId)));
      console.warn(`[SYNC FAIL] ASIN ${cleanAsin} not found for user ${userId}.`);
      console.warn(`[SYNC FAIL] Available ASINs for this user:`, allUserAsins.docs.map(d => d.data().asin_code));
      throw new Error("ASIN document not found in your catalog.");
    }

    const docId = querySnapshot.docs[0].id;
    const docRef = doc(db, "asins", docId);

    // 3. Update the document
    const updateData = {
      title: productData.title,
      product_name: productData.title,
      price: productData.price,
      rating: productData.rating,
      reviews: productData.reviews,
      stock: productData.stock,
      lastUpdated: serverTimestamp(),
      lastSyncedAt: serverTimestamp()
    };

    await updateDoc(docRef, updateData);

    console.log(`[SYNC SUCCESS] Updated ASIN: ${cleanAsin}`);

    return { success: true };
  } catch (error: any) {
    console.error(`[SYNC ERROR] ${cleanAsin}:`, error.message);
    return { success: false, error: error.message || "Failed to sync product data." };
  }
}
