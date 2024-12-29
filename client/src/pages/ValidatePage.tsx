import { useLocation } from "wouter";
import { ValidateRuleForm } from "@/components/ValidateRuleForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ValidatePage() {
  const [, navigate] = useLocation();

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Go Back
          </Button>
          <h1 className="text-2xl font-bold">ACBS Buying Rules</h1>
        </div>
      </div>
      <ValidateRuleForm />
    </div>
  );
}