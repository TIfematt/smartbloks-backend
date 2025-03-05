import { TextProcessingRequest, TextProcessingResult } from "../types";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

dotenv.config();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

/**
 * Removes unnecessary quotes from text content
 * @param text The text to clean
 * @returns Text with unnecessary quotes removed
 */
const removeUnnecessaryQuotes = (text: string): string => {
  // Remove quotes that wrap entire headings or paragraphs
  // This regex looks for quotes at the beginning and end of a string
  text = text.replace(/^"([^"]+)"$/gm, "$1");

  // Remove double quotes around phrases that are already in quotes
  text = text.replace(/""([^"]+)""/g, '"$1"');

  // Remove quotes around common heading patterns
  text = text.replace(/"([^"]+:)"/g, "$1");

  // Remove quotes from the beginning of lines that don't have closing quotes
  text = text.replace(/^"([^"]+)$/gm, "$1");

  // Remove quotes from the end of lines that don't have opening quotes
  text = text.replace(/^([^"]+)"$/gm, "$1");

  return text;
};

/**
 * Process text content using Anthropic's Claude API
 */
export const processText = async (
  request: TextProcessingRequest
): Promise<TextProcessingResult> => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set in environment variables");
    }

    const {
      originalText,
      siteName,
      keywords,
      elementType = "text",
      listContext,
      isList,
    } = request;

    // Skip processing if text is very short or appears to be a non-content element
    if (
      originalText.trim().length < 5 ||
      /^[\s\r\n\t.,;:!?]*$/.test(originalText)
    ) {
      return {
        newText: originalText,
        success: true,
      };
    }

    // First clean the text by removing unnecessary quotes
    const cleanedText = removeUnnecessaryQuotes(originalText);

    // Create a prompt for Claude
    let prompt = `
    You are an expert content editor specializing in concise, direct writing.
    
    Original text:
    "${cleanedText}"
    
    Site name: ${siteName}
    Keywords: ${keywords.join(", ")}
    Element type: ${elementType}
    `;

    // Add list context if available
    if (isList && listContext) {
      prompt += `
    This text is a list item under the heading: "${listContext}"
    `;
    }

    // Add specific instructions for list items
    if (isList) {
      prompt += `
    Since this is a list item:
    1. Keep it concise and focused on a single service or feature
    2. Start with a strong action verb when appropriate
    3. Maintain parallel structure with other list items
    4. Ensure it clearly relates to the list heading context
    `;
    }

    // Add general rewriting instructions
    prompt += `
    Please rewrite this text to be:
    1. Much more concise and direct (reduce word count by 30-40%)
    2. Clear and straightforward with no fluff or filler words
    3. Incorporate keywords naturally but sparingly
    4. Align with the website's name and purpose
    5. Maintain the essential information and meaning
    6. Use active voice and simple language
    7. Do not add any additional formatting, HTML, or markdown
    8. Do not add quotation marks around headings or paragraphs
    
    Rewritten text:
    `;

    // Call Claude API with lower temperature for more focused output
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    // Extract the rewritten text from Claude's response
    const newText = response.content[0].text.trim();

    // Ensure the response doesn't have unnecessary quotes
    const finalText = removeUnnecessaryQuotes(newText);

    return {
      newText: finalText,
      success: true,
    };
  } catch (error) {
    console.error("Error processing text with Claude:", error);
    return {
      newText: request.originalText, // Return original text on error
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error occurred during text processing",
    };
  }
};
