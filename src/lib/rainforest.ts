'use server';

/**
 * @fileOverview Rainforest API utility for fetching Amazon product data with detailed debugging logs.
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
 * Includes detailed logging for debugging API integration.
 */
export async function fetchAmazonProduct(asin: string): Promise<AmazonProduct | null> {
  const apiKey = process.env.RAINFOREST_API_KEY;
  
  if (!apiKey) {
    console.error("RAINFOREST_API_KEY is not configured in environment variables.");
    throw new Error("Rainforest API key is missing. Please check your .env configuration.");
  }

  console.log("Calling Rainforest API for ASIN:", asin);

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      type: 'product',
      amazon_domain: 'amazon.com',
      asin: asin
    });

    const url = `https://api.rainforestapi.com/request?${params.toString()}`;
    console.log("Rainforest request started");

    const response = await fetch(url, { next: { revalidate: 0 } });
    const data = await response.json();

    // Log the actual response for debugging
    console.log("Rainforest response:", data);

    // Handle Rainforest API-level errors
    if (data.request_info && data.request_info.success === false) {
      console.error("Rainforest API error:", data);
      throw new Error(data.request_info.message || "Rainforest API request failed.");
    }

    if (!data.product) {
      console.error("Product data missing in Rainforest response");
      throw new Error("Amazon product not found for this ASIN.");
    }

    const product = data.product;
    
    // Normalize and return data as requested:
    // Extract: title, price (buybox), rating, ratings_total (reviews), and availability raw (stock)
    return {
      title: product.title || "Unknown Product",
      price: product.buybox_winner?.price?.value || product.price?.value || 0,
      rating: product.rating || 0,
      reviews: product.ratings_total || 0,
      stock: product.availability?.raw || "Unknown"
    };
  } catch (error: any) {
    console.error(`Exception in fetchAmazonProduct for ASIN ${asin}:`, error.message);
    throw error;
  }
}
