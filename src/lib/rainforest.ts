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

  // Correct request format using type=product instead of engine=amazon_product
  const url = `https://api.rainforestapi.com/request?api_key=${apiKey}&type=product&amazon_domain=amazon.com&asin=${asin}`;
  
  console.log("Calling Rainforest API for ASIN:", asin);

  try {
    const response = await fetch(url, { next: { revalidate: 0 } });
    const data = await response.json();

    // Debugging: Log the entire API response in the server console
    console.log("Rainforest response:", data);

    // Handle Rainforest API-level errors
    if (data.request_info && data.request_info.success === false) {
      console.error("Rainforest API error:", data.request_info.message);
      throw new Error(data.request_info.message || "Rainforest API request failed.");
    }

    // Check if product data exists
    if (!data.product) {
      console.error("Amazon product not found for this ASIN:", asin);
      throw new Error("Amazon product not found for this ASIN.");
    }

    const product = data.product;
    
    // Mapping logic as requested
    return {
      title: product.title || "Unknown Product",
      price: product.buybox_price?.value || product.buybox_winner?.price?.value || 0,
      rating: product.rating || 0,
      reviews: product.ratings_total || 0,
      stock: product.availability?.raw || "Unknown"
    };
  } catch (error: any) {
    console.error(`Exception in fetchAmazonProduct for ASIN ${asin}:`, error.message);
    throw error;
  }
}
