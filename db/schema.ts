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
  'NEZVI - NECHCEME'
]);
export const customerEnum = pgEnum('customer', ['Private', 'Company', 'Any']);
export const countryEnum = pgEnum('country', ['CZ', 'SK', 'PL', 'Any']);
export const opportunitySourceEnum = pgEnum('opportunity_source', ['Ticking', 'Webform', 'SMS', 'Any']);
export const operatorEnum = pgEnum('operator', ['=', '!=', 'IN', 'NOT IN', '>', '<', '<=', '>=', 'BETWEEN']);

// Vehicle-related tables
export const makes = pgTable('makes', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
});

export const models = pgTable('models', {
  id: serial('id').primaryKey(),
  makeId: integer('make_id').notNull().references(() => makes.id),
  name: varchar('name', { length: 100 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
});

export const fuelTypes = pgTable('fuel_types', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
});

export const engineTypes = pgTable('engine_types', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  fuelTypeId: integer('fuel_type_id').notNull().references(() => fuelTypes.id),
  displacement: integer('displacement'), // Making it nullable for electric vehicles
  power: integer('power'), // in hp
  isActive: boolean('is_active').notNull().default(true),
});

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
  makeYear: integer('make_year'),
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

// Conditions table with orGroup support
export const conditions = pgTable('conditions', {
  conditionId: serial('condition_id').primaryKey(),
  conditionGroupId: integer('condition_group_id')
    .notNull()
    .references(() => conditionGroups.conditionGroupId, { onDelete: 'cascade' }),
  parameter: varchar('parameter', { length: 50 }).notNull(),
  operator: operatorEnum('operator').notNull(),
  value: varchar('value', { length: 255 }).notNull(),
  orGroup: integer('or_group')
});

// Relations
export const rulesRelations = relations(rules, ({ many }) => ({
  conditionGroups: many(conditionGroups)
}));

export const modelsRelations = relations(models, ({ one }) => ({
  make: one(makes, {
    fields: [models.makeId],
    references: [makes.id],
  }),
}));

export const engineTypesRelations = relations(engineTypes, ({ one }) => ({
  fuelType: one(fuelTypes, {
    fields: [engineTypes.fuelTypeId],
    references: [fuelTypes.id],
  }),
}));

export const conditionGroupsRelations = relations(conditionGroups, ({ one, many }) => ({
  rule: one(rules, {
    fields: [conditionGroups.ruleId],
    references: [rules.ruleId],
  }),
  conditions: many(conditions)
}));

export const conditionsRelations = relations(conditions, ({ one }) => ({
  conditionGroup: one(conditionGroups, {
    fields: [conditions.conditionGroupId],
    references: [conditionGroups.conditionGroupId],
  })
}));

// Types for the application
export type Rule = typeof rules.$inferSelect & {
  conditionGroups?: Array<ConditionGroup & { conditions: Condition[] }>;
};
export type NewRule = typeof rules.$inferInsert;
export type ConditionGroup = typeof conditionGroups.$inferSelect;
export type NewConditionGroup = typeof conditionGroups.$inferInsert;
export type Condition = typeof conditions.$inferSelect;
export type NewCondition = typeof conditions.$inferInsert;

export type Make = typeof makes.$inferSelect;
export type InsertMake = typeof makes.$inferInsert;
export type Model = typeof models.$inferSelect;
export type InsertModel = typeof models.$inferInsert;
export type FuelType = typeof fuelTypes.$inferSelect;
export type InsertFuelType = typeof fuelTypes.$inferInsert;
export type EngineType = typeof engineTypes.$inferSelect;
export type InsertEngineType = typeof engineTypes.$inferInsert;


// Validation schemas
export const conditionSchema = z.object({
  parameter: z.string().min(1),
  operator: z.enum(operatorEnum.enumValues),
  value: z.string().min(1),
  orGroup: z.number().nullable().optional()
});

export const conditionGroupSchema = z.object({
  description: z.string(),
  conditions: z.array(conditionSchema)
});

export const ruleValidationSchema = z.object({
  ruleName: z.string().min(1, "Rule name is required").max(255),
  ruleType: z.enum(['Global', 'Local']),
  validUntil: z.string().nullable().optional(),
  status: z.enum(['Active', 'Inactive', 'Draft']),
  action: z.enum([
    'POZVI - NESLIBUJ',
    'POZVI SWAPEM - NESLIBUJ',
    'NEZVI - NECHCEME'
  ]),
  actionMessage: z.string().optional(),
  customer: z.enum(['Private', 'Company', 'Any']),
  country: z.enum(['CZ', 'SK', 'PL', 'Any']),
  opportunitySource: z.enum(['Ticking', 'Webform', 'SMS', 'Any']),
  createdBy: z.number(),
  lastModifiedBy: z.number(),
  makeYear: z.number().optional(),
  conditionGroups: z.array(conditionGroupSchema).optional()
});

// Insert validation schemas
export const insertMakeSchema = createInsertSchema(makes);
export const insertModelSchema = createInsertSchema(models);
export const insertFuelTypeSchema = createInsertSchema(fuelTypes);
export const insertEngineTypeSchema = createInsertSchema(engineTypes);

// Audit log for tracking validation attempts
export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  request: text('request').notNull(),
  response: text('response').notNull(),
  ruleId: integer('rule_id').references(() => rules.ruleId),
  success: boolean('success').notNull()
});