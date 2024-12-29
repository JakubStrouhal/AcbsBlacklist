import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { rules, conditionGroups, conditions, auditLog } from "@db/schema";
import { eq, and, gt, lt } from "drizzle-orm";
import cors from 'cors';

export function registerRoutes(app: Express): Server {
  // Enable CORS for all routes
  app.use(cors({
    origin: true,
    credentials: true
  }));

  // Rules CRUD
  app.get("/api/rules", async (req, res) => {
    try {
      const allRules = await db.select().from(rules);
      res.json(allRules);
    } catch (error) {
      console.error('Error fetching rules:', error);
      res.status(500).json({ error: "Failed to fetch rules" });
    }
  });

  app.get("/api/rules/:id", async (req, res) => {
    try {
      const ruleWithConditions = await db.query.rules.findFirst({
        where: eq(rules.ruleId, parseInt(req.params.id)),
        with: {
          conditionGroups: {
            with: {
              conditions: true
            }
          }
        }
      });

      if (!ruleWithConditions) {
        return res.status(404).json({ error: "Rule not found" });
      }

      res.json(ruleWithConditions);
    } catch (error) {
      console.error('Error fetching rule:', error);
      res.status(500).json({ error: "Failed to fetch rule" });
    }
  });

  app.post("/api/rules", async (req, res) => {
    try {
      const newRule = {
        ...req.body,
        lastModifiedDate: new Date(),
        validUntil: req.body.validUntil ? new Date(req.body.validUntil) : null
      };

      const [createdRule] = await db.insert(rules).values(newRule).returning();
      res.status(201).json(createdRule);
    } catch (error) {
      console.error('Error creating rule:', error);
      res.status(500).json({ error: "Failed to create rule" });
    }
  });

  app.patch("/api/rules/:id", async (req, res) => {
    try {
      // Extract only rule-specific fields, ignoring conditionGroups
      const { conditionGroups: _, ...updateData } = req.body;

      const [updatedRule] = await db
        .update(rules)
        .set({
          ...updateData,
          lastModifiedDate: new Date(),
          validUntil: updateData.validUntil ? new Date(updateData.validUntil) : null
        })
        .where(eq(rules.ruleId, parseInt(req.params.id)))
        .returning();

      if (!updatedRule) {
        return res.status(404).json({ error: "Rule not found" });
      }

      res.json(updatedRule);
    } catch (error) {
      console.error('Error updating rule:', error);
      res.status(500).json({ error: "Failed to update rule" });
    }
  });

  // Condition Groups
  app.post("/api/rules/:ruleId/condition-groups", async (req, res) => {
    try {
      const [group] = await db
        .insert(conditionGroups)
        .values({
          ruleId: parseInt(req.params.ruleId),
          description: req.body.description
        })
        .returning();

      if (!group) {
        return res.status(500).json({ error: "Failed to create condition group" });
      }

      res.status(201).json(group);
    } catch (error) {
      console.error('Error creating condition group:', error);
      res.status(500).json({ error: "Failed to create condition group" });
    }
  });

  app.delete("/api/rules/:ruleId/condition-groups", async (req, res) => {
    try {
      await db
        .delete(conditionGroups)
        .where(eq(conditionGroups.ruleId, parseInt(req.params.ruleId)));

      res.status(200).json({ message: "Condition groups deleted successfully" });
    } catch (error) {
      console.error('Error deleting condition groups:', error);
      res.status(500).json({ error: "Failed to delete condition groups" });
    }
  });

  // Conditions
  app.post("/api/condition-groups/:groupId/conditions", async (req, res) => {
    try {
      const [condition] = await db
        .insert(conditions)
        .values({
          conditionGroupId: parseInt(req.params.groupId),
          parameter: req.body.parameter,
          operator: req.body.operator,
          value: req.body.value
        })
        .returning();

      if (!condition) {
        return res.status(500).json({ error: "Failed to create condition" });
      }

      res.status(201).json(condition);
    } catch (error) {
      console.error('Error creating condition:', error);
      res.status(500).json({ error: "Failed to create condition" });
    }
  });

  // Vehicle Validation
  app.post("/api/rules/validate", async (req, res) => {
    try {
      const validation = req.body;

      // Fetch applicable rules
      const applicableRules = await db
        .select()
        .from(rules)
        .where(
          and(
            eq(rules.ruleType, validation.ruleType),
            eq(rules.status, 'Active')
          )
        );

      // Find matching rules based on basic criteria
      const matches = await Promise.all(applicableRules.map(async (rule) => {
        const basicMatch = (rule.country === 'Any' || rule.country === validation.country) &&
          (rule.customer === 'Any' || rule.customer === validation.customer) &&
          (rule.opportunitySource === 'Any' || rule.opportunitySource === validation.opportunitySource) &&
          (!rule.validUntil || new Date(rule.validUntil) > new Date());

        // Year comparison logic
        let yearMatch = true;
        if (validation.yearComparison === '=') {
          yearMatch = validation.makeYear === rule.makeYear;
        } else if (validation.yearComparison === '>') {
          yearMatch = validation.makeYear > (rule.makeYear || 0);
        } else if (validation.yearComparison === '<') {
          yearMatch = validation.makeYear < (rule.makeYear || Number.MAX_SAFE_INTEGER);
        }

        if (!basicMatch || !yearMatch) return null;

        // Get condition groups for the rule
        const conditionGroups = await db
          .select()
          .from(conditionGroups)
          .where(eq(conditionGroups.ruleId, rule.ruleId));

        // For each condition group, check all conditions
        const groupMatches = await Promise.all(conditionGroups.map(async (group) => {
          const conditions = await db
            .select()
            .from(conditions)
            .where(eq(conditions.conditionGroupId, group.conditionGroupId));

          // Group conditions by orGroup
          const orGroups = conditions.reduce((acc, condition) => {
            const key = condition.orGroup ?? condition.conditionId;
            if (!acc[key]) acc[key] = [];
            acc[key].push(condition);
            return acc;
          }, {} as Record<number, typeof conditions[number][]>);

          // Check each OR group (conditions within group are ORed, groups are ANDed)
          return Object.values(orGroups).every(orConditions =>
            orConditions.some(condition => {
              // Add your condition evaluation logic here
              // This is a simplified example
              const value = validation[condition.parameter as keyof typeof validation];
              if (typeof value === 'string' || typeof value === 'number') {
                switch (condition.operator) {
                  case '=':
                    return value.toString() === condition.value;
                  case '>':
                    return Number(value) > Number(condition.value);
                  case '<':
                    return Number(value) < Number(condition.value);
                  // Add other operators as needed
                }
              }
              return false;
            })
          );
        }));

        return groupMatches.every(match => match) ? rule : null;
      }));

      const matchingRule = matches.find(rule => rule !== null);

      if (matchingRule) {
        // Log the validation attempt
        await db.insert(auditLog).values({
          request: JSON.stringify(validation),
          response: JSON.stringify(matchingRule),
          ruleId: matchingRule.ruleId,
          success: true
        });

        return res.json({
          isMatch: true,
          action: matchingRule.action,
          actionMessage: matchingRule.actionMessage
        });
      }

      // Log the failed validation attempt
      await db.insert(auditLog).values({
        request: JSON.stringify(validation),
        response: JSON.stringify({ message: "No matching rules found" }),
        ruleId: null,
        success: false
      });

      res.json({
        isMatch: false,
        action: null,
        actionMessage: "No matching rules found"
      });
    } catch (error) {
      console.error('Error validating vehicle:', error);
      res.status(500).json({ error: "Failed to validate vehicle" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}