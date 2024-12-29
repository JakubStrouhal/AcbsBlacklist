import { db } from "@db";
import { rules } from "@db/schema";
import { eq, and } from "drizzle-orm";
import type { ValidationRequest } from "../client/src/lib/api";

async function listRules() {
  try {
    const allRules = await db.select().from(rules);
    console.log("\nCurrent Vehicle Validation Rules:");
    console.log("================================");
    if (allRules.length === 0) {
      console.log("\nNo rules found in the database.");
      return;
    }

    allRules.forEach(rule => {
      console.log(`\nRule ID: ${rule.ruleId}`);
      console.log(`Name: ${rule.ruleName}`);
      console.log(`Type: ${rule.ruleType}`);
      console.log(`Status: ${rule.status}`);
      console.log(`Action: ${rule.action}`);
      console.log(`Country: ${rule.country}`);
      console.log("--------------------------------");
    });
  } catch (error) {
    console.error("Error fetching rules:", error);
    process.exit(1);
  }
}

async function validateVehicle(data: ValidationRequest) {
  try {
    // Fetch applicable rules with proper filtering
    const applicableRules = await db
      .select()
      .from(rules)
      .where(and(
        eq(rules.ruleType, data.ruleType),
        eq(rules.status, 'Active')
      ));

    const matches = applicableRules.filter(rule =>
      (rule.country === 'Any' || rule.country === data.country) &&
      (rule.customer === 'Any' || rule.customer === data.customer) &&
      (rule.opportunitySource === 'Any' || rule.opportunitySource === data.opportunitySource) &&
      (!rule.validUntil || new Date(rule.validUntil) > new Date())
    );

    console.log("\nValidation Result:");
    console.log("=================");

    if (matches.length > 0) {
      const rule = matches[0];
      console.log(`Match Found: Rule "${rule.ruleName}"`);
      console.log(`Action: ${rule.action}`);
      console.log(`Message: ${rule.actionMessage || 'No message provided'}`);
    } else {
      console.log("No matching rules found for the given vehicle.");
    }
  } catch (error) {
    console.error("Error validating vehicle:", error);
    process.exit(1);
  }
}

async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case "list":
        await listRules();
        break;
      case "validate":
        // Example validation request
        const sampleVehicle: ValidationRequest = {
          ruleType: "Global",
          country: "CZ",
          opportunitySource: "Webform",
          customer: "Private",
          make: "Škoda",
          makeYear: 2010,
          tachometer: 280000,
          fuelType: "Diesel",
          price: 450000
        };
        await validateVehicle(sampleVehicle);
        break;
      default:
        console.log(`
Vehicle Validation Rules CLI
==========================
Available commands:
  - list: Show all rules
  - validate: Test validation with a sample vehicle
        `);
    }
  } catch (error) {
    console.error("An unexpected error occurred:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the CLI
main();