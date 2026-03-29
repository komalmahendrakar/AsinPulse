'use server';

import { fetchAmazonProduct } from '@/lib/rainforest';

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

export async function syncAsin(asin: string, userId: string) {
  const cleanAsin = asin.trim().toUpperCase();
  console.log("[SYNC START] ASIN:", cleanAsin);
  try {
    const productData = await fetchAmazonProduct(cleanAsin);
    if (!productData) throw new Error("Amazon product not found.");
    return { 
      success: true,
      data: {
        title: productData.title,
        product_name: productData.title,
        price: productData.price,
        rating: productData.rating,
        reviews: productData.reviews,
        stock: productData.stock,
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message, data: null };
  }
}