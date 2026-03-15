'use server';

/**
 * @fileOverview Rainforest API utility for fetching Amazon product data.
 */

export interface AmazonProduct {
  title: string;
  price: number;
  rating: number;
  reviews: number;
  stock: string;
}

/**
 * Fetches real Amazon product data using the Rainforest API.
 */
export async function fetchAmazonProduct(asin: string): Promise<AmazonProduct | null> {
  const apiKey = process.env.RAINFOREST_API_KEY;
  
  if (!apiKey) {
    console.error("RAINFOREST_API_KEY is not configured.");
    return null;
  }

  console.log("Rainforest API called");

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      type: 'product',
      amazon_domain: 'amazon.com',
      asin: asin
    });

    const url = `https://api.rainforestapi.com/request?${params.toString()}`;
    const response = await fetch(url, { next: { revalidate: 0 } });
    const data = await response.json();

    if (!data.product) {
      console.error(`Rainforest API: No product data found for ASIN ${asin}`, data.request_info);
      return null;
    }

    const product = data.product;
    
    // Normalize data as requested
    return {
      title: product.title || "Unknown Product",
      price: product.buybox_winner?.price?.value || product.price?.value || 0,
      rating: product.rating || 0,
      reviews: product.ratings_total || 0,
      stock: product.availability?.raw || "Unknown"
    };
  } catch (error) {
    console.error(`Error in fetchAmazonProduct for ASIN ${asin}:`, error);
    return null;
  }
}
