'use server';

/**
 * @fileOverview HasData API utility for fetching Amazon product data.
 * Updated to keep consistent with the primary HasData integration.
 */

export interface HasDataProductResponse {
  title: string;
  price: number;
  rating: number;
  reviews: number;
  stock: string;
  success: boolean;
}

/**
 * Fetches product data from HasData API.
 */
export async function fetchRainforestData(asin: string): Promise<HasDataProductResponse> {
  const apiKey = process.env.HASDATA_API_KEY;
  
  if (!apiKey) {
    console.warn("HASDATA_API_KEY is not configured. Returning fallback data.");
    return {
      title: `Product ${asin} (No API Key)`,
      price: 0,
      rating: 0,
      reviews: 0,
      stock: "Unknown",
      success: false
    };
  }

  try {
    const url = `https://api.hasdata.com/scraper/amazon/product?asin=${asin}&domain=amazon.com`;
    const response = await fetch(url, { 
      headers: { 'x-api-key': apiKey },
      next: { revalidate: 3600 } 
    });
    
    const data = await response.json();
    const product = data.data || data;

    if (!product) {
      throw new Error("Product data missing in response.");
    }
    
    return {
      title: product.title || product.name || "Unknown Product",
      price: product.price?.value || (typeof product.price === 'number' ? product.price : 0),
      rating: product.rating || 0,
      reviews: product.reviews_count || product.ratings_total || 0,
      stock: product.availability || "Unknown",
      success: true
    };
  } catch (error) {
    console.error(`HasData API error for ASIN ${asin}:`, error);
    return {
      title: `Product ${asin} (Sync Error)`,
      price: 0,
      rating: 0,
      reviews: 0,
      stock: "Error",
      success: false
    };
  }
}
