import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Plus, Edit, Trash } from "lucide-react";
import { api } from "@/lib/api";
import { Rule } from "@db/schema";

export default function RulesPage() {
  const [, navigate] = useLocation();
  const { data: rules, isLoading } = useQuery({
    queryKey: ['rules'],
    queryFn: api.getRules,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Vehicle Validation Rules</CardTitle>
          <Button onClick={() => navigate("/rules/new")}>
            <Plus className="mr-2 h-4 w-4" /> Add New Rule
          </Button>
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
                <TableHead>Creator</TableHead>
                <TableHead>Modified</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules?.map((rule) => (
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
                  <TableCell>{rule.creator}</TableCell>
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
                    <Button variant="ghost" size="icon">
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
