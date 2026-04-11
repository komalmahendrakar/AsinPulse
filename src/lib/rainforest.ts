'use server';

/**
 * @fileOverview Utility for fetching Amazon product data using the Rainforest API.
 */

export interface AmazonProduct {
  title: string;
  price: number;
  rating: number;
  reviews: number;
  stock: string;
}

/**
 * Fetches structured product data from Rainforest API.
 * Validates existence and maps specific Amazon performance metrics.
 */
export async function fetchAmazonProduct(asin: string): Promise<AmazonProduct | null> {
  const apiKey = process.env.RAINFOREST_API_KEY;
  
  if (!apiKey) {
    throw new Error("RAINFOREST_API_KEY is not configured in environment variables.");
  }

  // Exact request format required by Rainforest API for product details
  const url = `https://api.rainforestapi.com/request?api_key=${apiKey}&type=product&amazon_domain=amazon.com&asin=${asin}`;
  
  console.log("Calling Rainforest API for ASIN:", asin);

  try {
    const response = await fetch(url, { next: { revalidate: 0 } });
    
    if (!response.ok) {
      console.error(`Rainforest API request failed with status: ${response.status}`);
      throw new Error(`Rainforest API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Log full response for debugging as requested in previous turns
    console.log("Rainforest API response:", JSON.stringify(data, null, 2));

    // Handle both product and product_results formats which Rainforest sometimes returns
    const product = data.product || data.product_results;

    if (!product) {
      console.error("Product data missing in Rainforest response");
      throw new Error("Amazon product not found for this ASIN.");
    }

    // Map fields safely to the application's internal AmazonProduct interface
    return {
      title: product.title || "Unknown Product",
      price: product.buybox_price?.value || product.price?.value || 0,
      rating: product.rating || 0,
      reviews: product.ratings_total || product.reviews_count || 0,
      stock: product.availability?.raw || "Unknown",
    };
  } catch (error: any) {
    console.error("Rainforest API integration error:", error.message);
    throw error;
  }
}
