// Load environment variables from both .env and .env.local
require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { OpenAI } = require('openai');
const path = require('path');
const cheerio = require('cheerio');

// Debug: Log all environment variables (excluding values)
console.log('Available environment variables:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')));

// Debug: Log the actual values (first few characters) of the API keys
console.log('API Keys found:', {
  openai: process.env.REACT_APP_OPENAI_API_KEY ? `${process.env.REACT_APP_OPENAI_API_KEY.substring(0, 4)}...` : 'not found',
  serpapi: process.env.REACT_APP_SERPAPI_API_KEY ? `${process.env.REACT_APP_SERPAPI_API_KEY.substring(0, 4)}...` : 'not found'
});

const app = express();
app.use(cors());
app.use(express.json());

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// Helper function to extract LinkedIn profile image
async function getLinkedInProfileImage(profileUrl) {
  try {
    const response = await axios.get(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(response.data);
    const imageUrl = $('.pv-top-card-profile-picture__image').attr('src') || 
                    $('.profile-photo-edit__preview').attr('src');
    return imageUrl;
  } catch (error) {
    console.error('Error fetching LinkedIn profile image:', error);
    return null;
  }
}

// Helper function to scrape company website
async function scrapeCompanyWebsite(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(response.data);
    
    // Remove script and style elements
    $('script').remove();
    $('style').remove();
    
    // Extract relevant sections
    const content = {
      title: $('title').text(),
      description: $('meta[name="description"]').attr('content'),
      about: $('section:contains("About"), div:contains("About"), section:contains("Who We Are"), div:contains("Who We Are")').text(),
      mission: $('section:contains("Mission"), div:contains("Mission"), section:contains("Vision"), div:contains("Vision")').text(),
      team: $('section:contains("Team"), div:contains("Team"), section:contains("Leadership"), div:contains("Leadership")').text(),
      contact: $('section:contains("Contact"), div:contains("Contact"), section:contains("Location"), div:contains("Location")').text(),
      // Get all text content for AI processing
      fullText: $('body').text().replace(/\s+/g, ' ').trim()
    };

    return content;
  } catch (error) {
    console.error('Error scraping company website:', error);
    return null;
  }
}

// Add proxy endpoint for company logos
app.get('/api/logo', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const response = await axios.get(url, {
      responseType: 'arraybuffer'
    });

    res.set('Content-Type', response.headers['content-type']);
    res.send(response.data);
  } catch (error) {
    console.error('Error proxying logo:', error);
    res.status(500).json({ error: 'Failed to fetch logo' });
  }
});

// Update getCompanyLogo function to return the proxied URL
async function getCompanyLogo(companyName) {
  try {
    console.log(`Fetching logo for ${companyName} from Clearbit`);
    const clearbitUrl = `https://logo.clearbit.com/${companyName.toLowerCase().replace(/\s+/g, '')}.com`;
    
    // Verify the logo exists by making a HEAD request
    const response = await axios.head(clearbitUrl);
    if (response.status === 200) {
      // Return the proxied URL instead of the direct Clearbit URL
      const proxiedUrl = `http://localhost:3001/api/logo?url=${encodeURIComponent(clearbitUrl)}`;
      console.log(`Found logo URL: ${proxiedUrl}`);
      return proxiedUrl;
    }
    return null;
  } catch (error) {
    console.error('Error fetching company logo:', error);
    return null;
  }
}

// Update the system prompts to ensure consistent data format
const SYSTEM_PROMPTS = {
  basic: `You are a company information expert. Extract and structure the following information from the search results:
- Official company name
- Website URL
- Industry
- Founded year
- Headquarters location
- Brief description
- Company size

Return ONLY a JSON object with these exact keys. If information is not available, use null for that field. Do not include any markdown formatting or additional text.`,
  
  executives: `You are a company executive information expert. Extract information about company executives from the search results.
Return ONLY a JSON array of objects, where each object has these exact keys:
- name
- title
- bio
- linkedin_url

If information is not available for a field, use null. Do not include any markdown formatting or additional text.`,
  
  background: `You are a company background expert. Extract the following information from the search results:
- Company history (provide a detailed timeline of the company's development)
- Recent news (summarize the most recent significant developments)
- Key milestones (list major achievements and turning points)
- Market position (describe the company's current market standing)
- Competitive landscape (analyze the company's position relative to competitors)

Return ONLY a JSON object with these exact keys. If information is not available, use null for that field. Do not include any markdown formatting or additional text.`
};

// Update the processWithAI function to ensure consistent data format
async function processWithAI(data, type) {
  try {
    console.log(`Processing ${type} data with AI...`);
    const systemPrompt = SYSTEM_PROMPTS[type];
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(data) }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const response = completion.choices[0].message.content;
    console.log(`Raw AI Response for ${type}:`, response);

    // Clean the response to ensure it's valid JSON
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.slice(7);
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }
    cleanedResponse = cleanedResponse.trim();

    // Parse and validate the JSON
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedResponse);
      console.log(`Parsed ${type} data:`, parsedData);
      
      // Validate the data structure
      if (type === 'basic') {
        const requiredKeys = ['Official company name', 'Website URL', 'Industry', 'Founded year', 'Headquarters location', 'Brief description', 'Company size'];
        for (const key of requiredKeys) {
          if (!(key in parsedData)) {
            parsedData[key] = null;
          }
        }
      } else if (type === 'executives') {
        if (!Array.isArray(parsedData)) {
          parsedData = [];
        }
        parsedData = parsedData.map(exec => ({
          name: exec.name || null,
          title: exec.title || null,
          bio: exec.bio || null,
          linkedin_url: exec.linkedin_url || null
        }));
      } else if (type === 'background') {
        const requiredKeys = ['Company history', 'Recent news', 'Key milestones', 'Market position', 'Competitive landscape'];
        for (const key of requiredKeys) {
          if (!(key in parsedData)) {
            parsedData[key] = null;
          }
        }
      }
      
      console.log(`Validated ${type} data:`, parsedData);
      return parsedData;
    } catch (error) {
      console.error(`Error parsing ${type} data:`, error);
      throw new Error(`Invalid JSON response for ${type}`);
    }
  } catch (error) {
    console.error(`Error in processWithAI for ${type}:`, error);
    throw error;
  }
}

// Updated search endpoint that includes AI processing
app.post('/api/search', async (req, res) => {
  try {
    const { query, type } = req.body;
    console.log(`Processing ${type} search for: ${query}`);
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const serpApiKey = process.env.REACT_APP_SERPAPI_API_KEY;
    if (!serpApiKey) {
      console.error('SerpAPI key is missing');
      return res.status(500).json({ error: 'SerpAPI key is not configured' });
    }

    // Get search results from multiple sources
    console.log('Fetching search results...');
    const searchPromises = [
      // Google search
      axios.get('https://serpapi.com/search', {
        params: {
          api_key: serpApiKey,
          q: query,
          engine: 'google',
          num: 10
        }
      }),
      // News search
      axios.get('https://serpapi.com/search', {
        params: {
          api_key: serpApiKey,
          q: `${query} news`,
          engine: 'google',
          num: 5
        }
      }),
      // LinkedIn specific search
      axios.get('https://serpapi.com/search', {
        params: {
          api_key: serpApiKey,
          q: `${query} site:linkedin.com`,
          engine: 'google',
          num: 5
        }
      })
    ];

    const [googleResults, newsResults, linkedinResults] = await Promise.all(searchPromises);
    console.log(`Found ${googleResults.data.organic_results?.length || 0} Google results`);
    console.log(`Found ${newsResults.data.organic_results?.length || 0} news results`);
    console.log(`Found ${linkedinResults.data.organic_results?.length || 0} LinkedIn results`);

    // Combine and deduplicate results
    const allResults = [
      ...(googleResults.data.organic_results || []),
      ...(newsResults.data.organic_results || []),
      ...(linkedinResults.data.organic_results || [])
    ];
    console.log(`Total unique results: ${allResults.length}`);

    // Find company website from search results
    let websiteContent = null;
    const companyWebsite = allResults.find(result => 
      result.link && 
      !result.link.includes('linkedin.com') && 
      !result.link.includes('facebook.com') &&
      !result.link.includes('twitter.com')
    );

    if (companyWebsite) {
      console.log(`Found company website: ${companyWebsite.link}`);
      try {
        websiteContent = await scrapeCompanyWebsite(companyWebsite.link);
        console.log('Successfully scraped website content');
      } catch (error) {
        console.error('Error scraping company website:', error);
      }
    } else {
      console.log('No company website found in search results');
    }

    // Process the results based on the type of information requested
    console.log(`Processing ${type} information with AI...`);
    let processedResult = await processWithAI(allResults, type);
    console.log('AI processing complete');

    // If we have executive data and LinkedIn URLs, try to get profile images
    if (type === 'executives') {
      try {
        const executives = processedResult;
        console.log(`Found ${executives.length} executives`);
        for (const exec of executives) {
          if (exec.linkedin_url) {
            console.log(`Fetching profile image for ${exec.name}`);
            exec.profileImage = await getLinkedInProfileImage(exec.linkedin_url);
          }
        }
      } catch (error) {
        console.error('Error processing executive images:', error);
      }
    }

    // If this is basic info, try to get the company logo
    if (type === 'basic') {
      try {
        const logoUrl = await getCompanyLogo(query);
        if (logoUrl) {
          processedResult.logo = logoUrl;
        }
      } catch (error) {
        console.error('Error fetching company logo:', error);
      }
    }

    // Log the final processed result
    console.log(`Final processed result for ${type}:`, processedResult);

    res.json({
      results: allResults,
      processed: processedResult,
      websiteContent: websiteContent
    });
  } catch (error) {
    console.error('Error in /api/search:', error);
    res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment variables loaded:', {
    hasSerpApiKey: !!process.env.REACT_APP_SERPAPI_API_KEY,
    hasOpenAiKey: !!process.env.REACT_APP_OPENAI_API_KEY,
    serpApiKeyLength: process.env.REACT_APP_SERPAPI_API_KEY?.length
  });
}); 