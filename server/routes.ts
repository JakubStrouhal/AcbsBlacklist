import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { rules, conditionGroups, conditions, auditLog, makes, models, fuelTypes, engineTypes } from "@db/schema";
import { eq, and, gt, lt } from "drizzle-orm";
import cors from 'cors';

export function registerRoutes(app: Express): Server {
  // Enable CORS
  app.use(cors({
    origin: true,
    credentials: true
  }));

  // Vehicle data endpoints
  app.get("/api/vehicle/makes", async (req, res) => {
    try {
      const allMakes = await db
        .select()
        .from(makes)
        .where(eq(makes.isActive, true));
      res.json(allMakes);
    } catch (error) {
      console.error('Error fetching makes:', error);
      res.status(500).json({ error: "Failed to fetch makes" });
    }
  });

  app.get("/api/vehicle/models/:makeId", async (req, res) => {
    try {
      const makeModels = await db
        .select()
        .from(models)
        .where(
          and(
            eq(models.makeId, parseInt(req.params.makeId)),
            eq(models.isActive, true)
          )
        );
      res.json(makeModels);
    } catch (error) {
      console.error('Error fetching models:', error);
      res.status(500).json({ error: "Failed to fetch models" });
    }
  });

  app.get("/api/vehicle/fuel-types", async (req, res) => {
    try {
      const allFuelTypes = await db
        .select()
        .from(fuelTypes)
        .where(eq(fuelTypes.isActive, true));
      res.json(allFuelTypes);
    } catch (error) {
      console.error('Error fetching fuel types:', error);
      res.status(500).json({ error: "Failed to fetch fuel types" });
    }
  });

  app.get("/api/vehicle/engine-types", async (req, res) => {
    try {
      const allEngineTypes = await db
        .select({
          id: engineTypes.id,
          name: engineTypes.name,
          fuelTypeId: engineTypes.fuelTypeId,
          displacement: engineTypes.displacement,
          power: engineTypes.power,
          fuelTypeName: fuelTypes.name,
        })
        .from(engineTypes)
        .leftJoin(fuelTypes, eq(engineTypes.fuelTypeId, fuelTypes.id))
        .where(eq(engineTypes.isActive, true));
      res.json(allEngineTypes);
    } catch (error) {
      console.error('Error fetching engine types:', error);
      res.status(500).json({ error: "Failed to fetch engine types" });
    }
  });

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
      console.log('Validation request:', validation);

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

      console.log('Found applicable rules:', applicableRules);

      // Find matching rules based on basic criteria
      for (const rule of applicableRules) {
        try {
          // Basic criteria matching
          const basicMatch = (
            (rule.country === 'Any' || rule.country === validation.country) &&
            (rule.customer === 'Any' || rule.customer === validation.customer) &&
            (rule.opportunitySource === 'Any' || rule.opportunitySource === validation.opportunitySource)
          );

          console.log(`Rule ${rule.ruleId} basic match:`, basicMatch);

          if (!basicMatch) continue;

          // Year comparison logic
          let yearMatch = true;
          if (validation.yearComparison && validation.makeYear && rule.makeYear) {
            switch (validation.yearComparison) {
              case '=':
                yearMatch = validation.makeYear === rule.makeYear;
                break;
              case '>':
                yearMatch = validation.makeYear > rule.makeYear;
                break;
              case '<':
                yearMatch = validation.makeYear < rule.makeYear;
                break;
            }
          }

          console.log(`Rule ${rule.ruleId} year match:`, yearMatch);

          if (!yearMatch) continue;

          // Get condition groups for the rule
          const ruleGroups = await db
            .select()
            .from(conditionGroups)
            .where(eq(conditionGroups.ruleId, rule.ruleId));

          // If there are no condition groups, the rule matches
          if (ruleGroups.length === 0) {
            return res.json({
              isMatch: true,
              action: rule.action,
              actionMessage: rule.actionMessage
            });
          }

          // Check each condition group
          let allGroupsMatch = true;

          for (const group of ruleGroups) {
            const groupConditions = await db
              .select()
              .from(conditions)
              .where(eq(conditions.conditionGroupId, group.conditionGroupId));

            if (groupConditions.length === 0) continue;

            // Group conditions by orGroup
            const orGroups: Record<string, typeof groupConditions> = {};
            for (const condition of groupConditions) {
              const key = `${condition.orGroup ?? condition.conditionId}`;
              if (!orGroups[key]) orGroups[key] = [];
              orGroups[key].push(condition);
            }

            // Check if any condition in each OR group matches
            const groupMatches = Object.values(orGroups).every(orConditions =>
              orConditions.some(condition => {
                const value = validation[condition.parameter as keyof typeof validation];
                console.log(`Checking condition:`, condition, 'with value:', value);

                if (value === undefined || value === null) return false;

                switch (condition.operator) {
                  case '=':
                    return value.toString() === condition.value;
                  case '!=':
                    return value.toString() !== condition.value;
                  case '>':
                    return Number(value) > Number(condition.value);
                  case '<':
                    return Number(value) < Number(condition.value);
                  case '>=':
                    return Number(value) >= Number(condition.value);
                  case '<=':
                    return Number(value) <= Number(condition.value);
                  case 'IN':
                    const validValues = condition.value.split(',');
                    return validValues.includes(value.toString());
                  case 'NOT IN':
                    const invalidValues = condition.value.split(',');
                    return !invalidValues.includes(value.toString());
                  default:
                    return false;
                }
              })
            );

            if (!groupMatches) {
              allGroupsMatch = false;
              break;
            }
          }

          if (allGroupsMatch) {
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
        } catch (error) {
          console.error(`Error processing rule ${rule.ruleId}:`, error);
          continue;
        }
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