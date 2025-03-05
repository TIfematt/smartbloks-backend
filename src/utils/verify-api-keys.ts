import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Verify that the OpenAI API key is set and working
 */
export async function verifyOpenAIKey(): Promise<boolean> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('OPENAI_API_KEY is not set in environment variables');
      return false;
    }
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey,
    });
    
    // Make a simple API call to verify the key works
    const response = await openai.models.list();
    
    if (response.data && response.data.length > 0) {
      console.log('OpenAI API key is valid. Available models:', response.data.length);
      return true;
    } else {
      console.error('OpenAI API key validation failed: No models returned');
      return false;
    }
  } catch (error) {
    console.error('OpenAI API key validation failed:', error);
    return false;
  }
}

/**
 * Verify that the Anthropic API key is set and working
 */
export async function verifyAnthropicKey(): Promise<boolean> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY is not set in environment variables');
      return false;
    }
    
    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey,
    });
    
    // Make a simple API call to verify the key works
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [
        { role: 'user', content: 'Say hello' }
      ],
    });
    
    if (response && response.content) {
      console.log('Anthropic API key is valid');
      return true;
    } else {
      console.error('Anthropic API key validation failed: No response content');
      return false;
    }
  } catch (error) {
    console.error('Anthropic API key validation failed:', error);
    return false;
  }
}

/**
 * Verify all API keys
 */
export async function verifyAllAPIKeys(): Promise<{
  openai: boolean;
  anthropic: boolean;
}> {
  const openaiValid = await verifyOpenAIKey();
  const anthropicValid = await verifyAnthropicKey();
  
  return {
    openai: openaiValid,
    anthropic: anthropicValid
  };
}

// If this file is run directly, verify all keys
if (require.main === module) {
  verifyAllAPIKeys().then(results => {
    console.log('API Key Verification Results:');
    console.log('OpenAI API Key:', results.openai ? 'Valid' : 'Invalid');
    console.log('Anthropic API Key:', results.anthropic ? 'Valid' : 'Invalid');
    
    if (!results.openai || !results.anthropic) {
      console.error('\nSome API keys are invalid or missing. Please check your .env file.');
      process.exit(1);
    } else {
      console.log('\nAll API keys are valid!');
      process.exit(0);
    }
  });
} 