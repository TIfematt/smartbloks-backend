# SmartBloks HTML Processing API

A backend service built with Express and TypeScript for AI-powered HTML content processing.

## Overview

This API processes HTML webpages and modifies their content using Artificial Intelligence (AI). It can:

1. Rewrite text content to align with a site name and keywords
2. Generate or modify images based on the context of the site name and keywords
3. Return the modified HTML content with updated text and image links

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- API keys for:
  - Anthropic Claude (for text processing)
  - OpenAI DALL-E (for image processing)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd smartbloks
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the root directory with the following variables:
```
PORT=3000
NODE_ENV=development

# AI Service API Keys
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Optional Configuration
MAX_CONCURRENT_REQUESTS=5
REQUEST_TIMEOUT_MS=60000
```

## Development

To start the development server with hot-reloading:

```bash
npm run dev
# or
yarn dev
```

The server will be available at http://localhost:3000.

## API Endpoints

### Process HTML Content

```
POST /api/html/process
```

#### Request Body

```json
{
  "htmlContent": "<html>...</html>",
  "siteName": "Example Website",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}
```

#### Response

```json
{
  "success": true,
  "modifiedHtml": "<html>...</html>",
  "stats": {
    "textElementsModified": 10,
    "imagesModified": 5,
    "processingTimeMs": 2500
  }
}
```

## Building for Production

To build the project for production:

```bash
npm run build
# or
yarn build
```

This will create a `dist` directory with the compiled JavaScript files.

## Running in Production

To run the project in production mode:

```bash
npm run start
# or
yarn start
```

## Project Structure

```
smartbloks/
├── src/                  # Source files
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Express middleware
│   ├── models/           # Data models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   │   ├── html.service.ts    # HTML processing service
│   │   ├── text.service.ts    # Text processing with Anthropic
│   │   └── image.service.ts   # Image processing with DALL-E
│   ├── types/            # TypeScript type definitions
│   └── index.ts          # Application entry point
├── .env                  # Environment variables
├── .gitignore            # Git ignore file
├── package.json          # Project dependencies
├── tsconfig.json         # TypeScript configuration
└── README.md             # Project documentation
```

## License

ISC 