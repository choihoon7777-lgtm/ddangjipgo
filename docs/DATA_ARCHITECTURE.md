# DDANGJIPGO Data Architecture

## Core entities
USER → PROPERTY → PARCEL → EVENT → SOURCE → AI_ANALYSIS → CHANGE_SCORE → ALERT

## Rules
1. Raw source facts are immutable and separate from AI analysis.
2. Every event stores source agency, published date, fetched date, original URL/document identifier.
3. AI output stores confidence and rationale; never overwrites source facts.
4. Analyze deltas only. Cache normalized source records to control API/AI cost.
5. Parcel matching and surrounding-market analysis are separate pipelines.

## Planned tables
users, properties, parcels, property_parcels, watchlists, sources, raw_events, normalized_events, event_parcel_links, ai_analyses, change_scores, alerts, notification_deliveries, ingestion_runs.

## Initial ingestion order
1. MOLIT land transaction API
2. address/legal-dong normalization
3. municipal/national notices
4. permits/building administration where licensed API access permits
5. Onbid/public auction

Secrets belong in deployment environment variables and must never be committed.
