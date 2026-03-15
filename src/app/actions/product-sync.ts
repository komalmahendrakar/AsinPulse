
'use server';

/**
 * @fileOverview Server Action for fetching live Amazon product data via Rainforest API.
 */

import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;

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
 * Synchronizes live Amazon data for a single ASIN.
 */
export async function syncProductData(asin: string): Promise<ProductData | null> {
  if (!RAINFOREST_API_KEY) {
    console.error("RAINFOREST_API_KEY is not configured.");
    return null;
  }

  try {
    const url = `https://api.rainforestapi.com/request?api_key=${RAINFOREST_API_KEY}&type=product&amazon_domain=amazon.com&asin=${asin}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.product) {
      throw new Error(data.request_info?.message || "Product data not found in Rainforest response.");
    }

    const product = data.product;
    const price = product.buybox_winner?.price?.value || product.price?.value || 0;
    const rating = product.rating || 0;
    const reviews = product.ratings_total || product.reviews_count || 0;
    const stock = product.inventory?.value || (product.availability?.raw === 'In Stock' ? 99 : 0);
    const title = product.title || "Unknown Product";

    const productData: ProductData = {
      asin,
      title,
      price,
      rating,
      reviews,
      stock,
      lastUpdated: serverTimestamp(),
    };

    // Store in Firestore
    await setDoc(doc(db, "products", asin), productData, { merge: true });

    return productData;
  } catch (error) {
    console.error(`Failed to sync ASIN ${asin}:`, error);
    throw error;
  }
}
