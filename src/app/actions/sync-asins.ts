'use server';

/**
 * @fileOverview Server Action for executing the ASIN monitoring sync securely.
 */

import { db } from '@/firebase/config';
import { collection, addDoc, doc, setDoc, increment } from 'firebase/firestore';
import { syncProductData } from './product-sync';

/**
 * Executes a secure sync batch for a set of ASINs.
 * Updates daily usage metrics and creates monitoring snapshots.
 */
export async function executeSecureSyncBatch(userId: string, userEmail: string, asinBatch: any[]) {
  const results = {
    processed: 0,
    alerts: 0,
    errors: 0
  };

  const todayDate = new Date().toISOString().split('T')[0];
  const metricsRef = doc(db, "usage_metrics", `${userId}_${todayDate}`);

  for (const asin of asinBatch) {
    try {
      // Fetch data and update both global cache and user ASIN record
      const productData = await syncProductData(asin.asin_code, userId);
      
      if (!productData) {
        results.errors++;
        continue;
      }

      const monitoringData = {
        user_id: userId,
        asin_code: asin.asin_code,
        timestamp: new Date(),
        price: productData.price,
        stock: productData.stock,
        buybox_owner: "HasData API Sync",
        delivery_days: 0,
        rating: productData.rating,
        reviews: productData.reviews
      };

      // Create snapshot record for historical analysis
      await addDoc(collection(db, "monitoring_data"), monitoringData);

      // Detection logic: Out of Stock
      const isOutOfStock = productData.stock?.toLowerCase().includes('out of stock') || productData.stock === '0';
      
      if (isOutOfStock) {
        const alertData = {
          user_id: userId,
          asin_code: asin.asin_code,
          alert_type: "SALES_DROP",
          reason: "OUT_OF_STOCK",
          severity: "high",
          status: "active",
          timestamp: new Date(),
        };
        await addDoc(collection(db, "alerts"), alertData);
        
        // Queue Email via Trigger Email extension
        await addDoc(collection(db, "mail"), {
          to: userEmail,
          message: {
            subject: "Amazon Alert – ASIN Out of Stock",
            text: `ASIN: ${asin.asin_code}\nTitle: ${productData.title}\nIssue: OUT_OF_STOCK\nSeverity: High`
          }
        });
        results.alerts++;
      }
      
      results.processed++;
    } catch (e) {
      console.error(`Sync error for ASIN ${asin.asin_code}:`, e);
      results.errors++;
    }
  }

  // Update Daily Usage Metrics
  try {
    await setDoc(metricsRef, {
      user_id: userId,
      date: todayDate,
      number_of_asins_monitored: increment(results.processed),
      alerts_generated: increment(results.alerts),
      monitoring_runs: increment(1)
    }, { merge: true });
  } catch (metricsError) {
    console.error("Failed to update usage metrics:", metricsError);
  }

  return results;
}
