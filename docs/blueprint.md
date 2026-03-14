# **App Name**: ASIN Pulse

## Core Features:

- ASIN Registration & Tracking: Users can securely register Amazon ASINs they wish to monitor. The platform will then begin collecting relevant performance data for these products.
- Performance Data Visualization: A dashboard to display key performance indicators (KPIs) such as sales rank, current pricing, and historical trends for all tracked ASINs in a clear, interactive format.
- Automated Sales Drop Detection: The system continuously monitors all registered ASINs to automatically identify significant drops in sales volume or performance metrics based on configurable or default thresholds.
- AI-Powered Root Cause Analysis Tool: An intelligent AI tool that analyzes detected sales drops and contextual data (e.g., historical patterns, market trends, competitive changes, limited public Amazon data) to suggest probable operational reasons or root causes.
- Email Alert System: Users receive automatic email notifications when a sales drop is detected for any of their monitored ASINs, including a summary of the AI-identified root cause.
- User Authentication & Authorization: Secure user signup, login, and profile management for accessing and configuring the ASIN Pulse platform, powered by Firebase Auth and storing user data in Cloud Firestore.

## Style Guidelines:

- The chosen palette reflects professionalism, deep analysis, and a modern, data-centric environment with a dark scheme to reduce eye strain. The primary color, a deep, muted indigo (#2929A3), conveys depth and technological sophistication. The background is a very dark, subtle blue-grey (#14141C), providing a calm foundation for data. An accent color of bright, clean sky blue (#4AB6F7) highlights key information, alerts, and interactive elements.
- Primary font: 'Inter' (sans-serif) for all text elements. This modern, highly legible typeface is chosen for its excellent readability across various text sizes, making it ideal for presenting complex data and dashboards clearly and concisely.
- Utilize a set of crisp, minimalist line icons that clearly communicate data statuses, alerts, and navigation actions, maintaining a professional and unobtrusive aesthetic.
- A dashboard-centric layout emphasizing clear data visualization and actionable insights. Information density will be balanced with adequate whitespace, presenting monitored ASINs in a tabular or card-based format with accessible detail views and historical performance charts.
- Implement subtle, functional animations for data loading, chart transitions, and alert notifications to enhance user experience without causing distraction, reinforcing the sense of an active, responsive monitoring system.