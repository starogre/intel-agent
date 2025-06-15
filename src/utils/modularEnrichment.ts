// Types for company information
interface CompanyInfo {
  name: string | null;
  website: string | null;
  description: string | null;
  industry: string | null;
  foundedYear: number | null;
  headquarters: string | null;
  companySize: string | null;
}

interface Executive {
  name: string;
  title: string;
  linkedinUrl?: string;
  profileImage?: string;
  background?: string;
}

interface CompanyBackground {
  history: string;
  milestones: string[];
  recentNews: string[];
  marketPosition: string;
}

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
}

// Helper function to search for company information
async function searchCompany(query: string, type: 'basic' | 'executives' | 'background'): Promise<SearchResult[]> {
  try {
    const response = await fetch('http://localhost:3001/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, type }),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error('Error searching company:', error);
    throw error;
  }
}

// Get basic company information
export async function getBasicCompanyInfo(companyName: string): Promise<CompanyInfo> {
  try {
    const response = await fetch('http://localhost:3001/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query: companyName,
        type: 'basic'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || `Failed to get company info: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Basic company info response:', data);
    
    if (!data.processed) {
      throw new Error('No processed data received from server');
    }

    try {
      const parsedData = JSON.parse(data.processed);
      return parsedData;
    } catch (e) {
      console.error('Error parsing company info:', e);
      throw new Error('Invalid company info data format');
    }
  } catch (error) {
    console.error('Error getting company info:', error);
    throw error;
  }
}

// Get company executives
export async function getExecutives(companyName: string): Promise<Executive[]> {
  try {
    const response = await fetch('http://localhost:3001/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query: `${companyName} executives`,
        type: 'executives'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || `Failed to get executives: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Executives response:', data);
    
    if (!data.processed) {
      throw new Error('No processed data received from server');
    }

    try {
      const parsedData = JSON.parse(data.processed);
      return Array.isArray(parsedData) ? parsedData : [];
    } catch (e) {
      console.error('Error parsing executives data:', e);
      throw new Error('Invalid executives data format');
    }
  } catch (error) {
    console.error('Error getting executives:', error);
    throw error;
  }
}

// Get company background
export async function getCompanyBackground(companyName: string): Promise<CompanyBackground> {
  try {
    const response = await fetch('http://localhost:3001/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query: `${companyName} company history news`,
        type: 'background'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || `Failed to get company background: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Company background response:', data);
    
    if (!data.processed) {
      throw new Error('No processed data received from server');
    }

    try {
      const parsedData = JSON.parse(data.processed);
      return {
        history: parsedData.history || '',
        milestones: Array.isArray(parsedData.milestones) ? parsedData.milestones : [],
        recentNews: Array.isArray(parsedData.recentNews) ? parsedData.recentNews : [],
        marketPosition: parsedData.marketPosition || ''
      };
    } catch (e) {
      console.error('Error parsing company background:', e);
      throw new Error('Invalid company background data format');
    }
  } catch (error) {
    console.error('Error getting company background:', error);
    throw error;
  }
}

// Main function to enrich company information
export async function enrichCompany(companyName: string, onUpdate: (info: Partial<CompanyInfo>) => void) {
  try {
    // Get all information in parallel
    const [basicInfo, executives, background] = await Promise.all([
      getBasicCompanyInfo(companyName),
      getExecutives(companyName),
      getCompanyBackground(companyName)
    ]);

    // Update with basic info
    if (basicInfo) {
      onUpdate(basicInfo);
    }
    
    return {
      companyInfo: basicInfo,
      executives,
      background
    };
  } catch (error) {
    console.error('Error enriching company:', error);
    throw error;
  }
} 