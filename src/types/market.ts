/**
 * @fileoverview Market type definitions
 * @description Types for prediction markets, statuses, categories, and related data structures.
 * Uses `as const` objects instead of enums due to `erasableSyntaxOnly` in tsconfig.
 */

// Re-export types from indexer client for convenience
export type {
  Market as IndexerMarket,
  Prediction as IndexerPrediction,
  MarketFilters as IndexerMarketFilters,
} from '@heavymath/indexer_client';

/** String-based market status values matching the indexer API responses */
export type MarketStatusString =
  'Active' | 'Locked' | 'Resolved' | 'Cancelled' | 'Abandoned' | 'Refunded';

/**
 * Numeric market status values matching the smart contract.
 */
export const MarketStatus = {
  Active: 0,
  Cancelled: 1,
  Resolved: 2,
  Abandoned: 3,
  Locked: 4,
} as const;

/** Union type of all numeric market status values */
export type MarketStatus = (typeof MarketStatus)[keyof typeof MarketStatus];

/**
 * Convert a string-based market status to its numeric contract equivalent.
 *
 * @param status - The string status from the indexer API
 * @returns The numeric status matching the smart contract
 */
export function statusStringToNumber(status: MarketStatusString): MarketStatus {
  switch (status) {
    case 'Active':
      return MarketStatus.Active;
    case 'Locked':
      return MarketStatus.Locked;
    case 'Resolved':
      return MarketStatus.Resolved;
    case 'Cancelled':
    case 'Refunded':
      return MarketStatus.Cancelled;
    case 'Abandoned':
      return MarketStatus.Abandoned;
    default:
      return MarketStatus.Active;
  }
}

/** Sort options for the market list view */
export type MarketSortOption =
  'newest' | 'deadline' | 'poolSize' | 'mostActive';

/**
 * Data required to create a new prediction market via the smart contract.
 */
export interface CreateMarketData {
  /** Dealer NFT token ID authorizing market creation */
  tokenId: bigint;
  /** Market category number */
  category: number;
  /** Market sub-category number */
  subCategory: number;
  /** Human-readable market description */
  description: string;
  /** Market deadline (predictions close after this) */
  deadline: Date;
  /** Optional oracle ID for automatic resolution */
  oracleId?: `0x${string}`;
}

/**
 * Data required to place a prediction on a market.
 */
export interface PlacePredictionData {
  /** The market ID to predict on */
  marketId: bigint;
  /** Prediction percentage (0-100) */
  percentage: number;
  /** USDC amount to stake (6 decimal bigint) */
  amount: bigint;
}

/**
 * Data required to update an existing prediction.
 */
export interface UpdatePredictionData {
  /** The market ID of the existing prediction */
  marketId: bigint;
  /** New prediction percentage (0-100) */
  newPercentage: number;
  /** Additional USDC amount to add (6 decimal bigint, can be 0) */
  additionalAmount: bigint;
}

/**
 * Market category constants matching the smart contract.
 */
export const CATEGORIES = {
  SPORTS: '1',
  CRYPTO: '2',
  EVENTS: '3',
} as const;

/** Union type of all category values */
export type Category = (typeof CATEGORIES)[keyof typeof CATEGORIES];
