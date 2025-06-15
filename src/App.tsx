import React, { useState } from 'react';
import './App.css';

interface Executive {
  name: string;
  title: string;
  linkedin?: string;
  background?: string;
}

interface CompanyInfo {
  name?: string;
  website?: string;
  industry?: string;
  founded?: string;
  headquarters?: string;
  description?: string;
  'Official company name'?: string;
  'Website URL'?: string;
  Industry?: string;
  'Founded year'?: string;
  'Headquarters location'?: string;
  'Brief description'?: string;
  'Company size'?: string | null;
}

interface CompanyBackground {
  'Company history': string | null;
  'Recent news': string | null;
  'Key milestones': string | null;
  'Market position': string | null;
  'Competitive landscape': string | null;
}

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  source?: string;
}

function App() {
  const [companyName, setCompanyName] = useState('');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [background, setBackground] = useState<CompanyBackground | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState({
    basic: false,
    executives: false,
    background: false
  });
  const [progress, setProgress] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCompanyInfo(null);
    setExecutives([]);
    setBackground(null);
    setSearchResults([]);
    setProgress(0);

    try {
      // Get basic company information
      setLoading(prev => ({ ...prev, basic: true }));
      const basicInfoResponse = await fetch('http://localhost:3001/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: companyName,
          type: 'basic'
        }),
      });

      if (!basicInfoResponse.ok) {
        throw new Error('Failed to get basic company info');
      }

      const basicInfoData = await basicInfoResponse.json();
      console.log('Raw Basic Info Response:', basicInfoData);
      setSearchResults(basicInfoData.results || []);
      
      // Parse the processed data if it's a string
      const processedBasicInfo = typeof basicInfoData.processed === 'string' 
        ? JSON.parse(basicInfoData.processed) 
        : basicInfoData.processed;
      console.log('Processed Basic Info:', processedBasicInfo);
      console.log('Basic Info Keys:', Object.keys(processedBasicInfo));
      setCompanyInfo(processedBasicInfo);
      setProgress(33);
      setLoading(prev => ({ ...prev, basic: false }));

      // Get executives
      setLoading(prev => ({ ...prev, executives: true }));
      const execsResponse = await fetch('http://localhost:3001/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: `${companyName} executives`,
          type: 'executives'
        }),
      });

      if (!execsResponse.ok) {
        throw new Error('Failed to get executives');
      }

      const execsData = await execsResponse.json();
      console.log('Raw Executives Response:', execsData);
      
      // Parse the processed data if it's a string
      const processedExecs = typeof execsData.processed === 'string'
        ? JSON.parse(execsData.processed)
        : execsData.processed;
      console.log('Processed Executives:', processedExecs);
      
      // Ensure executives is an array
      const execsArray = Array.isArray(processedExecs) ? processedExecs : [];
      setExecutives(execsArray);
      setProgress(66);
      setLoading(prev => ({ ...prev, executives: false }));

      // Get company background
      setLoading(prev => ({ ...prev, background: true }));
      const backgroundResponse = await fetch('http://localhost:3001/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: `${companyName} company history news`,
          type: 'background'
        }),
      });

      if (!backgroundResponse.ok) {
        throw new Error('Failed to get company background');
      }

      const backgroundData = await backgroundResponse.json();
      console.log('Raw Background Response:', backgroundData);
      
      // Parse the processed data if it's a string
      const processedBackground = typeof backgroundData.processed === 'string'
        ? JSON.parse(backgroundData.processed)
        : backgroundData.processed;
      console.log('Processed Background:', processedBackground);
      console.log('Background Keys:', Object.keys(processedBackground));
      setBackground(processedBackground);
      setProgress(100);
      setLoading(prev => ({ ...prev, background: false }));
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading({ basic: false, executives: false, background: false });
    }
  };

  // Add useEffect to log state changes
  React.useEffect(() => {
    console.log('Company Info Updated:', companyInfo);
  }, [companyInfo]);

  React.useEffect(() => {
    console.log('Background Updated:', background);
  }, [background]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Company Intelligence Agent</h1>
        <form onSubmit={handleSubmit} className="search-form">
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Enter company name..."
            className="search-input"
          />
          <button type="submit" className="search-button">Search</button>
        </form>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      {loading.basic && <div className="loading-message">Loading company information...</div>}
      {loading.executives && <div className="loading-message">Loading executive team...</div>}
      {loading.background && <div className="loading-message">Loading company background...</div>}

      {companyInfo && (
        <div className="info-grid">
          <div className="info-card">
            <h2>Company Information</h2>
            <p><strong>Name:</strong> {companyInfo['Official company name'] || companyInfo.name || 'Not available'}</p>
            <p><strong>Website:</strong> {companyInfo['Website URL'] || companyInfo.website || 'Not available'}</p>
            <p><strong>Industry:</strong> {companyInfo.Industry || companyInfo.industry || 'Not available'}</p>
            <p><strong>Founded:</strong> {companyInfo['Founded year'] || companyInfo.founded || 'Not available'}</p>
            <p><strong>Headquarters:</strong> {companyInfo['Headquarters location'] || companyInfo.headquarters || 'Not available'}</p>
            <p><strong>Description:</strong> {companyInfo['Brief description'] || companyInfo.description || 'Not available'}</p>
            <p><strong>Company Size:</strong> {companyInfo['Company size'] || 'Not available'}</p>
          </div>
        </div>
      )}

      {executives.length > 0 && (
        <div className="executives-grid">
          <h2>Executive Team</h2>
          {executives.map((exec, index) => (
            <div key={index} className="executive-card">
              <h3>{exec.name}</h3>
              <p><strong>Title:</strong> {exec.title}</p>
              {exec.linkedin && (
                <a href={exec.linkedin} target="_blank" rel="noopener noreferrer">
                  LinkedIn Profile
                </a>
              )}
              {exec.background && <p>{exec.background}</p>}
            </div>
          ))}
        </div>
      )}

      {background && (
        <div className="info-grid">
          <div className="info-card">
            <h2>Company Background</h2>
            <p><strong>History:</strong> {background['Company history'] || 'Not available'}</p>
            <p><strong>Recent News:</strong> {background['Recent news'] || 'Not available'}</p>
            <p><strong>Key Milestones:</strong> {background['Key milestones'] || 'Not available'}</p>
            <p><strong>Market Position:</strong> {background['Market position'] || 'Not available'}</p>
            <p><strong>Competitive Landscape:</strong> {background['Competitive landscape'] || 'Not available'}</p>
          </div>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="sources-list">
          <h2>Information Sources</h2>
          {searchResults.map((result, index) => (
            <div key={index} className="source-item">
              <a href={result.link} target="_blank" rel="noopener noreferrer">
                {result.title}
              </a>
              <p>{result.snippet}</p>
              {result.source && <span className="source-type">{result.source}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
