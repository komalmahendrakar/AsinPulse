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

  // Exact request format as requested: type=product and amazon_domain=amazon.com
  const url = `https://api.rainforestapi.com/request?api_key=${apiKey}&type=product&amazon_domain=amazon.com&asin=${asin}`;
  
  console.log("Calling Rainforest API for ASIN:", asin);

  try {
    const response = await fetch(url, { next: { revalidate: 0 } });
    const data = await response.json();

    // Log full API response for debugging as requested
    console.log("Rainforest API response:", JSON.stringify(data, null, 2));

    // Validation: Check both product and product_results
    const product = data.product || data.product_results;

    if (!product) {
      console.error("Amazon product not found for this ASIN:", asin);
      throw new Error("Amazon product not found for this ASIN.");
    }

    // Extract fields safely as requested
    // Mapping: price -> buybox_price.value, reviews -> ratings_total, stock -> availability.raw
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
