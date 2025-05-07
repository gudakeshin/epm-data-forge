
import { useState } from "react";
import { useModelContext } from "@/context/ModelContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dependency } from "@/types/epm-types";

const DependenciesStep = () => {
  const { model, addDependency, removeDependency, setCurrentStep } = useModelContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDependency, setEditingDependency] = useState<Dependency | null>(null);
  const [newDependency, setNewDependency] = useState<Dependency>({
    id: `dep-${Date.now()}`,
    sourceDimensionId: "",
    sourceMembers: [],
    targetDimensionId: "",
    targetMembers: [],
    rule: ""
  });
  
  // Reset form when dialog is opened/closed
  const resetDependencyForm = () => {
    setNewDependency({
      id: `dep-${Date.now()}`,
      sourceDimensionId: "",
      sourceMembers: [],
      targetDimensionId: "",
      targetMembers: [],
      rule: ""
    });
  };

  // Open dialog to create a new dependency
  const handleOpenCreateDialog = () => {
    setEditingDependency(null);
    resetDependencyForm();
    setDialogOpen(true);
  };

  // Open dialog to edit an existing dependency
  const handleOpenEditDialog = (dependency: Dependency) => {
    setEditingDependency({ ...dependency });
    setNewDependency({ ...dependency });
    setDialogOpen(true);
  };

  // Toggle member selection for source or target
  const handleToggleMember = (dimensionId: string, memberId: string, isSource: boolean) => {
    if (isSource) {
      setNewDependency(prev => {
        const isSelected = prev.sourceMembers.includes(memberId);
        return {
          ...prev,
          sourceMembers: isSelected
            ? prev.sourceMembers.filter(id => id !== memberId)
            : [...prev.sourceMembers, memberId]
        };
      });
    } else {
      setNewDependency(prev => {
        const isSelected = prev.targetMembers.includes(memberId);
        return {
          ...prev,
          targetMembers: isSelected
            ? prev.targetMembers.filter(id => id !== memberId)
            : [...prev.targetMembers, memberId]
        };
      });
    }
  };

  // Save the dependency
  const handleSaveDependency = () => {
    if (!newDependency.sourceDimensionId || !newDependency.targetDimensionId) {
      alert("Please select source and target dimensions");
      return;
    }
    
    if (newDependency.sourceMembers.length === 0 || newDependency.targetMembers.length === 0) {
      alert("Please select at least one member for both source and target");
      return;
    }

    addDependency({
      ...newDependency,
      id: editingDependency ? editingDependency.id : `dep-${Date.now()}`
    });
    
    setDialogOpen(false);
    resetDependencyForm();
  };

  // Delete a dependency
  const handleDeleteDependency = (dependencyId: string) => {
    if (confirm("Are you sure you want to delete this dependency? This cannot be undone.")) {
      removeDependency(dependencyId);
    }
  };

  // Get dimension name by ID
  const getDimensionName = (dimensionId: string) => {
    const dimension = model.dimensions.find(d => d.id === dimensionId);
    return dimension ? dimension.name : "Unknown";
  };

  // Get member names for a list of member IDs
  const getMemberNames = (dimensionId: string, memberIds: string[]) => {
    const dimension = model.dimensions.find(d => d.id === dimensionId);
    if (!dimension) return [];
    
    const memberMap = new Map<string, string>();
    const flattenMembers = (members: typeof dimension.members, map: Map<string, string>) => {
      members.forEach(member => {
        map.set(member.id, member.name);
        if (member.children) {
          flattenMembers(member.children, map);
        }
      });
    };
    
    flattenMembers(dimension.members, memberMap);
    
    return memberIds.map(id => memberMap.get(id) || "Unknown");
  };

  // Handle navigation
  const handleNext = () => {
    setCurrentStep(3);
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  return (
    <div className="container max-w-4xl mx-auto">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Define Dependencies</h2>
          <p className="text-muted-foreground">
            Set up relationships and calculations between dimensions
          </p>
        </div>

        <div className="space-y-4">
          {model.dependencies.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg border-muted">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-minus text-muted-foreground">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="9" x2="15" y1="15" y2="15"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">No dependencies added yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Dependencies define relationships between dimensions and how data should be calculated or restricted.
              </p>
              <Button 
                variant="secondary" 
                onClick={handleOpenCreateDialog}
                disabled={model.dimensions.length < 2}
              >
                Add First Dependency
              </Button>
              {model.dimensions.length < 2 && (
                <p className="text-sm text-muted-foreground mt-2">
                  You need at least 2 dimensions to create dependencies
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Model Dependencies</h3>
                <Button onClick={handleOpenCreateDialog}>Add Dependency</Button>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {model.dependencies.map((dependency) => (
                  <Card key={dependency.id}>
                    <CardHeader className="pb-2 flex flex-row items-start justify-between">
                      <div>
                        <CardTitle>
                          {getDimensionName(dependency.sourceDimensionId)} → {getDimensionName(dependency.targetDimensionId)}
                        </CardTitle>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleOpenEditDialog(dependency)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-edit">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteDependency(dependency.id)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2">
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            <line x1="10" x2="10" y1="11" y2="17" />
                            <line x1="14" x2="14" y1="11" y2="17" />
                          </svg>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-1">Source Members</h4>
                          <div className="flex flex-wrap gap-1">
                            {getMemberNames(dependency.sourceDimensionId, dependency.sourceMembers)
                              .slice(0, 3)
                              .map((name, i) => (
                                <div 
                                  key={i}
                                  className="inline-flex items-center bg-accent text-accent-foreground py-1 px-2 rounded text-xs"
                                >
                                  {name}
                                </div>
                              ))}
                            {dependency.sourceMembers.length > 3 && (
                              <div className="inline-flex items-center bg-accent text-accent-foreground py-1 px-2 rounded text-xs">
                                +{dependency.sourceMembers.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-1">Target Members</h4>
                          <div className="flex flex-wrap gap-1">
                            {getMemberNames(dependency.targetDimensionId, dependency.targetMembers)
                              .slice(0, 3)
                              .map((name, i) => (
                                <div 
                                  key={i}
                                  className="inline-flex items-center bg-accent text-accent-foreground py-1 px-2 rounded text-xs"
                                >
                                  {name}
                                </div>
                              ))}
                            {dependency.targetMembers.length > 3 && (
                              <div className="inline-flex items-center bg-accent text-accent-foreground py-1 px-2 rounded text-xs">
                                +{dependency.targetMembers.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {dependency.rule && (
                        <div className="mt-3 pt-3 border-t">
                          <h4 className="text-sm font-medium mb-1">Calculation Rule</h4>
                          <div className="bg-muted p-2 rounded text-sm font-mono">
                            {dependency.rule}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={handleBack}>
            Back
          </Button>
          <Button onClick={handleNext}>
            Continue
          </Button>
        </div>
      </div>

      {/* Dependency Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDependency ? "Edit Dependency" : "Add Dependency"}
            </DialogTitle>
            <DialogDescription>
              Define relationships between dimensions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="source-dimension" className="text-sm font-medium">
                  Source Dimension
                </label>
                <Select
                  value={newDependency.sourceDimensionId}
                  onValueChange={(value) => {
                    setNewDependency({
                      ...newDependency,
                      sourceDimensionId: value,
                      sourceMembers: []
                    });
                  }}
                >
                  <SelectTrigger id="source-dimension">
                    <SelectValue placeholder="Select dimension" />
                  </SelectTrigger>
                  <SelectContent>
                    {model.dimensions.map((dimension) => (
                      <SelectItem 
                        key={dimension.id} 
                        value={dimension.id}
                        disabled={dimension.id === newDependency.targetDimensionId}
                      >
                        {dimension.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="target-dimension" className="text-sm font-medium">
                  Target Dimension
                </label>
                <Select
                  value={newDependency.targetDimensionId}
                  onValueChange={(value) => {
                    setNewDependency({
                      ...newDependency,
                      targetDimensionId: value,
                      targetMembers: []
                    });
                  }}
                >
                  <SelectTrigger id="target-dimension">
                    <SelectValue placeholder="Select dimension" />
                  </SelectTrigger>
                  <SelectContent>
                    {model.dimensions.map((dimension) => (
                      <SelectItem 
                        key={dimension.id} 
                        value={dimension.id}
                        disabled={dimension.id === newDependency.sourceDimensionId}
                      >
                        {dimension.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Source Members</label>
                {newDependency.sourceDimensionId ? (
                  <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto">
                    {model.dimensions
                      .find(d => d.id === newDependency.sourceDimensionId)
                      ?.members.map(member => (
                        <div key={member.id} className="flex items-center space-x-2 mb-2">
                          <Checkbox
                            id={`source-${member.id}`}
                            checked={newDependency.sourceMembers.includes(member.id)}
                            onCheckedChange={() => {
                              handleToggleMember(
                                newDependency.sourceDimensionId,
                                member.id,
                                true
                              );
                            }}
                          />
                          <label
                            htmlFor={`source-${member.id}`}
                            className="text-sm"
                          >
                            {member.name}
                          </label>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground h-[200px] flex items-center justify-center border border-dashed rounded-md">
                    Select a source dimension first
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Members</label>
                {newDependency.targetDimensionId ? (
                  <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto">
                    {model.dimensions
                      .find(d => d.id === newDependency.targetDimensionId)
                      ?.members.map(member => (
                        <div key={member.id} className="flex items-center space-x-2 mb-2">
                          <Checkbox
                            id={`target-${member.id}`}
                            checked={newDependency.targetMembers.includes(member.id)}
                            onCheckedChange={() => {
                              handleToggleMember(
                                newDependency.targetDimensionId,
                                member.id,
                                false
                              );
                            }}
                          />
                          <label
                            htmlFor={`target-${member.id}`}
                            className="text-sm"
                          >
                            {member.name}
                          </label>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground h-[200px] flex items-center justify-center border border-dashed rounded-md">
                    Select a target dimension first
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="calculation-rule" className="text-sm font-medium">
                Calculation Rule (Optional)
              </label>
              <Input
                id="calculation-rule"
                value={newDependency.rule || ""}
                onChange={(e) => setNewDependency({ ...newDependency, rule: e.target.value })}
                placeholder="e.g., target = source1 * source2"
              />
              <p className="text-xs text-muted-foreground">
                Define formulas to calculate values or relationships between members
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDependency}>
              Save Dependency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DependenciesStep;
