if (!process.env.REACT_APP_OPENAI_API_KEY) {
  throw new Error('REACT_APP_OPENAI_API_KEY is not set in environment variables');
}

if (!process.env.REACT_APP_SERPAPI_API_KEY) {
  throw new Error('REACT_APP_SERPAPI_API_KEY is not set in environment variables');
}

export const config = {
  openaiApiKey: process.env.REACT_APP_OPENAI_API_KEY,
  serpApiKey: process.env.REACT_APP_SERPAPI_API_KEY,
}; 