
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function DocsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold mb-8">Vehicle Validation System Documentation</h1>
      
      <div className="prose prose-lg max-w-none">
        <section className="mb-8">
          <h2>Overview</h2>
          <p>This system provides validation of vehicles against defined business rules. It supports both global and local validation rules with configurable conditions and actions.</p>
        </section>

        <Accordion type="single" collapsible>
          <AccordionItem value="data-model">
            <AccordionTrigger>Data Model</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold">Rules</h3>
                  <ul className="list-disc pl-6">
                    <li>Rule Type: Global/Local</li>
                    <li>Status: Active/Inactive/Draft</li>
                    <li>Action: POZVI - NESLIBUJ, POZVI SWAPEM - NESLIBUJ, NEZVI - NECHCEME</li>
                    <li>Customer Type: Private/Company/Any</li>
                    <li>Country: CZ/SK/PL/Any</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-bold">Condition Groups</h3>
                  <p>Groups of conditions that must all be satisfied for a rule to match.</p>
                </div>
                
                <div>
                  <h3 className="font-bold">Conditions</h3>
                  <p>Individual criteria with parameters, operators, and values.</p>
                  <ul className="list-disc pl-6">
                    <li>Parameters: make, model, year, price, etc.</li>
                    <li>Operators: =, !=, IN, NOT IN, >, <, >=, <=, BETWEEN</li>
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="validation">
            <AccordionTrigger>Validation Process</AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal pl-6">
                <li>System receives vehicle parameters</li>
                <li>Matches against active rules of specified type</li>
                <li>Evaluates basic criteria (country, customer, source)</li>
                <li>Processes condition groups and their conditions</li>
                <li>Returns match result with appropriate action</li>
              </ol>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
