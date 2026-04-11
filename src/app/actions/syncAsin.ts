'use server';

/**
 * @fileOverview Server Action for individual ASIN synchronization using RapidAPI.
 */

import { fetchAmazonProduct } from '@/lib/rainforest';

/**
 * Validates an ASIN exists on Amazon before adding.
 */
export async function validateAsin(asin: string, userId: string) {
  const cleanAsin = asin.trim().toUpperCase();
  try {
    const product = await fetchAmazonProduct(cleanAsin);
    if (!product) throw new Error("Amazon product not found for this ASIN.");
    return { success: true, product };
  } catch (error: any) {
    return { success: false, error: error.message, product: null };
  }
}

/**
 * Syncs the latest Amazon data for a monitored ASIN.
 */
export async function syncAsin(asin: string, userId: string) {
  const cleanAsin = asin.trim().toUpperCase();
  console.log("[SYNC START] ASIN:", cleanAsin, "User:", userId);
  
  try {
    const productData = await fetchAmazonProduct(cleanAsin);
    
    if (!productData) {
      throw new Error("Amazon product not found.");
    }

    return { 
      success: true,
      data: {
        title: productData.title,
        product_name: productData.title,
        price: productData.price,
        rating: productData.rating,
        reviews: productData.reviews,
        stock: productData.stock,
        sold_by: productData.sold_by,
        currency: "INR"
      }
    };
  } catch (error: any) {
    console.error("[SYNC ERROR]:", error.message);
    return { success: false, error: error.message, data: null };
  }
}
