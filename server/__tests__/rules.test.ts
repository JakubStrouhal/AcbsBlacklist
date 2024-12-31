import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@db';
import { rules, conditionGroups, conditions } from '@db/schema';
import { eq } from 'drizzle-orm';

describe('Rule Validation Tests', () => {
  // Test data
  const testRules = [
    {
      ruleName: "Test Rule 1 - Single Make",
      ruleType: "Global",
      status: "Active",
      action: "POZVI - NESLIBUJ",
      customer: "Any",
      country: "Any",
      opportunitySource: "Any",
      conditionGroups: [
        {
          description: "Single Make Condition",
          conditions: [
            {
              parameter: "make",
              operator: "=",
              value: "10", // Škoda
              orGroup: null
            }
          ]
        }
      ]
    },
    {
      ruleName: "Test Rule 2 - Multiple Makes OR",
      ruleType: "Global",
      status: "Active",
      action: "NEZVI - NECHCEME",
      customer: "Any",
      country: "Any",
      opportunitySource: "Any",
      conditionGroups: [
        {
          description: "Multiple Makes OR Condition",
          conditions: [
            {
              parameter: "make",
              operator: "=",
              value: "10", // Škoda
              orGroup: 1
            },
            {
              parameter: "make",
              operator: "=",
              value: "6", // Another make
              orGroup: 1
            }
          ]
        },
        {
          description: "Price Range Condition",
          conditions: [
            {
              parameter: "price",
              operator: "BETWEEN",
              value: "100000,500000",
              orGroup: null
            }
          ]
        }
      ]
    },
    {
      ruleName: "Test Rule 3 - Complex OR Groups",
      ruleType: "Global",
      status: "Active",
      action: "POZVI SWAPEM - NESLIBUJ",
      customer: "Any",
      country: "Any",
      opportunitySource: "Any",
      conditionGroups: [
        {
          description: "Make and Model OR Conditions",
          conditions: [
            {
              parameter: "make",
              operator: "=",
              value: "10",
              orGroup: 1
            },
            {
              parameter: "model",
              operator: "IN",
              value: "1,2,3",
              orGroup: 1
            },
            {
              parameter: "makeYear",
              operator: ">",
              value: "2020",
              orGroup: null
            }
          ]
        }
      ]
    }
  ];

  // Setup: Insert test data
  beforeAll(async () => {
    try {
      for (const ruleData of testRules) {
        // Create rule
        const [rule] = await db.insert(rules).values({
          ruleName: ruleData.ruleName,
          ruleType: ruleData.ruleType,
          status: ruleData.status,
          action: ruleData.action,
          customer: ruleData.customer,
          country: ruleData.country,
          opportunitySource: ruleData.opportunitySource,
          createdBy: 1,
          lastModifiedBy: 1,
          lastModifiedDate: new Date()
        }).returning();

        // Create condition groups and conditions
        for (const groupData of ruleData.conditionGroups) {
          const [group] = await db.insert(conditionGroups).values({
            ruleId: rule.ruleId,
            description: groupData.description
          }).returning();

          for (const conditionData of groupData.conditions) {
            await db.insert(conditions).values({
              conditionGroupId: group.conditionGroupId,
              parameter: conditionData.parameter,
              operator: conditionData.operator,
              value: conditionData.value,
              orGroup: conditionData.orGroup
            });
          }
        }
      }
    } catch (error) {
      console.error('Error setting up test data:', error);
      throw error;
    }
  });

  // Cleanup: Remove test data
  afterAll(async () => {
    try {
      for (const ruleData of testRules) {
        const [rule] = await db
          .select()
          .from(rules)
          .where(eq(rules.ruleName, ruleData.ruleName));

        if (rule) {
          // Delete rule (cascade will handle condition groups and conditions)
          await db.delete(rules).where(eq(rules.ruleId, rule.ruleId));
        }
      }
    } catch (error) {
      console.error('Error cleaning up test data:', error);
      throw error;
    }
  });

  // Test cases
  it('should match single make condition', async () => {
    const response = await fetch('http://localhost:5000/api/rules/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ruleType: 'Global',
        make: '10', // Škoda
        customer: 'Private',
        country: 'CZ',
        opportunitySource: 'Webform'
      })
    });

    const result = await response.json();
    expect(result.isMatch).toBe(true);
    expect(result.action).toBe('POZVI - NESLIBUJ');
  });

  it('should match one of multiple makes with OR condition', async () => {
    const response = await fetch('http://localhost:5000/api/rules/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ruleType: 'Global',
        make: '6', // Second make
        price: '200000',
        customer: 'Private',
        country: 'CZ',
        opportunitySource: 'Webform'
      })
    });

    const result = await response.json();
    expect(result.isMatch).toBe(true);
    expect(result.action).toBe('NEZVI - NECHCEME');
  });

  it('should match complex OR conditions with additional criteria', async () => {
    const response = await fetch('http://localhost:5000/api/rules/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ruleType: 'Global',
        make: '10',
        model: '2',
        makeYear: '2022',
        customer: 'Private',
        country: 'CZ',
        opportunitySource: 'Webform'
      })
    });

    const result = await response.json();
    expect(result.isMatch).toBe(true);
    expect(result.action).toBe('POZVI SWAPEM - NESLIBUJ');
  });

  it('should not match when make is different', async () => {
    const response = await fetch('http://localhost:5000/api/rules/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ruleType: 'Global',
        make: '999', // Non-existent make
        customer: 'Private',
        country: 'CZ',
        opportunitySource: 'Webform'
      })
    });

    const result = await response.json();
    expect(result.isMatch).toBe(false);
  });

  it('should not match when price is outside range', async () => {
    const response = await fetch('http://localhost:5000/api/rules/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ruleType: 'Global',
        make: '10',
        price: '50000', // Below range
        customer: 'Private',
        country: 'CZ',
        opportunitySource: 'Webform'
      })
    });

    const result = await response.json();
    expect(result.isMatch).toBe(false);
  });
});