import { Rule, NewRule, ConditionGroup, NewConditionGroup, Condition, NewCondition } from '@db/schema';

export interface ValidationRequest {
  ruleType: 'Global' | 'Local';
  country: 'CZ' | 'SK' | 'PL' | 'Any';
  opportunitySource: 'Ticking' | 'Webform' | 'SMS' | 'Any';
  customer: 'Private' | 'Company';
  make: string;
  model?: string;
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

  // Condition Groups
  getConditionGroups: (ruleId: number) => 
    fetchApi<ConditionGroup[]>(`/rules/${ruleId}/condition-groups`),
  createConditionGroup: (ruleId: number, group: Omit<NewConditionGroup, 'ruleId'>) => 
    fetchApi<ConditionGroup>(`/rules/${ruleId}/condition-groups`, {
      method: 'POST',
      body: JSON.stringify(group),
    }),

  // Conditions
  getConditions: (groupId: number) => 
    fetchApi<Condition[]>(`/condition-groups/${groupId}/conditions`),
  createCondition: (groupId: number, condition: Omit<NewCondition, 'groupId'>) => 
    fetchApi<Condition>(`/condition-groups/${groupId}/conditions`, {
      method: 'POST',
      body: JSON.stringify(condition),
    }),

  // Validation
  validateVehicle: (data: ValidationRequest) => fetchApi<ValidationResponse>('/rules/validate', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};