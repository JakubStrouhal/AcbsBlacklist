import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash, CheckCircle, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { Rule } from "@db/schema";
import { RPanel } from "@/components/RPanel";
import { useToast } from "@/hooks/use-toast";

interface FilterState {
  ruleType: string | null;
  status: string | null;
  country: string | null;
  customer: string | null;
  opportunitySource: string | null;
}

export default function RulesPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FilterState>({
    ruleType: null,
    status: null,
    country: null,
    customer: null,
    opportunitySource: null,
  });

  const { data: rules, isLoading } = useQuery({
    queryKey: ['rules'],
    queryFn: api.getRules,
  });

  const filteredRules = rules?.filter(rule => {
    if (filters.ruleType && rule.ruleType !== filters.ruleType) return false;
    if (filters.status && rule.status !== filters.status) return false;
    if (filters.country && rule.country !== filters.country) return false;
    if (filters.customer && rule.customer !== filters.customer) return false;
    if (filters.opportunitySource && rule.opportunitySource !== filters.opportunitySource) return false;
    return true;
  });

  const handleDeleteRule = async (ruleId: number) => {
    try {
      const response = await fetch(`/api/rules/${ruleId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await queryClient.invalidateQueries({ queryKey: ['rules'] });
      toast({
        title: "Success",
        description: "Rule deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete rule",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6 relative">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">ACBS Buying Rules</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/validate")}>
              <CheckCircle className="mr-2 h-4 w-4" /> Validate Vehicle
            </Button>
            <Button variant="outline" onClick={() => window.open('/api-docs', '_blank')}>
              <FileText className="mr-2 h-4 w-4" /> API Documentation
            </Button>
            <Button 
              onClick={() => navigate("/rules/new")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" /> Add New Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Modified</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules?.map((rule) => (
                <TableRow key={rule.ruleId}>
                  <TableCell className="font-medium">{rule.ruleName}</TableCell>
                  <TableCell>
                    <Badge variant={rule.ruleType === 'Global' ? 'default' : 'secondary'}>
                      {rule.ruleType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={rule.status === 'Active' ? 'success' : 'warning'}>
                      {rule.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{rule.action}</TableCell>
                  <TableCell>{rule.country}</TableCell>
                  <TableCell>{rule.createdBy}</TableCell>
                  <TableCell>
                    {new Date(rule.lastModifiedDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/rules/${rule.ruleId}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the rule
                            "{rule.ruleName}" and all its associated conditions.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteRule(rule.ruleId)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <RPanel onFilterChange={setFilters} />
    </div>
  );
}