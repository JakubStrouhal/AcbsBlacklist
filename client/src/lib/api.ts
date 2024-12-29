import type { Rule, ConditionGroup, Condition, operatorEnum } from '@db/schema';

export interface ValidationRequest {
  ruleType: 'Global' | 'Local';
  country: 'CZ' | 'SK' | 'PL' | 'Any';
  opportunitySource: 'Ticking' | 'Webform' | 'SMS' | 'Any';
  customer: 'Private' | 'Company' | 'Any';
  make: string;
  model?: string;
  makeYear: number;
  tachometer: number;
  fuelType: string;
  price: number;
}

export interface ValidationResponse {
  isMatch: boolean;
  action: 'POZVI - NESLIBUJ' | 'POZVI SWAPEM - NESLIBUJ' | 'NEZVI - NECHCEME' | null;
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
  getRule: (id: number) => fetchApi<Rule & { conditionGroups: (ConditionGroup & { conditions: Condition[] })[] }>(`/rules/${id}`),
  createRule: (rule: Omit<Rule, 'ruleId'>) => fetchApi<Rule>('/rules', {
    method: 'POST',
    body: JSON.stringify(rule),
  }),
  updateRule: (id: number, rule: Partial<Omit<Rule, 'ruleId'>>) => 
    fetchApi<Rule>(`/rules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(rule),
    }),
  deleteRule: (id: number) => fetchApi(`/rules/${id}`, { method: 'DELETE' }),

  // Condition Groups
  createConditionGroup: (ruleId: number, group: Pick<ConditionGroup, 'description'>) =>
    fetchApi<ConditionGroup>(`/rules/${ruleId}/condition-groups`, {
      method: 'POST',
      body: JSON.stringify(group),
    }),
  deleteRuleConditionGroups: (ruleId: number) =>
    fetchApi(`/rules/${ruleId}/condition-groups`, { method: 'DELETE' }),

  // Conditions
  createCondition: (groupId: number, condition: Pick<Condition, 'parameter' | 'operator' | 'value'>) =>
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