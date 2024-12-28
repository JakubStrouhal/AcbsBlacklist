import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { rules, auditLog } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
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
      const [rule] = await db
        .select()
        .from(rules)
        .where(eq(rules.ruleId, parseInt(req.params.id)));

      if (!rule) {
        return res.status(404).json({ error: "Rule not found" });
      }

      res.json(rule);
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
      const updateData = {
        ...req.body,
        lastModifiedDate: new Date(),
        validUntil: req.body.validUntil ? new Date(req.body.validUntil) : null
      };

      const [updatedRule] = await db
        .update(rules)
        .set(updateData)
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

      // Find matching rules based on basic criteria
      const matches = applicableRules.filter(rule => 
        (rule.country === 'Any' || rule.country === validation.country) &&
        (rule.customer === 'Any' || rule.customer === validation.customer) &&
        (rule.opportunitySource === 'Any' || rule.opportunitySource === validation.opportunitySource) &&
        (!rule.validUntil || new Date(rule.validUntil) > new Date())
      );

      if (matches.length > 0) {
        const rule = matches[0]; // Use the first matching rule

        // Log the validation attempt
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