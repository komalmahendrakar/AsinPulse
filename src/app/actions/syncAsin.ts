'use server';

/**
 * @fileOverview Server Action for executing the ASIN synchronization with detailed debugging.
 */

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { fetchAmazonProduct } from '@/lib/rainforest';

/**
 * Validates a single ASIN before adding to catalog.
 */
export async function validateAsin(asin: string, userId: string) {
  const cleanAsin = asin.trim().toUpperCase();
  
  console.log("=== VALIDATE ASIN DEBUG ===");
  console.log("API Key present:", !!process.env.RAINFOREST_API_KEY);
  console.log("Clean ASIN:", cleanAsin);

  try {
    const product = await fetchAmazonProduct(cleanAsin);
    if (!product) throw new Error("Amazon product not found for this ASIN.");
    return { success: true, product };
  } catch (error: any) {
    console.error("Validation Error:", error.message);
    return { success: false, error: error.message || "Invalid ASIN or product not found on Amazon." };
  }
}

/**
 * Syncs a single ASIN for a user by fetching data from Rainforest API and updating Firestore.
 * Search logic refined to ensure exact match and ownership verification.
 */
export async function syncAsin(asin: string, userId: string) {
  const cleanAsin = asin.trim().toUpperCase();
  console.log("=== SYNC ASIN PIPELINE STARTED ===");
  console.log("Searching for ASIN:", cleanAsin, "UserID:", userId);

  try {
    const productData = await fetchAmazonProduct(cleanAsin);
    
    if (!productData) {
      throw new Error("Amazon product not found for this ASIN.");
    }

    const asinsRef = collection(db, "asins");
    // Explicitly query for the document matching both ASIN and UserID
    const q = query(asinsRef, where("asin_code", "==", cleanAsin), where("user_id", "==", userId));
    const querySnapshot = await getDocs(q);
    
    console.log("Documents found in Firestore:", querySnapshot.size);

    if (querySnapshot.empty) {
      // For debugging: Let's see if the user has ANY asins
      const allDocs = await getDocs(query(asinsRef, where("user_id", "==", userId)));
      console.log("All ASINs for user in database:", allDocs.docs.map(d => d.data().asin_code));
      console.warn(`ASIN ${cleanAsin} not found for user ${userId}. Check if the document exists or if there's a typo.`);
      throw new Error("ASIN document not found in your catalog.");
    }

    const docId = querySnapshot.docs[0].id;
    const docRef = doc(db, "asins", docId);

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

    console.log("Firestore updated successfully for ASIN:", cleanAsin);
    console.log("Update payload summary:", { title: updateData.title, price: updateData.price });

    return { success: true };
  } catch (error: any) {
    console.error(`syncAsin Pipeline Failure for ${cleanAsin}:`, error.message);
    return { success: false, error: error.message || "Failed to sync product data." };
  }
}
