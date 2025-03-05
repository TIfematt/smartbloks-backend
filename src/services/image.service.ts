import { ImageProcessingRequest, ImageProcessingResult } from "../types";
import OpenAI from "openai";
import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// OpenAI error interface
interface OpenAIError {
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
}

/**
 * Download image from URL and save to local storage
 * @param imageUrl URL of the image to download
 * @returns Local URL of the saved image
 */
async function downloadAndSaveImage(imageUrl: string): Promise<string> {
  try {
    console.log("Downloading image from:", imageUrl);

    // Generate a unique filename
    const filename = `${uuidv4()}.png`;
    const publicDir = path.join(process.cwd(), "public", "images");
    const filePath = path.join(publicDir, filename);

    // Ensure directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Download image
    const response = await axios({
      method: "GET",
      url: imageUrl,
      responseType: "stream",
    });

    // Save the image to disk
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        console.log("Image saved to:", filePath);
        // Return the public URL
        const baseUrl =
          process.env.BASE_URL ||
          `http://localhost:${process.env.PORT || 3000}`;
        const publicUrl = `${baseUrl}/images/${filename}`;
        resolve(publicUrl);
      });
      writer.on("error", reject);
    });
  } catch (error) {
    console.error("Error downloading image:", error);
    throw error;
  }
}

/**
 * Process image using OpenAI's DALL-E API with fallback options
 * @param request Image processing request
 * @returns Processed image result
 */
export const processImage = async (
  request: ImageProcessingRequest
): Promise<ImageProcessingResult> => {
  try {
    // Check if API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set in environment variables");
      throw new Error("OPENAI_API_KEY is not set in environment variables");
    }

    console.log("Processing image with request:", {
      originalSrc: request.originalSrc || request.originalImageUrl,
      altText: request.altText || request.alt,
      siteName: request.siteName,
      keywords: request.keywords,
      hasPageContext: !!request.pageContext,
    });

    // Handle both naming conventions
    const originalSrc = request.originalSrc || request.originalImageUrl;
    const altText = request.altText || request.alt || "";
    const { siteName, keywords, width, height } = request;

    // Skip processing for certain image types
    if (originalSrc) {
      // Skip processing for SVG, GIF, or icon images
      if (
        originalSrc.match(/\.(svg|gif|ico)$/) ||
        originalSrc.includes("icon") ||
        originalSrc.includes("logo")
      ) {
        console.log(
          "Skipping processing for SVG, GIF, icon or logo image:",
          originalSrc
        );
        return {
          newSrc: originalSrc,
          newImageUrl: originalSrc,
          success: true,
          error: "Skipped processing for SVG, GIF, icon or logo image",
        };
      }

      // Skip processing for very small images (likely icons or decorative elements)
      if ((width && width < 100) || (height && height < 100)) {
        console.log("Skipping processing for small image:", originalSrc);
        return {
          newSrc: originalSrc,
          newImageUrl: originalSrc,
          success: true,
          error: "Skipped processing for small image",
        };
      }
    }

    // Extract context from surrounding elements if available
    let contextFromPage = "";
    if (request.pageContext) {
      contextFromPage = `The image appears on a page about: ${request.pageContext}. `;
    }

    // Create a prompt for DALL-E
    let prompt = `Create a professional, high-quality image for a website named "${siteName}" `;

    // Add keywords to the prompt
    if (keywords.length > 0) {
      prompt += `related to ${keywords.join(", ")}. `;
    }

    // Add context from alt text if available
    if (altText && altText.length > 0 && !altText.includes("placeholder")) {
      prompt += `The image should represent: ${altText}. `;
    } else if (originalSrc && !originalSrc.includes("placeholder")) {
      // Try to extract context from the original source if no alt text
      const srcParts = originalSrc
        .split("/")
        .pop()
        ?.split(".")[0]
        .replace(/[-_]/g, " ");
      if (srcParts && !srcParts.includes("placeholder")) {
        prompt += `The image should represent: ${srcParts}. `;
      }
    }

    // Add context from page if available
    prompt += contextFromPage;

    // Add style specifications
    prompt += `Make the image modern, professional, and visually appealing with a clean design. Ensure it aligns with a business website focused on ${keywords.join(
      ", "
    )}.`;

    console.log("Generated DALL-E prompt:", prompt);

    // Determine the size based on input or default to standard
    const size = determineImageSize(width, height);
    console.log("Using image size:", size);

    try {
      console.log("Calling OpenAI DALL-E API...");
      // Call DALL-E API
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size,
        quality: "standard",
        response_format: "url",
      });

      // Extract the image URL from the response
      const tempImageUrl = response.data[0]?.url;

      if (!tempImageUrl) {
        console.error("No image URL returned from OpenAI");
        throw new Error("No image URL returned from OpenAI");
      }

      console.log(
        "Successfully generated image with DALL-E, now downloading..."
      );

      // Download and save the image to make it permanently accessible
      const permanentImageUrl = await downloadAndSaveImage(tempImageUrl);

      console.log("Image saved and accessible at:", permanentImageUrl);

      return {
        newSrc: permanentImageUrl,
        newImageUrl: permanentImageUrl,
        success: true,
      };
    } catch (error) {
      console.error("OpenAI image generation failed:", error);

      // Cast error to OpenAIError type
      const openaiError = error as OpenAIError;
      const errorMessage =
        openaiError.message ||
        openaiError.error?.message ||
        "Unknown OpenAI error";

      // Check if it's a billing error
      if (
        errorMessage.includes("billing") ||
        errorMessage.includes("quota") ||
        errorMessage.includes("rate limit") ||
        openaiError.error?.code === "billing_hard_limit_reached"
      ) {
        console.log(
          "Billing limit or rate limit reached, using fallback image"
        );

        // If original source exists, is valid, and not a placeholder, use it
        if (
          originalSrc &&
          originalSrc.startsWith("http") &&
          !originalSrc.includes("placeholder")
        ) {
          console.log("Using original image as fallback:", originalSrc);
          return {
            newSrc: originalSrc,
            newImageUrl: originalSrc,
            success: true,
            error: "Used original image due to API limits: " + errorMessage,
          };
        } else {
          // Otherwise use a placeholder with appropriate dimensions and colors
          const placeholderImage = getPlaceholderImage(
            width || 800,
            height || 600,
            siteName,
            keywords
          );
          console.log(
            "Using generated placeholder as fallback:",
            placeholderImage
          );
          return {
            newSrc: placeholderImage,
            newImageUrl: placeholderImage,
            success: true,
            error: "Used placeholder image due to API limits: " + errorMessage,
          };
        }
      }

      // For other errors, rethrow
      throw error;
    }
  } catch (error) {
    console.error("Error processing image:", error);

    // Get original source from either property
    const originalSrc = request.originalSrc || request.originalImageUrl;

    // Final fallback - either use original source or placeholder
    if (
      originalSrc &&
      originalSrc.startsWith("http") &&
      !originalSrc.includes("placeholder")
    ) {
      console.log("Using original image after error:", originalSrc);
      return {
        newSrc: originalSrc,
        newImageUrl: originalSrc,
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error occurred during image processing",
      };
    } else {
      // Create a custom placeholder with the site's branding
      const placeholderImage = getPlaceholderImage(
        request.width || 800,
        request.height || 600,
        request.siteName,
        request.keywords
      );
      console.log("Using generated placeholder after error:", placeholderImage);
      return {
        newSrc: placeholderImage,
        newImageUrl: placeholderImage,
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error occurred during image processing",
      };
    }
  }
};

/**
 * Generate a placeholder image URL using a public service
 * @param width Image width
 * @param height Image height
 * @param siteName Site name for text
 * @param keywords Keywords for background color
 * @returns Placeholder image URL
 */
function getPlaceholderImage(
  width: number,
  height: number,
  siteName: string,
  keywords: string[]
): string {
  // Generate a background color based on keywords
  let bgColor = "0D8ABC"; // Default blue
  if (keywords && keywords.length > 0) {
    // Simple hash function to generate a color from the first keyword
    const keyword = keywords[0].toLowerCase();
    let hash = 0;
    for (let i = 0; i < keyword.length; i++) {
      hash = keyword.charCodeAt(i) + ((hash << 5) - hash);
    }
    bgColor = Math.abs(hash).toString(16).substring(0, 6).padEnd(6, "0");
  }

  // Generate text from site name
  const text = encodeURIComponent(siteName || "Image");

  // Use placeholder.com service
  return `https://via.placeholder.com/${width}x${height}/${bgColor}/FFFFFF?text=${text}`;
}

/**
 * Determine the appropriate image size based on width and height
 * @param width Image width
 * @param height Image height
 * @returns DALL-E compatible size string
 */
function determineImageSize(
  width?: number,
  height?: number
): "1024x1024" | "1792x1024" | "1024x1792" {
  if (!width || !height) {
    return "1024x1024"; // Default square
  }

  const ratio = width / height;

  if (ratio > 1.5) {
    return "1792x1024"; // Landscape
  } else if (ratio < 0.67) {
    return "1024x1792"; // Portrait
  } else {
    return "1024x1024"; // Square or near-square
  }
}
