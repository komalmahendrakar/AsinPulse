
'use server';

/**
 * @fileOverview Server Action for executing the ASIN monitoring sync securely.
 * This ensures that monitoring API keys and alert configurations remain on the server.
 * Tracks platform usage metrics daily.
 */

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc, increment } from 'firebase/firestore';

const MONITORING_API_KEY = process.env.MONITORING_API_KEY;

/**
 * Executes a secure sync batch for a set of ASINs.
 * Updates daily usage metrics upon completion.
 */
export async function executeSecureSyncBatch(userId: string, userEmail: string, asinBatch: any[]) {
  if (!MONITORING_API_KEY) {
    throw new Error("Configuration Error: Monitoring API Key is missing.");
  }

  const results = {
    processed: 0,
    alerts: 0,
    errors: 0
  };

  const todayDate = new Date().toISOString().split('T')[0];
  const metricsRef = doc(db, "usage_metrics", `${userId}_${todayDate}`);

  for (const asin of asinBatch) {
    try {
      // Simulate secure monitoring logic
      const isOutOfStock = Math.random() > 0.9;
      const basePrice = 124.99;
      
      const monitoringData = {
        user_id: userId,
        asin_code: asin.asin_code,
        timestamp: new Date(),
        price: basePrice,
        stock: isOutOfStock ? 0 : 50,
        buybox_owner: "Your Store",
        delivery_days: 2,
        rating: 4.8
      };

      // Create snapshot record
      await addDoc(collection(db, "monitoring_data"), monitoringData);

      // Detection logic
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
            subject: "Amazon Alert – ASIN Issue Detected",
            text: `ASIN: ${asin.asin_code}\nIssue: OUT_OF_STOCK\nSeverity: High`
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
