import Anthropic from "@anthropic-ai/sdk";

// Initialize Anthropic client using the environment variable specifically created for this app
// It uses ANTHROPIC_API_KEY_APP instead of the default ANTHROPIC_API_KEY to avoid conflicts
// with other development tools that might use the default key.
export const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY_APP,
});
