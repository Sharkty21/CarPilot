/**
 * Types mirroring the auto.dev Vehicle Listings API response shape.
 * @see https://docs.auto.dev/v2/products/vehicle-listings#single-listing-object-structure
 */

export interface VehicleInfo {
  vin: string;
  squishVin?: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  drivetrain?: string;
  engine?: string;
  fuel?: string;
  transmission?: string;
  exteriorColor?: string;
  interiorColor?: string;
  bodyStyle?: string;
  cylinders?: number;
  doors?: number;
  seats?: number;
  confidence?: number;
}

export interface RetailListingInfo {
  vdp?: string;
  price: number;
  used: boolean;
  cpo: boolean;
  miles?: number;
  carfaxUrl?: string;
  dealer?: string;
  city?: string;
  state?: string;
  zip?: string;
  primaryImage?: string;
  photoCount?: number;
}

export interface WholesaleListingInfo {
  auction?: string;
  miles?: number;
}

export interface ListingHistory {
  accidents?: boolean;
  ownerCount?: number;
}

export interface Listing {
  "@id"?: string;
  vin: string;
  location?: [number, number];
  createdAt?: string;
  updatedAt?: string;
  vehicle: VehicleInfo;
  retailListing: RetailListingInfo | null;
  wholesaleListing: WholesaleListingInfo | null;
  history: ListingHistory | null;
}

export interface ListingsResponseLinks {
  self?: string;
  next?: string;
  prev?: string;
  first?: string;
  last?: string;
}

export interface ListingsResponse {
  data: Listing[];
  links?: ListingsResponseLinks;
  total?: number;
}
