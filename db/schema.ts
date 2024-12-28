import { pgEnum, pgTable, text, serial, integer, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// Enums
export const ruleTypeEnum = pgEnum('rule_type', ['Global', 'Local']);
export const ruleStatusEnum = pgEnum('rule_status', ['Active', 'Inactive', 'Draft']);
export const actionEnum = pgEnum('action', ['POZVI - NESLIBUJ', 'POZVI SWAPEM - NESLIBUJ', 'NEZVI - NECHCEME', 'NoInterest']);
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
  ruleId: integer('rule_id').references(() => rules.ruleId).notNull(),
  description: varchar('description', { length: 255 })
});

// Conditions table
export const conditions = pgTable('conditions', {
  conditionId: serial('condition_id').primaryKey(),
  conditionGroupId: integer('condition_group_id').references(() => conditionGroups.conditionGroupId).notNull(),
  parameter: varchar('parameter', { length: 50 }).notNull(),
  operator: operatorEnum('operator').notNull(),
  value: text('value').notNull()
});

// Audit Log table
export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  request: text('request').notNull(),
  response: text('response').notNull(),
  ruleId: integer('rule_id'),
  success: boolean('success').notNull()
});

// Schemas
export const insertRuleSchema = createInsertSchema(rules);
export const selectRuleSchema = createSelectSchema(rules);
export const insertConditionGroupSchema = createInsertSchema(conditionGroups);
export const selectConditionGroupSchema = createSelectSchema(conditionGroups);
export const insertConditionSchema = createInsertSchema(conditions);
export const selectConditionSchema = createSelectSchema(conditions);

// Types
export type Rule = typeof rules.$inferSelect;
export type NewRule = typeof rules.$inferInsert;
export type ConditionGroup = typeof conditionGroups.$inferSelect;
export type NewConditionGroup = typeof conditionGroups.$inferInsert;
export type Condition = typeof conditions.$inferSelect;
export type NewCondition = typeof conditions.$inferInsert;