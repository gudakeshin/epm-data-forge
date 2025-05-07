
import { useEffect } from "react";
import { useModelContext } from "@/context/ModelContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PreviewDownloadStep = () => {
  const { 
    model, 
    previewData, 
    previewLoading, 
    generatePreview, 
    downloadData, 
    setCurrentStep 
  } = useModelContext();

  useEffect(() => {
    // Generate preview data when component mounts if no preview exists yet
    if (!previewData && !previewLoading) {
      generatePreview();
    }
  }, [previewData, previewLoading, generatePreview]);

  // Handle navigation
  const handleBack = () => {
    setCurrentStep(3);
  };

  // Get the headers from the preview data
  const getHeaders = () => {
    if (!previewData || previewData.length === 0) return [];
    return Object.keys(previewData[0]);
  };

  return (
    <div className="container max-w-4xl mx-auto">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Preview & Download</h2>
          <p className="text-muted-foreground">
            Review your generated data and download the dataset
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Model Summary</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Model Type:</span>
                  <span className="font-medium">
                    {model.type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Dimensions:</span>
                  <span className="font-medium">{model.dimensions.length}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Dependencies:</span>
                  <span className="font-medium">{model.dependencies.length}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Time Period:</span>
                  <span className="font-medium">
                    {model.timeSettings.granularity.charAt(0).toUpperCase() + 
                      model.timeSettings.granularity.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Row Count:</span>
                  <span className="font-medium">~{model.dataSettings.rowCount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Sparsity:</span>
                  <span className="font-medium">{model.dataSettings.sparsity}%</span>
                </div>
              </div>
            </div>

            <Tabs defaultValue="preview" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="preview">Data Preview</TabsTrigger>
                <TabsTrigger value="model">Model Structure</TabsTrigger>
              </TabsList>
              
              <TabsContent value="preview">
                <div className="border rounded-md">
                  {previewLoading ? (
                    <div className="py-16 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin mb-4"></div>
                      <p className="text-muted-foreground">Generating preview data...</p>
                    </div>
                  ) : !previewData || previewData.length === 0 ? (
                    <div className="py-16 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-table text-muted-foreground">
                          <path d="M12 3v18"/>
                          <rect width="18" height="18" x="3" y="3" rx="2"/>
                          <path d="M3 9h18"/>
                          <path d="M3 15h18"/>
                        </svg>
                      </div>
                      <p className="text-muted-foreground">No preview data available</p>
                      <Button onClick={generatePreview} className="mt-4">Generate Preview</Button>
                    </div>
                  ) : (
                    <div className="overflow-auto max-h-[400px]">
                      <Table>
                        <TableCaption>
                          Showing {previewData.length} of approximately {model.dataSettings.rowCount} rows
                        </TableCaption>
                        <TableHeader>
                          <TableRow>
                            {getHeaders().map((header, index) => (
                              <TableHead key={index}>{header}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                              {getHeaders().map((header, cellIndex) => (
                                <TableCell key={cellIndex}>{row[header]}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="model">
                <div className="border rounded-md p-4 space-y-6">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Dimensions</h4>
                    <div className="space-y-3">
                      {model.dimensions.map((dimension) => (
                        <div key={dimension.id} className="border rounded-md p-3">
                          <div className="flex justify-between mb-2">
                            <div>
                              <span className="font-medium">{dimension.name}</span>
                              <span className="text-xs bg-muted text-muted-foreground py-0.5 px-1.5 rounded ml-2">
                                {dimension.type}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {dimension.members.length} members
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {dimension.members.slice(0, 8).map((member) => (
                              <span 
                                key={member.id}
                                className="inline-flex items-center bg-accent text-accent-foreground py-1 px-2 rounded text-xs"
                              >
                                {member.name}
                              </span>
                            ))}
                            {dimension.members.length > 8 && (
                              <span className="inline-flex items-center bg-accent text-accent-foreground py-1 px-2 rounded text-xs">
                                +{dimension.members.length - 8} more
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {model.dependencies.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Dependencies</h4>
                      <div className="space-y-3">
                        {model.dependencies.map((dependency) => {
                          const sourceDim = model.dimensions.find(d => d.id === dependency.sourceDimensionId);
                          const targetDim = model.dimensions.find(d => d.id === dependency.targetDimensionId);
                          
                          return (
                            <div key={dependency.id} className="border rounded-md p-3">
                              <div className="flex justify-between mb-2">
                                <span className="font-medium">
                                  {sourceDim?.name} → {targetDim?.name}
                                </span>
                              </div>
                              {dependency.rule && (
                                <div className="bg-muted p-2 rounded text-sm my-2">
                                  <code>{dependency.rule}</code>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end mt-6">
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={generatePreview}
                  disabled={previewLoading}
                >
                  Regenerate Preview
                </Button>
                <Button 
                  onClick={downloadData}
                  disabled={previewLoading || !previewData}
                  className="gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                  Download Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={handleBack}>
            Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PreviewDownloadStep;
