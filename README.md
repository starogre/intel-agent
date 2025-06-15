# Company Intelligence Enrichment Agent

A React-based application that leverages AI to gather and analyze comprehensive company information from multiple sources. The application provides detailed insights about companies, including their history, executive team, market position, and recent developments.

## Features

- **Real-time Company Information**: Fetch and display comprehensive company details including:
  - Basic company information (name, website, industry, founding year)
  - Executive team profiles with LinkedIn integration
  - Company history and key milestones
  - Market position and competitive landscape
  - Recent news and developments

- **Multi-Source Data**: Aggregates information from various sources including:
  - Company websites
  - LinkedIn profiles
  - News articles
  - Business databases

- **AI-Powered Analysis**: Uses OpenAI's GPT-4 to:
  - Process and structure raw data
  - Extract relevant information
  - Provide contextual insights
  - Generate comprehensive company profiles

## Tech Stack

- **Frontend**:
  - React
  - TypeScript
  - CSS3 with modern styling
  - Axios for API requests

- **Backend**:
  - Node.js
  - Express.js
  - OpenAI API (GPT-4)
  - SerpAPI for web search

- **Development Tools**:
  - Git for version control
  - npm for package management
  - Concurrent development server

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/starogre/intel-agent.git
   cd intel-agent
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with your API keys:
   ```
   REACT_APP_OPENAI_API_KEY=your_openai_api_key
   REACT_APP_SERPAPI_API_KEY=your_serpapi_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`

## Usage

1. Enter a company name in the search bar
2. The application will:
   - Fetch basic company information
   - Gather executive team details
   - Collect company background and history
   - Display all information in a structured format

## Project Structure

```
intel-agent/
├── src/
│   ├── components/     # React components
│   ├── utils/         # Utility functions
│   ├── App.tsx        # Main application component
│   └── index.tsx      # Application entry point
├── server.js          # Express backend server
├── package.json       # Project dependencies
└── README.md         # Project documentation
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
