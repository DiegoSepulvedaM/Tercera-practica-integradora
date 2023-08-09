export interface RateDocument extends Document {
  rate: number;
  timestamp: number;
}

export interface ExchangeRequest {
  to: {
    currency: string;
    amount: number;
  };
  from: {
    currency: string;
    amount: number;
  };
}

export interface updateRequest {
  currencies: string[];
}

export interface Rates {
  currency_code_from: string;
  currency_code_to: string;
  rate: number;
  timestamp: number;
}
