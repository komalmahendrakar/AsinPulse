'use server';

/**
 * @fileOverview Utility for fetching Amazon product data using the HasData API.
 */

export interface AmazonProduct {
  title: string;
  price: number;
  rating: number;
  reviews: number;
  stock: string;
}

/**
 * Fetches structured product data from HasData API.
 * Validates existence and maps specific Amazon performance metrics.
 */
export async function fetchAmazonProduct(asin: string): Promise<AmazonProduct | null> {
  const apiKey = process.env.HASDATA_API_KEY;
  
  if (!apiKey) {
    throw new Error("HASDATA_API_KEY is not configured in environment variables.");
  }

  // HasData Scraper API endpoint for Amazon products
  const url = `https://api.hasdata.com/scraper/amazon/product?asin=${asin}&domain=amazon.com`;
  
  console.log("Calling HasData API for ASIN:", asin);

  try {
    const response = await fetch(url, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      next: { revalidate: 0 }
    });
    
    if (!response.ok) {
      console.error(`HasData API request failed with status: ${response.status}`);
      throw new Error(`HasData API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Log full response for debugging
    console.log("HasData API response:", JSON.stringify(data, null, 2));

    // HasData structure: data.data typically contains the product details
    const product = data.data || data;

    if (!product || (!product.title && !product.name)) {
      console.error("Product data missing in HasData response");
      throw new Error("Amazon product not found for this ASIN.");
    }

    // Map fields safely to the application's internal AmazonProduct interface
    return {
      title: product.title || product.name || "Unknown Product",
      price: product.price?.value || (typeof product.price === 'number' ? product.price : 0),
      rating: product.rating || 0,
      reviews: product.reviews_count || product.ratings_total || product.reviewsCount || 0,
      stock: product.availability || product.availabilityStatus || "Unknown",
    };
  } catch (error: any) {
    console.error("HasData API integration error:", error.message);
    throw error;
  }
}
