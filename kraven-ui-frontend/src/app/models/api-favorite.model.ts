/**
 * Represents a favorite API endpoint
 */
export interface ApiFavorite {
  id: string;
  path: string;
  method: string;
  methodType: string;
  title: string;
  tagName: string;
  createdAt: number;
  endpoint: any;
}
