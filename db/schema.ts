import { pgEnum, pgTable, text, serial, integer, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from 'drizzle-orm';

// Enums
export const ruleTypeEnum = pgEnum('rule_type', ['Global', 'Local']);
export const ruleStatusEnum = pgEnum('rule_status', ['Active', 'Inactive', 'Draft']);
export const actionEnum = pgEnum('action', [
  'POZVI - NESLIBUJ',
  'POZVI SWAPEM - NESLIBUJ',
  'NEZVI - NECHCEME',
  'NoInterest'
]);
export const customerEnum = pgEnum('customer', ['Private', 'Company', 'Any']);
export const countryEnum = pgEnum('country', ['CZ', 'SK', 'PL', 'Any']);
export const opportunitySourceEnum = pgEnum('opportunity_source', ['Ticking', 'Webform', 'SMS', 'Any']);
export const operatorEnum = pgEnum('operator', ['=', '!=', 'IN', 'NOT IN', '>', '<', '<=', '>=', 'BETWEEN']);

// Rules table
export const rules = pgTable('rules', {
  ruleId: serial('rule_id').primaryKey(),
  ruleName: varchar('rule_name', { length: 255 }).notNull(),
  ruleType: ruleTypeEnum('rule_type').notNull(),
  validUntil: timestamp('valid_until'),
  status: ruleStatusEnum('status').notNull().default('Draft'),
  action: actionEnum('action').notNull(),
  actionMessage: text('action_message'),
  customer: customerEnum('customer').notNull().default('Any'),
  country: countryEnum('country').notNull().default('Any'),
  opportunitySource: opportunitySourceEnum('opportunity_source').notNull().default('Any'),
  createdBy: integer('created_by').notNull(),
  lastModifiedBy: integer('last_modified_by').notNull(),
  lastModifiedDate: timestamp('last_modified_date').notNull().defaultNow()
});

// Condition Groups table
export const conditionGroups = pgTable('condition_groups', {
  conditionGroupId: serial('condition_group_id').primaryKey(),
  ruleId: integer('rule_id')
    .notNull()
    .references(() => rules.ruleId, { onDelete: 'cascade' }),
  description: varchar('description', { length: 255 })
});

// Conditions table
export const conditions = pgTable('conditions', {
  conditionId: serial('condition_id').primaryKey(),
  conditionGroupId: integer('condition_group_id')
    .notNull()
    .references(() => conditionGroups.conditionGroupId, { onDelete: 'cascade' }),
  parameter: varchar('parameter', { length: 50 }).notNull(),
  operator: operatorEnum('operator').notNull(),
  value: varchar('value', { length: 255 }).notNull()
});

// Relations
export const rulesRelations = relations(rules, ({ many }) => ({
  conditionGroups: many(conditionGroups)
}));

export const conditionGroupsRelations = relations(conditionGroups, ({ one, many }) => ({
  rule: one(rules, {
    fields: [conditionGroups.ruleId],
    references: [rules.ruleId],
  }),
  conditions: many(conditions)
}));

export const conditionsRelations = relations(conditions, ({ one }) => ({
  group: one(conditionGroups, {
    fields: [conditions.conditionGroupId],
    references: [conditionGroups.conditionGroupId],
  })
}));

// Custom Zod schema for rule validation
export const ruleValidationSchema = z.object({
  ruleName: z.string().min(1, "Rule name is required").max(255, "Rule name is too long"),
  ruleType: z.enum(['Global', 'Local']),
  validUntil: z.string().nullable().transform(val => val ? new Date(val) : null),
  status: z.enum(['Active', 'Inactive', 'Draft']),
  action: z.enum([
    'POZVI - NESLIBUJ',
    'POZVI SWAPEM - NESLIBUJ',
    'NEZVI - NECHCEME',
    'NoInterest'
  ]),
  actionMessage: z.string().optional(),
  customer: z.enum(['Private', 'Company', 'Any']),
  country: z.enum(['CZ', 'SK', 'PL', 'Any']),
  opportunitySource: z.enum(['Ticking', 'Webform', 'SMS', 'Any']),
  createdBy: z.number(),
  lastModifiedBy: z.number(),
});

// Audit Log table
export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  request: text('request').notNull(),
  response: text('response').notNull(),
  ruleId: integer('rule_id').references(() => rules.ruleId),
  success: boolean('success').notNull()
});

// Types for use in the application
export type Rule = typeof rules.$inferSelect;
export type NewRule = typeof rules.$inferInsert;
export type ConditionGroup = typeof conditionGroups.$inferSelect;
export type NewConditionGroup = typeof conditionGroups.$inferInsert;
export type Condition = typeof conditions.$inferSelect;
export type NewCondition = typeof conditions.$inferInsert;