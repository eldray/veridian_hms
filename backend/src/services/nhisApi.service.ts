import axios from 'axios';

interface NHISConfig {
  baseUrl: string;
  facilityCode: string;
  clientId: string;
  clientSecret: string;
}

class NHISApiService {
  private config: NHISConfig | null = null;

  setConfig(config: NHISConfig) {
    this.config = config;
  }

  private async getAuthToken(): Promise<string> {
    if (!this.config) throw new Error('NHIS Configuration missing');
    
    const response = await axios.post(`${this.config.baseUrl}/oauth/token`, {
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });
    
    return response.data.access_token;
  }

  async verifyMember(nhisNumber: string): Promise<any> {
    if (!this.config) throw new Error('NHIS Configuration missing');
    
    const token = await this.getAuthToken();
    const response = await axios.get(
      `${this.config.baseUrl}/api/v1/members/verify/${nhisNumber}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  }

  async generateCCC(nhisNumber: string, patientData: any): Promise<string> {
    if (!this.config) throw new Error('NHIS Configuration missing');
    
    const token = await this.getAuthToken();
    
    const payload = {
      nhisNumber,
      facilityCode: this.config.facilityCode,
      ...patientData,
    };

    const response = await axios.post(
      `${this.config.baseUrl}/api/v1/ccc/generate`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data.cccId;
  }

  async submitClaim(xmlData: string): Promise<any> {
    if (!this.config) throw new Error('NHIS Configuration missing');
    
    const token = await this.getAuthToken();
    
    const response = await axios.post(
      `${this.config.baseUrl}/api/v1/claims/submit`,
      { xmlContent: xmlData },
      { 
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  }
}

export const nhisApiService = new NHISApiService();
