import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { DynamicTool } from "langchain/tools";
import { companyDB } from './companyDatabase';
import { config } from '../config';
import { ChatPromptTemplate } from "@langchain/core/prompts";

// Define the return type for our enrichment function
export interface CompanyField {
  value: string;
  source?: string;
  confidence?: string;
  reasoning?: string;
}

export interface CompanyEnrichment {
  name: CompanyField;
  website: CompanyField;
  description: CompanyField;
  industry: CompanyField;
  founded: CompanyField;
  headquarters: CompanyField;
  employees: CompanyField;
  revenue: CompanyField;
  reasoningSteps?: string[];
  serpResults?: any[];
  fromCache?: boolean;
}

export interface EnrichmentResult {
  data: CompanyEnrichment;
  reasoningSteps: string[];
  fromCache?: boolean;
}

// Initialize the model
const model = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 0,
  openAIApiKey: config.openaiApiKey,
  streaming: false,
}) as any; // Type assertion to bypass the type mismatch temporarily

// Function to call our backend search endpoint
async function searchCompany(query: string) {
  try {
    console.log('Making search request to backend:', query);
    const response = await fetch(`http://localhost:3001/api/search?query=${encodeURIComponent(query)}`);
    console.log('Search response status:', response.status);
    
    const data = await response.json();
    console.log('Search response data:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch search results');
    }
    
    // Truncate search results to reduce token usage
    const truncatedResults = data.organic_results?.slice(0, 3) || [];
    console.log('Truncated results:', JSON.stringify(truncatedResults, null, 2));
    return truncatedResults;
  } catch (error: any) {
    console.error('Search error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch search results');
  }
}

// Create tools for the agent
const tools = [
  new DynamicTool({
    name: "search_company_basic",
    description: "Search for basic information about a company using Google search results",
    func: async (query: string) => {
      console.log(`🔍 Searching for basic company info: ${query}`);
      try {
        const results = await searchCompany(`${query} company official website about us`);
        console.log(`📊 Found ${results.length} basic results:`, JSON.stringify(results, null, 2));
        
        // Format results with more detail
        const formattedResults = results.map((r: any, i: number) => ({
          title: r.title,
          link: r.link,
          snippet: r.snippet,
          position: i + 1
        }));

        return JSON.stringify({
          reasoning: `Searched for basic company information using query: "${query} company official website about us"
Found ${results.length} relevant results. Key sources:
${results.map((r: any, i: number) => `- ${r.title} (${r.link})`).join('\n')}`,
          results: formattedResults
        });
      } catch (error: any) {
        console.error('Error in search_company_basic:', error);
        throw error;
      }
    },
  }),
  new DynamicTool({
    name: "search_company_details",
    description: "Search for specific details about a company like founding date, headquarters, etc.",
    func: async (query: string) => {
      console.log(`🔍 Searching for detailed company info: ${query}`);
      try {
        // Try multiple search queries to find different types of information
        const queries = [
          `${query} company revenue annual financial report`,
          `${query} company employees headcount workforce`,
          `${query} company founded history headquarters location`,
          `${query} company industry sector business`
        ];
        
        const allResults = await Promise.all(queries.map(q => searchCompany(q)));
        const results = allResults.flat();
        console.log(`📊 Found ${results.length} detailed results:`, JSON.stringify(results, null, 2));
        
        // Format results with more detail
        const formattedResults = results.map((r: any, i: number) => ({
          title: r.title,
          link: r.link,
          snippet: r.snippet,
          position: i + 1
        }));

        return JSON.stringify({
          reasoning: `Searched for detailed company information using multiple queries:
${queries.map(q => `- "${q}"`).join('\n')}
Found ${results.length} relevant results across all searches. Key sources:
${results.map((r: any, i: number) => `- ${r.title} (${r.link})`).join('\n')}`,
          results: formattedResults
        });
      } catch (error: any) {
        console.error('Error in search_company_details:', error);
        throw error;
      }
    },
  }),
  new DynamicTool({
    name: "verify_company_info",
    description: "Verify and extract structured information about a company from search results",
    func: async (input: string) => {
      console.log('🔍 Verifying company information...');
      const prompt = `You are a company information verification expert. Your task is to extract and verify company information from search results.

VERIFICATION RULES:
1. For each piece of information, you MUST:
   - Verify the source is reliable
   - Cross-reference multiple sources when possible
   - Assign a confidence level based on these strict criteria:
     * HIGH: Information from official company website, SEC filings, or company press releases
     * MEDIUM: Information from reputable business databases (Crunchbase, Bloomberg) or major news outlets
     * LOW: Information from unverified sources or with conflicting data

2. For each field, provide:
   - value: The verified information
   - source: The URL or reference of the most reliable source
   - confidence: The confidence level (High/Medium/Low)
   - reasoning: A brief explanation of why this information was selected and its confidence level

3. If information cannot be verified with at least Medium confidence, mark it as Low confidence.

4. IMPORTANT: Always return a complete JSON object with ALL fields, even if some information is not found. Use empty strings for missing values.

5. For financial information (revenue, employees):
   - Look for annual reports, SEC filings, or official company statements
   - If exact numbers aren't available, look for ranges or recent estimates
   - Always cite the source and year of the information

Return ONLY a valid JSON object with these fields:
{
  "name": { "value": "string", "source": "string", "confidence": "High/Medium/Low", "reasoning": "string" },
  "website": { "value": "string", "source": "string", "confidence": "High/Medium/Low", "reasoning": "string" },
  "description": { "value": "string", "source": "string", "confidence": "High/Medium/Low", "reasoning": "string" },
  "industry": { "value": "string", "source": "string", "confidence": "High/Medium/Low", "reasoning": "string" },
  "founded": { "value": "string", "source": "string", "confidence": "High/Medium/Low", "reasoning": "string" },
  "headquarters": { "value": "string", "source": "string", "confidence": "High/Medium/Low", "reasoning": "string" },
  "employees": { "value": "string", "source": "string", "confidence": "High/Medium/Low", "reasoning": "string" },
  "revenue": { "value": "string", "source": "string", "confidence": "High/Medium/Low", "reasoning": "string" }
}

Search Results:
${input}`;
      
      try {
        const result = await model.invoke(prompt);
        console.log('Raw model response:', result);
        
        let content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
        console.log('Processed content:', content);
        
        // Try to extract JSON if it's wrapped in other text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          content = jsonMatch[0];
        }
        
        // Validate the JSON structure
        const parsed = JSON.parse(content);
        
        // Ensure all required fields exist with proper structure
        const requiredFields = ['name', 'website', 'description', 'industry', 'founded', 'headquarters', 'employees', 'revenue'];
        const missingFields = requiredFields.filter(field => !parsed[field]);
        
        if (missingFields.length > 0) {
          console.error('Missing required fields:', missingFields);
          // Add missing fields with default values
          missingFields.forEach(field => {
            parsed[field] = {
              value: '',
              source: '',
              confidence: 'Low',
              reasoning: 'No information found from reliable sources'
            };
          });
        }
        
        return JSON.stringify(parsed);
      } catch (error: any) {
        console.error('Verification error:', error);
        // Return a default structure with empty values
        const defaultResponse = {
          name: { value: '', source: '', confidence: 'Low', reasoning: 'Error during verification' },
          website: { value: '', source: '', confidence: 'Low', reasoning: 'Error during verification' },
          description: { value: '', source: '', confidence: 'Low', reasoning: 'Error during verification' },
          industry: { value: '', source: '', confidence: 'Low', reasoning: 'Error during verification' },
          founded: { value: '', source: '', confidence: 'Low', reasoning: 'Error during verification' },
          headquarters: { value: '', source: '', confidence: 'Low', reasoning: 'Error during verification' },
          employees: { value: '', source: '', confidence: 'Low', reasoning: 'Error during verification' },
          revenue: { value: '', source: '', confidence: 'Low', reasoning: 'Error during verification' }
        };
        return JSON.stringify(defaultResponse);
      }
    },
  }),
];

// Create the agent prompt
const prompt = ChatPromptTemplate.fromMessages([
  ["system", `You are an AI assistant specialized in gathering and verifying company information. Your primary goal is accuracy and reliability.

Follow these steps carefully:
1. Search for basic company info using search_company_basic
   - Look for official website and about page
   - Note the company's primary description and industry
   - Document each source you find and why it's relevant

2. Search for specific details using search_company_details
   - Try multiple search queries to find different types of information
   - Look for financial reports, employee counts, and company history
   - Cross-reference information from multiple sources
   - Document which sources provided which information

3. Use verify_company_info to:
   - Cross-reference information from multiple sources
   - Verify each piece of information
   - Assign appropriate confidence levels
   - Ensure all sources are properly cited
   - Explain your reasoning for each piece of information

4. If any information is missing or has low confidence:
   - Try different search queries
   - Look for alternative sources
   - Cross-reference multiple sources
   - Don't stop until you've found the best available information
   - Document your search process and findings

Remember:
- Prioritize official company sources
- Cross-reference information when possible
- Be conservative with confidence levels
- Always cite your sources
- Keep searching until you find the best available information
- Document your reasoning for each piece of information`],
  ["human", "{input}"],
  ["ai", "{agent_scratchpad}"],
]);

// Add a helper function to compare confidence levels
const compareConfidence = (old: string, new_: string): boolean => {
  const levels = { 'High': 3, 'Medium': 2, 'Low': 1 };
  return levels[new_ as keyof typeof levels] > levels[old as keyof typeof levels];
};

// Add a helper function to merge old and new data
const mergeData = (oldData: CompanyEnrichment, newData: CompanyEnrichment): CompanyEnrichment => {
  const result: CompanyEnrichment = { ...newData };
  
  // For each field, keep the better data
  Object.keys(oldData).forEach(key => {
    if (key === 'reasoningSteps' || key === 'fromCache') return;
    
    const oldField = oldData[key as keyof CompanyEnrichment] as CompanyField;
    const newField = newData[key as keyof CompanyEnrichment] as CompanyField;
    
    if (oldField && newField) {
      // If old data has higher confidence or new data is empty, keep old data
      if (!newField.value || 
          (oldField.value && !compareConfidence(newField.confidence || 'Low', oldField.confidence || 'Low'))) {
        (result as any)[key] = oldField;
      }
    }
  });
  
  // Combine reasoning steps
  result.reasoningSteps = [
    ...(oldData.reasoningSteps || []),
    '--- New Search Results ---',
    ...(newData.reasoningSteps || [])
  ];
  
  return result;
};

// Update the main enrichment function
export async function enrichCompany(companyName: string, forceRefresh: boolean = false): Promise<EnrichmentResult> {
  let existingData: CompanyEnrichment | null = null;
  
  try {
    // Get existing data first
    existingData = await companyDB.getCompany(companyName);
    const isStale = await companyDB.isStale(companyName);
    
    // If we have cached data and it's not stale, return it
    if (!forceRefresh && existingData && !isStale) {
      console.log('Using cached data for:', companyName);
      return {
        data: {
          ...existingData,
          fromCache: true
        },
        reasoningSteps: existingData.reasoningSteps || [],
        fromCache: true
      };
    }

    console.log('Starting enrichment for:', companyName);
    
    // Initialize the agent with more iterations
    const agent = await createOpenAIFunctionsAgent({
      llm: model,
      tools,
      prompt,
    });

    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true,
      maxIterations: 8, // Increased iterations for more thorough search
    });

    // Use the agent to gather and verify company information
    const result = await agentExecutor.invoke({
      input: `Please gather comprehensive information about ${companyName}. 
      Follow these steps and explain your reasoning at each step:
      1. Search for basic company information and explain what you found
      2. Search for specific details and explain how you verified the information
      3. If any information is missing or has low confidence:
         - Try different search queries
         - Look for alternative sources
         - Cross-reference multiple sources
      4. Extract and verify the most accurate information
      5. Show your confidence level in each piece of information
      6. Finally, provide the information in a structured JSON format`
    });

    console.log('Agent execution result:', result);

    // Extract reasoning steps from the agent's intermediate steps
    const reasoningSteps = result.intermediateSteps?.map((step: any) => {
      const toolName = step.action.tool;
      const observation = step.observation;
      const thought = step.action.toolInput || '';
      
      let stepDescription = `Step: ${toolName}\n`;
      stepDescription += `Thought: ${thought}\n`;
      
      // Add more context based on the tool used
      if (toolName === 'search_company_basic') {
        stepDescription += '🔍 Searching for basic company information...\n';
      } else if (toolName === 'search_company_details') {
        stepDescription += '🔍 Searching for detailed company information...\n';
      } else if (toolName === 'verify_company_info') {
        stepDescription += '✅ Verifying and extracting structured information...\n';
      }
      
      stepDescription += `Observation: ${observation}`;
      return stepDescription;
    }) || [];

    // Try to parse the final output as JSON
    let parsedResult: Record<string, any>;
    try {
      console.log('Attempting to parse output:', result.output);
      parsedResult = JSON.parse(result.output);
    } catch (error) {
      console.error('Failed to parse output:', error);
      // If that fails, try to extract JSON from the output
      const jsonMatch = result.output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResult = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error("Failed to parse JSON from output:", e);
          parsedResult = {
            name: { value: companyName, confidence: "High" },
            website: { value: "", confidence: "Low" },
            description: { value: "", confidence: "Low" },
            industry: { value: "", confidence: "Low" },
            founded: { value: "", confidence: "Low" },
            headquarters: { value: "", confidence: "Low" },
            employees: { value: "", confidence: "Low" },
            revenue: { value: "", confidence: "Low" }
          };
        }
      } else {
        console.error("No JSON found in output");
        parsedResult = {
          name: { value: companyName, confidence: "High" },
          website: { value: "", confidence: "Low" },
          description: { value: "", confidence: "Low" },
          industry: { value: "", confidence: "Low" },
          founded: { value: "", confidence: "Low" },
          headquarters: { value: "", confidence: "Low" },
          employees: { value: "", confidence: "Low" },
          revenue: { value: "", confidence: "Low" }
        };
      }
    }

    // Helper function to ensure field has proper structure
    const ensureFieldStructure = (field: any, defaultValue: string = ""): CompanyField => {
      if (!field) return { value: defaultValue, confidence: "Low", reasoning: "No information found" };
      if (typeof field === 'string') return { value: field, confidence: "Medium", reasoning: "Direct value provided" };
      return {
        value: field.value || defaultValue,
        source: field.source || "",
        confidence: field.confidence || "Low",
        reasoning: field.reasoning || "No reasoning provided"
      };
    };

    // Create new enriched data
    const newEnrichedData: CompanyEnrichment = {
      name: ensureFieldStructure(parsedResult.name, companyName),
      website: ensureFieldStructure(parsedResult.website),
      description: ensureFieldStructure(parsedResult.description),
      industry: ensureFieldStructure(parsedResult.industry),
      founded: ensureFieldStructure(parsedResult.founded),
      headquarters: ensureFieldStructure(parsedResult.headquarters),
      employees: ensureFieldStructure(parsedResult.employees),
      revenue: ensureFieldStructure(parsedResult.revenue),
      reasoningSteps,
      fromCache: false
    };

    // If we have existing data, merge it with the new data
    const finalData = existingData ? mergeData(existingData, newEnrichedData) : newEnrichedData;

    console.log('Final enriched data:', finalData);

    // Save to database
    await companyDB.saveCompany(companyName, finalData);

    return {
      data: finalData,
      reasoningSteps: reasoningSteps,
      fromCache: false
    };
  } catch (error: any) {
    console.error("Error enriching company data:", error);
    // If we have existing data, return it with the error
    if (existingData) {
      return {
        data: {
          ...existingData,
          reasoningSteps: [
            ...(existingData.reasoningSteps || []),
            `Error during refresh: ${error.message}`
          ],
          fromCache: false
        },
        reasoningSteps: [],
        fromCache: false
      };
    }
    // Otherwise return a default structure
    return {
      data: {
        name: { value: companyName, confidence: "High" },
        website: { value: "", confidence: "Low" },
        description: { value: "", confidence: "Low" },
        industry: { value: "", confidence: "Low" },
        founded: { value: "", confidence: "Low" },
        headquarters: { value: "", confidence: "Low" },
        employees: { value: "", confidence: "Low" },
        revenue: { value: "", confidence: "Low" },
        reasoningSteps: [`Error: ${error.message}`],
        fromCache: false
      },
      reasoningSteps: [],
      fromCache: false
    };
  }
} 