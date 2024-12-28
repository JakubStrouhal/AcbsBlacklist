import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { rules, conditionGroups, conditions, auditLog } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // Rules CRUD
  app.get("/api/rules", async (req, res) => {
    try {
      const allRules = await db.select().from(rules);
      res.json(allRules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rules" });
    }
  });

  app.get("/api/rules/:id", async (req, res) => {
    try {
      const [rule] = await db
        .select()
        .from(rules)
        .where(eq(rules.ruleId, parseInt(req.params.id)));
      
      if (!rule) {
        return res.status(404).json({ error: "Rule not found" });
      }
      
      res.json(rule);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rule" });
    }
  });

  app.post("/api/rules", async (req, res) => {
    try {
      const [newRule] = await db.insert(rules).values(req.body).returning();
      res.status(201).json(newRule);
    } catch (error) {
      res.status(500).json({ error: "Failed to create rule" });
    }
  });

  app.patch("/api/rules/:id", async (req, res) => {
    try {
      const [updatedRule] = await db
        .update(rules)
        .set(req.body)
        .where(eq(rules.ruleId, parseInt(req.params.id)))
        .returning();
      
      res.json(updatedRule);
    } catch (error) {
      res.status(500).json({ error: "Failed to update rule" });
    }
  });

  // Condition Groups
  app.get("/api/rules/:ruleId/condition-groups", async (req, res) => {
    try {
      const groups = await db
        .select()
        .from(conditionGroups)
        .where(eq(conditionGroups.ruleId, parseInt(req.params.ruleId)));
      
      res.json(groups);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch condition groups" });
    }
  });

  app.post("/api/condition-groups", async (req, res) => {
    try {
      const [newGroup] = await db
        .insert(conditionGroups)
        .values(req.body)
        .returning();
      res.status(201).json(newGroup);
    } catch (error) {
      res.status(500).json({ error: "Failed to create condition group" });
    }
  });

  // Conditions
  app.get("/api/condition-groups/:groupId/conditions", async (req, res) => {
    try {
      const groupConditions = await db
        .select()
        .from(conditions)
        .where(eq(conditions.conditionGroupId, parseInt(req.params.groupId)));
      
      res.json(groupConditions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conditions" });
    }
  });

  app.post("/api/conditions", async (req, res) => {
    try {
      const [newCondition] = await db
        .insert(conditions)
        .values(req.body)
        .returning();
      res.status(201).json(newCondition);
    } catch (error) {
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
        .where(eq(rules.ruleType, validation.ruleType))
        .where(eq(rules.status, 'Active'));

      // Evaluate rules logic here
      // This is a simplified version - you'd need to implement the full rule evaluation logic
      const matches = applicableRules.filter(rule => 
        (rule.country === 'Any' || rule.country === validation.country) &&
        (rule.customer === 'Any' || rule.customer === validation.customer) &&
        (rule.opportunitySource === 'Any' || rule.opportunitySource === validation.opportunitySource)
      );

      if (matches.length > 0) {
        const rule = matches[0];
        await db.insert(auditLog).values({
          request: JSON.stringify(validation),
          response: JSON.stringify(rule),
          ruleId: rule.ruleId,
          success: true
        });

        return res.json({
          isMatch: true,
          action: rule.action,
          actionMessage: rule.actionMessage
        });
      }

      res.json({
        isMatch: false,
        action: null,
        actionMessage: "No matching rules found"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to validate vehicle" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
