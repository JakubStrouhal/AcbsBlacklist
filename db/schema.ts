import { pgEnum, pgTable, text, serial, integer, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

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

// Custom Zod schema for rule validation with proper date handling
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

// Drizzle schemas for type safety
export const insertRuleSchema = createInsertSchema(rules);
export const selectRuleSchema = createSelectSchema(rules);

// Types
export type Rule = typeof rules.$inferSelect;
export type NewRule = typeof rules.$inferInsert;
export type RuleValidation = z.infer<typeof ruleValidationSchema>;