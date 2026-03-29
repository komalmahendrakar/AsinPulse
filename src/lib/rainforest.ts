'use server';

export interface AmazonProduct {
  title: string;
  price: number;
  rating: number;
  reviews: number;
  stock: string;
}

export async function fetchAmazonProduct(asin: string): Promise<AmazonProduct | null> {
  const apiKey = process.env.SCRAPER_API_KEY;
  
  if (!apiKey) {
    throw new Error("SCRAPER_API_KEY is not configured.");
  }

  const amazonUrl = `https://www.amazon.com/dp/${asin}`;
  const scraperUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(amazonUrl)}&country_code=us&render=false`;
  
  console.log("Fetching Amazon page for ASIN:", asin);

  const response = await fetch(scraperUrl, { next: { revalidate: 0 } });
  
  if (!response.ok) {
    throw new Error(`ScraperAPI request failed: ${response.status}`);
  }

  const html = await response.text();
  console.log("HTML length:", html.length);

  // Check if page loaded correctly
  if (html.length < 1000) {
    throw new Error("Amazon product not found for this ASIN.");
  }

  // Title - multiple patterns
  const titleMatch = 
    html.match(/id="productTitle"[^>]*>\s*([\s\S]+?)\s*<\/span>/) ||
    html.match(/"title":"([^"]+)"/) ||
    html.match(/<title>([^|<]+)/);
  
  // Price - multiple patterns  
  const priceMatch =
    html.match(/class="a-price-whole">([0-9,]+)</) ||
    html.match(/\$([0-9]+\.[0-9]{2})/) ||
    html.match(/"price":"?\$?([0-9.]+)"?/);

  // Rating
  const ratingMatch = 
    html.match(/([0-9.]+) out of 5 stars/) ||
    html.match(/"ratingScore":"([0-9.]+)"/);

  // Reviews
  const reviewsMatch = 
    html.match(/([0-9,]+) global ratings/) ||
    html.match(/([0-9,]+) ratings/) ||
    html.match(/"totalReviewCount":([0-9]+)/);

  // Stock
  const stockMatch =
    html.match(/id="availability"[\s\S]{0,200}<span[^>]*>\s*([^<]+)\s*</) ||
    html.match(/In Stock/) ;

  const title = titleMatch ? titleMatch[1].trim().substring(0, 200) : '';
  
  if (!title) {
    console.error("Could not parse title from HTML");
    throw new Error("Amazon product not found for this ASIN.");
  }

  const priceStr = priceMatch ? priceMatch[1].replace(/,/g, '') : '0';
  const price = parseFloat(priceStr) || 0;
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
  const reviewsStr = reviewsMatch ? reviewsMatch[1].replace(/,/g, '') : '0';
  const reviews = parseInt(reviewsStr) || 0;
  const stock = stockMatch ? (typeof stockMatch === 'string' ? 'In Stock' : stockMatch[1]?.trim() || 'In Stock') : 'Unknown';

  console.log("Parsed:", { title: title.substring(0,50), price, rating, reviews, stock });

  return { title, price, rating, reviews, stock };
}
