import { JSDOM } from "jsdom";
import { ProcessHtmlRequest, ProcessHtmlResponse } from "../types";
import { processText } from "./text.service";
import { processImage } from "./image.service";

/**
 * Processes HTML content by rewriting text and generating images
 */
export const processHtml = async (
  request: ProcessHtmlRequest
): Promise<ProcessHtmlResponse> => {
  try {
    const startTime = Date.now();

    // Parse HTML
    const dom = new JSDOM(request.htmlContent);
    const document = dom.window.document;

    // Clean up unnecessary quotes in text nodes without modifying structure
    cleanQuotesInTextNodes(document);

    // Process text elements (headings, paragraphs, etc.)
    const textElements = document.querySelectorAll(
      "h1, h2, h3, h4, h5, h6, p, span, div:not(:has(*)), li, a:not(:has(*)), blockquote, cite"
    );
    let textElementsModified = 0;

    // Process images
    const images = document.querySelectorAll("img");
    let imagesModified = 0;

    // Process text elements in parallel
    const textPromises = Array.from(textElements).map(async (element) => {
      // Skip elements with no text content or very short content
      const originalText = element.textContent?.trim();
      if (!originalText || originalText.length < 10) return;

      // Skip elements that are likely navigation, footer, or other non-content areas
      const parentElement = element.parentElement;
      if (
        parentElement &&
        (parentElement.tagName.toLowerCase() === "nav" ||
          parentElement.tagName.toLowerCase() === "footer" ||
          parentElement.id.toLowerCase().includes("nav") ||
          parentElement.id.toLowerCase().includes("footer") ||
          parentElement.className.toLowerCase().includes("nav") ||
          parentElement.className.toLowerCase().includes("footer"))
      ) {
        return;
      }

      try {
        // Determine element type for context
        const elementType = element.tagName.toLowerCase();

        // Special handling for list items
        const isList = elementType === "li";
        const isInList =
          parentElement &&
          (parentElement.tagName.toLowerCase() === "ul" ||
            parentElement.tagName.toLowerCase() === "ol");

        // Get the list context if this is a list item
        let listContext = "";
        if (isList && isInList) {
          // Find the heading that precedes this list to provide context
          let currentNode = parentElement?.previousElementSibling;
          while (currentNode) {
            if (/^h[1-6]$/.test(currentNode.tagName.toLowerCase())) {
              listContext = currentNode.textContent || "";
              break;
            }
            currentNode = currentNode.previousElementSibling;
          }
        }

        const result = await processText({
          originalText,
          siteName: request.siteName,
          keywords: request.keywords,
          elementType,
          listContext: listContext || undefined,
          isList,
        });

        if (result.success && result.newText !== originalText) {
          // Preserve HTML structure by only replacing text content
          element.textContent = result.newText;
          textElementsModified++;
        }
      } catch (error) {
        console.error("Error processing text element:", error);
      }
    });

    // Extract page context for images
    const pageContext = extractPageContext(document, request.siteName, request.keywords);

    // Process images in parallel
    const imagePromises = Array.from(images).map(async (img) => {
      const src = img.getAttribute("src");
      const alt = img.getAttribute("alt") || "";

      if (!src) return;

      try {
        // Get image dimensions if available
        const width = img.getAttribute("width")
          ? parseInt(img.getAttribute("width") || "0", 10)
          : undefined;
        const height = img.getAttribute("height")
          ? parseInt(img.getAttribute("height") || "0", 10)
          : undefined;

        // Get surrounding context for this specific image
        const imageContext = extractImageContext(img);

        const result = await processImage({
          originalSrc: src,
          altText: alt,
          siteName: request.siteName,
          keywords: request.keywords,
          width,
          height,
          pageContext: imageContext || pageContext,
        });

        if (result.success && (result.newSrc || result.newImageUrl)) {
          img.setAttribute("src", result.newSrc || result.newImageUrl || src);
          imagesModified++;
        }
      } catch (error) {
        console.error("Error processing image:", error);
      }
    });

    // Wait for all processing to complete
    await Promise.all([...textPromises, ...imagePromises]);

    // Calculate processing time
    const processingTimeMs = Date.now() - startTime;

    // Prepare response
    const result: ProcessHtmlResponse = {
      success: true,
      modifiedHtml: dom.serialize(),
      stats: {
        textElementsModified,
        imagesModified,
        processingTimeMs,
      },
    };

    // Add warnings if some elements couldn't be processed
    if (
      (textElements.length > 0 && textElementsModified === 0) ||
      (images.length > 0 && imagesModified === 0)
    ) {
      result.warnings = [
        "Some elements could not be processed. This may be due to API limits or service issues.",
        "Check the stats to see which elements were modified.",
      ];
    }

    return result;
  } catch (error) {
    console.error("Error processing HTML:", error);
    return {
      success: false,
      modifiedHtml: request.htmlContent,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error occurred during HTML processing",
    };
  }
};

/**
 * Extract context from the page for image generation
 */
function extractPageContext(document: Document, siteName: string, keywords: string[]): string {
  let context = "";

  // Get the page title
  const title = document.querySelector("title")?.textContent;
  if (title) {
    context += title + ". ";
  }

  // Get main headings
  const h1 = document.querySelector("h1")?.textContent;
  if (h1) {
    context += h1 + ". ";
  }

  // Get meta description
  const metaDescription = document.querySelector("meta[name='description']")?.getAttribute("content");
  if (metaDescription) {
    context += metaDescription + ". ";
  }

  // If we still don't have much context, add the site name and keywords
  if (context.length < 20) {
    context += `${siteName} website focusing on ${keywords.join(", ")}.`;
  }

  return context.trim();
}

/**
 * Extract context specific to an image from surrounding elements
 */
function extractImageContext(img: Element): string {
  let context = "";

  // Check for caption
  const figcaption = img.closest("figure")?.querySelector("figcaption")?.textContent;
  if (figcaption) {
    context += figcaption + ". ";
  }

  // Check for parent heading
  let currentElement: Element | null = img;
  let heading: Element | null = null;

  // Look up the DOM tree for a heading
  while (currentElement && !heading) {
    currentElement = currentElement.parentElement;
    if (currentElement) {
      // Check if this element has a preceding heading sibling
      let sibling = currentElement.previousElementSibling;
      while (sibling && !heading) {
        if (/^h[1-6]$/.test(sibling.tagName.toLowerCase())) {
          heading = sibling;
          break;
        }
        sibling = sibling.previousElementSibling;
      }

      // If no heading found among siblings, check if the parent itself is a section with a heading
      if (!heading && currentElement.tagName.toLowerCase() === "section") {
        const sectionHeading = currentElement.querySelector("h1, h2, h3, h4, h5, h6");
        if (sectionHeading) {
          heading = sectionHeading;
        }
      }
    }
  }

  if (heading && heading.textContent) {
    context += heading.textContent + ". ";
  }

  // Get nearby paragraph text
  const nearbyParagraph = img.closest("div")?.querySelector("p")?.textContent;
  if (nearbyParagraph) {
    // Limit paragraph length to avoid too much context
    const limitedText = nearbyParagraph.length > 100
      ? nearbyParagraph.substring(0, 100) + "..."
      : nearbyParagraph;
    context += limitedText;
  }

  return context.trim();
}

/**
 * Recursively cleans quotes from all text nodes in the document
 * while preserving the HTML structure
 */
function cleanQuotesInTextNodes(node: Document | Element) {
  // Process all child nodes
  node.childNodes.forEach((child) => {
    // If this is a text node, clean it
    if (child.nodeType === 3) {
      // 3 = TEXT_NODE
      const text = child.textContent || "";
      if (text.includes('"')) {
        // Remove quotes that wrap entire text
        let cleanedText = text.replace(/^"([^"]+)"$/, "$1");

        // Remove double quotes around phrases
        cleanedText = cleanedText.replace(/""([^"]+)""/g, '"$1"');

        // Remove quotes around common heading patterns
        cleanedText = cleanedText.replace(/"([^"]+:)"/g, "$1");

        // Only update the text content, not the entire node
        child.textContent = cleanedText;
      }
    }
    // If this is an element node, process it recursively
    else if (child.nodeType === 1) {
      // 1 = ELEMENT_NODE
      // Skip processing for script and style elements
      const tagName = (child as Element).tagName.toLowerCase();
      if (tagName !== "script" && tagName !== "style") {
        cleanQuotesInTextNodes(child as Element);
      }
    }
  });
}
