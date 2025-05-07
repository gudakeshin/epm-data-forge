
import { useState } from "react";
import { useModelContext } from "@/context/ModelContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Dimension, DimensionType, HierarchyMember } from "@/types/epm-types";

const DimensionsStep = () => {
  const { model, addDimension, removeDimension, setCurrentStep } = useModelContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDimension, setEditingDimension] = useState<Dimension | null>(null);
  const [newDimension, setNewDimension] = useState<Dimension>({
    id: `dim-${Date.now()}`,
    name: "",
    type: "business",
    members: []
  });
  const [newMemberName, setNewMemberName] = useState("");

  // Reset form when dialog is opened/closed
  const resetDimensionForm = () => {
    setNewDimension({
      id: `dim-${Date.now()}`,
      name: "",
      type: "business",
      members: []
    });
    setNewMemberName("");
  };

  // Open dialog to create a new dimension
  const handleOpenCreateDialog = () => {
    setEditingDimension(null);
    resetDimensionForm();
    setDialogOpen(true);
  };

  // Open dialog to edit an existing dimension
  const handleOpenEditDialog = (dimension: Dimension) => {
    setEditingDimension({ ...dimension });
    setNewDimension({ ...dimension });
    setDialogOpen(true);
  };

  // Add a member to the dimension being created/edited
  const handleAddMember = () => {
    if (newMemberName.trim()) {
      const newMember: HierarchyMember = {
        id: `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: newMemberName.trim()
      };
      
      setNewDimension(prev => ({
        ...prev,
        members: [...prev.members, newMember]
      }));
      
      setNewMemberName("");
    }
  };

  // Remove a member from the dimension being created/edited
  const handleRemoveMember = (memberId: string) => {
    setNewDimension(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== memberId)
    }));
  };

  // Save the dimension
  const handleSaveDimension = () => {
    if (!newDimension.name.trim()) {
      alert("Please enter a dimension name");
      return;
    }
    
    if (newDimension.members.length === 0) {
      alert("Please add at least one member to the dimension");
      return;
    }

    addDimension({
      ...newDimension,
      id: editingDimension ? editingDimension.id : `dim-${Date.now()}`
    });
    
    setDialogOpen(false);
    resetDimensionForm();
  };

  // Delete a dimension
  const handleDeleteDimension = (dimensionId: string) => {
    if (confirm("Are you sure you want to delete this dimension? This cannot be undone.")) {
      removeDimension(dimensionId);
    }
  };

  // Handle navigation
  const handleNext = () => {
    if (model.dimensions.length === 0) {
      alert("Please add at least one dimension before proceeding");
      return;
    }
    setCurrentStep(2);
  };

  const handleBack = () => {
    setCurrentStep(0);
  };

  return (
    <div className="container max-w-4xl mx-auto">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Define Dimensions</h2>
          <p className="text-muted-foreground">
            Add the dimensions that will form the structure of your EPM model
          </p>
        </div>

        <div className="space-y-4">
          {model.dimensions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg border-muted">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-table text-muted-foreground">
                  <path d="M12 3v18"/>
                  <rect width="18" height="18" x="3" y="3" rx="2"/>
                  <path d="M3 9h18"/>
                  <path d="M3 15h18"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">No dimensions added yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Dimensions are the building blocks of your EPM model. Add time periods, accounts, entities, and other dimensions.
              </p>
              <Button variant="secondary" onClick={handleOpenCreateDialog}>
                Add First Dimension
              </Button>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Model Dimensions</h3>
                <Button onClick={handleOpenCreateDialog}>Add Dimension</Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {model.dimensions.map((dimension) => (
                  <Card key={dimension.id}>
                    <CardHeader className="pb-2 flex flex-row items-start justify-between">
                      <div>
                        <div className="py-1 px-2 rounded text-xs bg-muted mb-1 inline-block">
                          {dimension.type === 'time' && 'Time Dimension'}
                          {dimension.type === 'version' && 'Version Dimension'}
                          {dimension.type === 'business' && 'Business Dimension'}
                          {dimension.type === 'measure' && 'Measure Dimension'}
                        </div>
                        <CardTitle>{dimension.name}</CardTitle>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleOpenEditDialog(dimension)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-edit">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteDimension(dimension.id)}
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
                      <div className="text-sm text-muted-foreground mb-2">
                        {dimension.members.length} members
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {dimension.members.slice(0, 5).map((member) => (
                          <div 
                            key={member.id} 
                            className="inline-flex items-center bg-accent text-accent-foreground py-1 px-2 rounded text-xs"
                          >
                            {member.name}
                          </div>
                        ))}
                        {dimension.members.length > 5 && (
                          <div className="inline-flex items-center bg-accent text-accent-foreground py-1 px-2 rounded text-xs">
                            +{dimension.members.length - 5} more
                          </div>
                        )}
                      </div>
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

      {/* Dimension Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDimension ? "Edit Dimension" : "Add Dimension"}
            </DialogTitle>
            <DialogDescription>
              Define your dimension and add members
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="dimension-name" className="text-sm font-medium">
                  Dimension Name
                </label>
                <Input
                  id="dimension-name"
                  value={newDimension.name}
                  onChange={(e) => setNewDimension({ ...newDimension, name: e.target.value })}
                  placeholder="e.g., Time, Region, Product"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="dimension-type" className="text-sm font-medium">
                  Dimension Type
                </label>
                <Select
                  value={newDimension.type}
                  onValueChange={(value: DimensionType) => 
                    setNewDimension({ ...newDimension, type: value })
                  }
                >
                  <SelectTrigger id="dimension-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time">Time</SelectItem>
                    <SelectItem value="version">Version</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="measure">Measure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label htmlFor="member-name" className="text-sm font-medium">
                  Add Members
                </label>
                <span className="text-xs text-muted-foreground">
                  {newDimension.members.length} members added
                </span>
              </div>
              <div className="flex gap-2">
                <Input
                  id="member-name"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Enter member name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMember();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddMember}>Add</Button>
              </div>
            </div>
            
            {newDimension.members.length > 0 && (
              <div className="border rounded-md p-4">
                <h4 className="text-sm font-medium mb-2">Members</h4>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {newDimension.members.map((member) => (
                    <div 
                      key={member.id} 
                      className="flex items-center justify-between bg-accent p-2 rounded-sm"
                    >
                      <span className="text-sm">{member.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
                          <path d="M18 6 6 18" />
                          <path d="m6 6 12 12" />
                        </svg>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDimension}>
              Save Dimension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DimensionsStep;
