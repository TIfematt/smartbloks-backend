/**
 * Request payload for HTML processing
 */
export interface ProcessHtmlRequest {
  htmlContent: string;
  siteName: string;
  keywords: string[];
}

/**
 * Response for HTML processing
 */
export interface ProcessHtmlResponse {
  success: boolean;
  modifiedHtml: string;
  stats?: {
    textElementsModified: number;
    imagesModified: number;
    processingTimeMs: number;
  };
  warnings?: string[];
  error?: string;
}

/**
 * Configuration for AI services
 */
export interface AiServiceConfig {
  anthropicApiKey: string;
  imageGenerationApiKey: string;
  imageGenerationService: 'openai' | 'stability' | 'other';
}

/**
 * Image processing request
 */
export interface ImageProcessingRequest {
  originalSrc?: string;
  originalImageUrl?: string;
  altText?: string;
  alt?: string;
  siteName: string;
  keywords: string[];
  width?: number;
  height?: number;
  pageContext?: string; // Context from the page where the image appears
}

/**
 * Image processing result
 */
export interface ImageProcessingResult {
  newSrc?: string;
  newImageUrl?: string;
  success: boolean;
  error?: string;
}

/**
 * Text processing request
 */
export interface TextProcessingRequest {
  originalText: string;
  siteName: string;
  keywords: string[];
  elementType?: string; // e.g., 'p', 'h1', etc.
  listContext?: string; // Context for list items (e.g., heading text that precedes the list)
  isList?: boolean; // Whether this element is a list item
}

/**
 * Text processing result
 */
export interface TextProcessingResult {
  newText: string;
  success: boolean;
  error?: string;
} 