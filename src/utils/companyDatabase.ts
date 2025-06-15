import { CompanyEnrichment } from './enrichCompany';

class CompanyDatabase {
  private db: Map<string, { data: CompanyEnrichment; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  async getCompany(name: string): Promise<CompanyEnrichment | null> {
    const entry = this.db.get(name.toLowerCase());
    if (!entry) return null;
    return entry.data;
  }

  async saveCompany(name: string, data: CompanyEnrichment): Promise<void> {
    this.db.set(name.toLowerCase(), {
      data,
      timestamp: Date.now()
    });
  }

  async isStale(name: string): Promise<boolean> {
    const entry = this.db.get(name.toLowerCase());
    if (!entry) return true;
    return Date.now() - entry.timestamp > this.CACHE_DURATION;
  }
}

export const companyDB = new CompanyDatabase(); 