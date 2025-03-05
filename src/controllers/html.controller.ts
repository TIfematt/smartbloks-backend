import { Request, Response } from 'express';
import { processHtml } from '../services/html.service';
import { ProcessHtmlRequest } from '../types';

/**
 * HTML processing controller
 */
export const htmlController = {
  /**
   * Process HTML content
   * @param req Express request
   * @param res Express response
   */
  processHtml: async (req: Request, res: Response): Promise<void> => {
    try {
      const { htmlContent, siteName, keywords } = req.body as ProcessHtmlRequest;
      
      // Validate input
      if (!htmlContent) {
        res.status(400).json({
          success: false,
          message: 'HTML content is required'
        });
        return;
      }
      
      if (!siteName) {
        res.status(400).json({
          success: false,
          message: 'Site name is required'
        });
        return;
      }
      
      if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Keywords array is required and must not be empty'
        });
        return;
      }
      
      // Check if content is too large
      if (htmlContent.length > 1000000) { // 1MB limit
        res.status(400).json({
          success: false,
          message: 'HTML content is too large. Please limit to 1MB or less.'
        });
        return;
      }
      
      // Process HTML content
      const result = await processHtml({
        htmlContent,
        siteName,
        keywords
      });
      
      // Return the result
      if (result.success) {
        res.status(200).json({
          success: true,
          modifiedHtml: result.modifiedHtml,
          stats: result.stats,
          warnings: result.warnings
        });
      } else {
        // Handle processing failure
        res.status(500).json({
          success: false,
          message: 'Error processing HTML content',
          error: result.error || 'Unknown error occurred',
          suggestion: 'You may want to try again with fewer elements or check your API configuration.'
        });
      }
    } catch (error) {
      console.error('Error in HTML processing controller:', error);
      
      // Determine if it's a known error type
      let statusCode = 500;
      let errorMessage = 'Error processing HTML content';
      
      // Check for specific error types
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorMessage = 'AI service configuration error';
        } else if (error.message.includes('billing') || error.message.includes('limit')) {
          errorMessage = 'AI service usage limits reached';
        } else if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
          errorMessage = 'AI service connection error';
        }
      }
      
      res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'You may want to try again with fewer elements or check your API configuration.'
      });
    }
  }
}; 