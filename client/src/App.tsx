import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import RulesPage from "./pages/RulesPage";
import RuleBuilder from "./pages/RuleBuilder";
import ValidatePage from "./pages/ValidatePage";

function App() {
  return (
    <>
      <Switch>
        <Route path="/" component={RulesPage} />
        <Route path="/rules/new" component={RuleBuilder} />
        <Route path="/rules/:id" component={RuleBuilder} />
        <Route path="/validate" component={ValidatePage} />
      </Switch>
      <Toaster />
    </>
  );
}

export default App;