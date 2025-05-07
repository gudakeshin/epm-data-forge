import React, { useState, useCallback, ChangeEvent, useRef } from 'react';
import { useModelContext } from '@/context/ModelContext'; // Import context hook
import { Dimension as EPMDimension } from '@/types/epm-types'; // Import and alias Dimension type
import { toast } from 'sonner'; // Import toast for feedback

// Assuming you might use shadcn/ui components, import potential candidates
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
// import { Loader2 } from "lucide-react"

// Interface for the data returned by the /upload-analyze API endpoint
interface ApiAnalysisResult { 
  commentary?: string;
  dimensions: { name: string }[]; // API returns simple name objects
  errors?: string[];
}

const FileUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<ApiAnalysisResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // State for editable dimensions - simple string array for now
  const [editedDimensions, setEditedDimensions] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setAnalysisResult(null); // Clear previous results on new file selection
      setUploadError(null);
      setEditedDimensions([]);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      setSelectedFile(event.dataTransfer.files[0]);
      setAnalysisResult(null);
      setUploadError(null);
      setEditedDimensions([]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      setUploadError('Please select a file first.');
      return;
    }

    setIsLoading(true);
    setUploadError(null);
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // Adjust URL if your backend runs elsewhere
      const response = await fetch('http://localhost:8000/upload-analyze', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || `HTTP error! status: ${response.status}`);
      }
      
      // Assuming backend returns { dimensions: [{name: 'Dim1'}...], commentary: '...', errors: [...] }
      const apiResult: ApiAnalysisResult = {
          dimensions: result.dimensions || [], // This is {name: string}[] from API
          commentary: result.commentary || '',
          errors: result.errors || []
      };

      setAnalysisResult(apiResult);
      // Initialize editable dimensions based on response
      setEditedDimensions(apiResult.dimensions.map(d => d.name));

    } catch (error: any) {
      console.error('Upload failed:', error);
      setUploadError(error.message || 'An unknown error occurred during upload.');
      setAnalysisResult(null);
      setEditedDimensions([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile]);
  
  // --- Handlers for editing dimensions (Basic Example) ---
  const handleDimensionNameChange = (index: number, newName: string) => {
      const updatedDims = [...editedDimensions];
      updatedDims[index] = newName;
      setEditedDimensions(updatedDims);
  };
  
  // Add handlers for adding/removing dimensions/members as needed

  // Get context functions
  const { setDimensions, setCurrentStep } = useModelContext();

  const handleFinalize = () => {
      console.log("Finalizing Dimensions:", editedDimensions);
      
      // Transform string array into EPMDimension objects
      const newDimensions: EPMDimension[] = editedDimensions.map((name, index) => ({
          id: `dim-upload-${Date.now()}-${index}`, // Generate a simple unique ID
          name: name.trim(), // Use the edited name
          type: 'business', // Assign 'business' as the default type
          members: [], // Start with no members defined
          description: `Dimension extracted from file header: ${name}` // Optional description
      }));
      
      // Validate names (e.g., non-empty)
      const invalidDim = newDimensions.find(d => !d.name);
      if (invalidDim) {
          toast.error("Dimension names cannot be empty.");
          return;
      }
      
      // Update context
      try {
          setDimensions(newDimensions);
          toast.success(`Set ${newDimensions.length} dimensions from file.`);
          setCurrentStep(2); // Move to the next step (Dependencies)
      } catch (error) {
          console.error("Failed to set dimensions in context:", error);
          toast.error("Failed to apply dimensions. Please check console.");
      }
  }

  // Add navigation handlers
  const handleBack = () => {
    setCurrentStep((prev: number) => Math.max(prev - 1, 0));
  };
  const handleContinue = () => {
    handleFinalize();
  };

  return (
    <div style={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
      <div
        onClick={handleAreaClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          border: '2px dashed #d1d5db',
          borderRadius: 12,
          padding: '48px 24px',
          textAlign: 'center',
          background: '#fafbfc',
          cursor: 'pointer',
          marginBottom: 24,
          position: 'relative',
        }}
      >
        {/* Upload Icon (SVG) */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#a0aec0" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l-4 4m4-4l4 4M20 16.5A2.5 2.5 0 0017.5 14h-11A2.5 2.5 0 004 16.5v0A2.5 2.5 0 006.5 19h11a2.5 2.5 0 002.5-2.5v0z" />
          </svg>
        </div>
        <div style={{ fontWeight: 600, fontSize: 20, marginBottom: 8 }}>Upload Your File</div>
        <div style={{ color: '#6b7280', marginBottom: 16 }}>Drag and drop your CSV or Excel file here or click to browse</div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={handleAreaClick}
          disabled={isLoading}
          style={{
            background: '#e0e7ff',
            color: '#2563eb',
            border: 'none',
            borderRadius: 6,
            padding: '8px 20px',
            fontWeight: 500,
            fontSize: 16,
            cursor: 'pointer',
            marginTop: 8,
          }}
        >
          Browse Files
        </button>
        {selectedFile && (
          <div style={{ marginTop: 12, color: '#4b5563', fontSize: 15 }}>
            Selected: <strong>{selectedFile.name}</strong>
          </div>
        )}
      </div>
      <button
        onClick={handleUpload}
        disabled={!selectedFile || isLoading}
        className="bg-primary text-primary-foreground rounded-md px-8 py-2 font-semibold text-base focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed w-full mb-4"
      >
        {isLoading ? 'Uploading...' : 'Upload & Analyze'}
      </button>
      {uploadError && (
        <div style={{ color: 'red', marginTop: 10, marginBottom: 10, border: '1px solid red', borderRadius: 6, padding: 10 }}>
          <strong>Upload Error:</strong> {uploadError}
        </div>
      )}
      {isLoading && <p>Analyzing file...</p>} 
      {/* Replace <p> with a Spinner/Loader component if using shadcn/ui */}
      {/* <Loader2 className="mr-2 h-4 w-4 animate-spin" /> */} 

      {analysisResult && (
        <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '15px' }}> 
        {/* Replace outer div with shadcn Card */} 
          <h3>Analysis Results</h3>
          
          {analysisResult.commentary && (
            <div style={{ marginBottom: '15px', fontStyle: 'italic', backgroundColor: '#f8f8f8', padding: '10px' }}>
                <strong>Agent Commentary:</strong>
                <p>{analysisResult.commentary}</p>
            </div>
          )}
          
          {analysisResult.errors && analysisResult.errors.length > 0 && (
             <div style={{ color: 'orange', marginBottom: '15px', border: '1px solid orange', padding: '10px' }}>
                <strong>Analysis Warnings/Errors:</strong>
                <ul>
                    {analysisResult.errors.map((err, idx) => <li key={idx}>{err}</li>)}
                </ul>
            </div>
            /* Replace with shadcn Alert warning variant */
          )}

          <h4>Detected Dimensions (Editable):</h4>
          {analysisResult && editedDimensions.length > 0 && (
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              {editedDimensions.map((dimName, index) => (
                <li key={index} style={{ marginBottom: '5px' }}>
                   <input 
                     type="text" 
                     value={dimName} 
                     onChange={(e) => handleDimensionNameChange(index, e.target.value)} 
                     style={{ marginRight: '10px' }}
                     disabled={isLoading}
                   />
                   {/* Add buttons to add/remove members or delete dimension later */}
                </li>
              ))}
            </ul>
          )}
          {analysisResult && editedDimensions.length === 0 && !analysisResult.errors?.length && <p>No dimensions were extracted from the header.</p>}

          {analysisResult && (
              <button onClick={handleFinalize} disabled={isLoading || editedDimensions.length === 0} style={{ marginTop: '15px' }}>
                  Finalize Dimensions
              </button>
          )}
        </div>
      )}
      {/* Navigation Buttons */}
      <div className="flex justify-between gap-4 mt-6">
        <button
          type="button"
          onClick={handleBack}
          className="bg-primary/10 text-primary rounded-md px-8 py-2 font-semibold text-base focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={isLoading || editedDimensions.length === 0}
          className="bg-primary text-primary-foreground rounded-md px-8 py-2 font-semibold text-base focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default FileUpload;
