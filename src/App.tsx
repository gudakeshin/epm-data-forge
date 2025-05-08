import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { useEffect, useState } from 'react';
import { useStatusStore } from './stores/statusStore';
import AgentStatusDisplay from './components/AgentStatusDisplay';
import { ErrorBoundary } from 'react-error-boundary';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import FileUploadAndModelDialog from './components/FileUploadAndModelDialog';

// Create a custom error fallback component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          <p>Something went wrong:</p>
          <pre className="mt-2 text-sm">{error.message}</pre>
          <button
            onClick={resetErrorBoundary}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try again
          </button>
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Configure query client with better error handling and retry logic
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([]);
  const [numRecords, setNumRecords] = useState(1000);
  const connectWebSocket = useStatusStore((state) => state.connectWebSocket);
  const disconnectWebSocket = useStatusStore((state) => state.disconnectWebSocket);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true);
        await connectWebSocket();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();

    return () => {
      disconnectWebSocket();
    };
  }, [connectWebSocket, disconnectWebSocket]);

  // Handler for confirmed model structure and measure settings
  const handleModelConfirm = async (
    dimensions: Record<string, string[]>,
    measures: string[],
    measureSettings: Record<string, any>,
    randomSeed?: number
  ) => {
    // Prompt for number of records
    let records = numRecords;
    const userInput = window.prompt('How many records to generate?', numRecords.toString());
    if (userInput) {
      const parsed = parseInt(userInput, 10);
      if (!isNaN(parsed) && parsed > 0) records = parsed;
    }
    setNumRecords(records);

    // Build GenerationConfig payload
    const dimensionObjs = Object.entries(dimensions).map(([name, members]) => ({ name, members }));
    const payload = {
      model_type: 'Custom',
      dimensions: dimensionObjs,
      dependencies: [],
      settings: {
        num_records: records,
        sparsity: 0.0,
        data_patterns: null,
        random_seed: randomSeed ?? null,
        measure_settings: measureSettings,
      },
    };

    // Call /generate-stream and show preview
    setIsLoading(true);
    try {
      const res = await fetch('/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      // /generate-stream returns a streaming response (newline-delimited JSON chunks)
      const reader = res.body?.getReader();
      let allRows: any[] = [];
      if (reader) {
        let done = false;
        let decoder = new TextDecoder();
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          if (value) {
            const text = decoder.decode(value);
            // Each chunk is a JSON array (with newline)
            text.split('\n').forEach(chunk => {
              if (chunk.trim()) {
                try {
                  const rows = JSON.parse(chunk);
                  if (Array.isArray(rows)) allRows = allRows.concat(rows);
                } catch {}
              }
            });
          }
          done = doneReading;
        }
      }
      setPreviewData(allRows.slice(0, 100)); // Show first 100 rows as preview
    } catch (err) {
      alert('Failed to generate data.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <AgentStatusDisplay />
          {previewData.length > 0 && (
            <div style={{ maxWidth: 900, margin: '32px auto', background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 24 }}>
              <h3>Generated Data Preview (first 100 rows)</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {Object.keys((previewData as any[])[0]).map(col => (
                        <th key={col} style={{ borderBottom: '1px solid #ccc', padding: 4 }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(previewData as any[]).map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((val, j) => (
                          <td key={j} style={{ borderBottom: '1px solid #eee', padding: 4 }}>{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
