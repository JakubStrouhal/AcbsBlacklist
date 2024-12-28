import { Rule, NewRule, ConditionGroup, NewConditionGroup, Condition, NewCondition } from '@db/schema';

export interface ValidationRequest {
  ruleType: 'Global' | 'Local';
  country: string;
  opportunitySource: string;
  customer: string;
  make: string;
  makeYear: number;
  tachometer: number;
  fuelType: string;
  price: number;
}

export interface ValidationResponse {
  isMatch: boolean;
  action: string | null;
  actionMessage: string | null;
}

const API_BASE = '/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export const api = {
  // Rules
  getRules: () => fetchApi<Rule[]>('/rules'),
  getRule: (id: number) => fetchApi<Rule>(`/rules/${id}`),
  createRule: (rule: NewRule) => fetchApi<Rule>('/rules', {
    method: 'POST',
    body: JSON.stringify(rule),
  }),
  updateRule: (id: number, rule: Partial<Rule>) => fetchApi<Rule>(`/rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(rule),
  }),
  deleteRule: (id: number) => fetchApi(`/rules/${id}`, { method: 'DELETE' }),

  // Validation
  validateVehicle: (data: ValidationRequest) => fetchApi<ValidationResponse>('/rules/validate', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};