'use server';

/**
 * @fileOverview RapidAPI Real-Time Amazon Data utility for fetching Indian product data.
 */

export interface AmazonProduct {
  title: string;
  price: number;
  rating: number;
  reviews: number;
  stock: string;
  sold_by: string;
  currency: string;
}

/**
 * Fetches product data from RapidAPI (real-time-amazon-data).
 * Optimized for Amazon India.
 */
export async function fetchAmazonProduct(asin: string): Promise<AmazonProduct | null> {
  const apiKey = process.env.RAPIDAPI_KEY;
  
  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY is not configured in environment variables.");
  }

  const url = `https://real-time-amazon-data.p.rapidapi.com/product-details?asin=${asin}&country=IN`;
  
  try {
    console.log(`[RapidAPI] Fetching ASIN: ${asin} for India market...`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'real-time-amazon-data.p.rapidapi.com',
        'x-rapidapi-key': apiKey
      },
      next: { revalidate: 0 } // Ensure live data
    });

    if (!response.ok) {
      throw new Error(`RapidAPI responded with status: ${response.status}`);
    }

    const json = await response.json();
    
    // Debug log the full response as requested
    console.log("RapidAPI response:", JSON.stringify(json, null, 2));

    if (json.status !== 'OK' || !json.data || Object.keys(json.data).length === 0) {
      throw new Error("Amazon product not found for this ASIN.");
    }

    const data = json.data;

    // Price parsing: Remove commas and non-numeric chars for the number field
    const rawPrice = data.product_price ? String(data.product_price).replace(/[^0-9.]/g, '') : "0";
    const numericPrice = parseFloat(rawPrice) || 0;

    // Sold By cleaning logic: "Visit the Apple Store" -> "Apple Store"
    let cleanedSoldBy = data.product_byline || "Amazon.in";
    if (cleanedSoldBy.startsWith("Visit the ")) {
      cleanedSoldBy = cleanedSoldBy.replace("Visit the ", "");
    }

    return {
      title: data.product_title || "Unknown Product",
      price: numericPrice,
      rating: parseFloat(data.product_star_rating) || 0,
      reviews: parseInt(data.product_num_ratings) || 0,
      stock: data.product_availability || "In Stock",
      sold_by: cleanedSoldBy,
      currency: "INR"
    };
  } catch (error: any) {
    console.error(`[RapidAPI Error] ASIN ${asin}:`, error.message);
    throw error;
  }
}
