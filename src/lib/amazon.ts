'use server';

/**
 * @fileOverview Rainforest API utility for fetching Amazon product data.
 */

export interface RainforestProductResponse {
  title: string;
  price: number;
  rating: number;
  reviews: number;
  stock: number;
  success: boolean;
}

/**
 * Fetches product data from Rainforest API.
 * Uses fallback values if the API fails or is unconfigured.
 */
export async function fetchRainforestData(asin: string): Promise<RainforestProductResponse> {
  const apiKey = process.env.RAINFOREST_API_KEY;
  
  if (!apiKey) {
    console.warn("RAINFOREST_API_KEY is not configured. Returning fallback data.");
    return {
      title: `Product ${asin} (No API Key)`,
      price: 0,
      rating: 0,
      reviews: 0,
      stock: 0,
      success: false
    };
  }

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      type: 'product',
      amazon_domain: 'amazon.com',
      asin: asin
    });

    const url = `https://api.rainforestapi.com/request?${params.toString()}`;
    const response = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour
    const data = await response.json();

    if (!data.product) {
      throw new Error(data.request_info?.message || "Product data missing in response.");
    }

    const product = data.product;
    
    return {
      title: product.title || "Unknown Product",
      price: product.buybox_winner?.price?.value || product.price?.value || 0,
      rating: product.rating || 0,
      reviews: product.ratings_total || product.reviews_count || 0,
      stock: product.inventory?.value || (product.availability?.raw === 'In Stock' ? 99 : 0),
      success: true
    };
  } catch (error) {
    console.error(`Rainforest API error for ASIN ${asin}:`, error);
    return {
      title: `Product ${asin} (Sync Error)`,
      price: 0,
      rating: 0,
      reviews: 0,
      stock: 0,
      success: false
    };
  }
}
