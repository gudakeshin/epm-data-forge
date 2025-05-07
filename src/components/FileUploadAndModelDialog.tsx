import React, { useState } from 'react';

interface DimensionOrMeasure {
  name: string;
  members: string[];
  type: string;
  unique_count: number;
  null_count: number;
}

interface Hypothesis {
  extracted_dimensions: DimensionOrMeasure[];
  commentary: string;
  errors: string[];
}

interface Props {
  onConfirm: (dimensions: Record<string, string[]>, measures: string[]) => void;
}

const FileUploadAndModelDialog: React.FC<Props> = ({ onConfirm }) => {
  const [file, setFile] = useState<File | null>(null);
  const [hypothesis, setHypothesis] = useState<Hypothesis | null>(null);
  const [dimensions, setDimensions] = useState<Record<string, string[]>>({});
  const [measures, setMeasures] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setHypothesis(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/upload-analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.errors && data.errors.length > 0) {
        setError(data.errors.join('\n'));
      } else {
        // Support both old and new formats
        let extracted_dimensions: DimensionOrMeasure[] = [];
        if (Array.isArray(data.extracted_dimensions)) {
          extracted_dimensions = data.extracted_dimensions;
        } else if (Array.isArray(data.dimensions)) {
          extracted_dimensions = data.dimensions;
        }
        setHypothesis({
          extracted_dimensions,
          commentary: data.commentary,
          errors: data.errors || [],
        });
        // Preselect dimensions and measures
        const dims: Record<string, string[]> = {};
        const meas: string[] = [];
        extracted_dimensions.forEach((d) => {
          if (d.members && d.members.length > 0) {
            dims[d.name] = d.members;
          } else {
            meas.push(d.name);
          }
        });
        setDimensions(dims);
        setMeasures(meas);
      }
    } catch (err) {
      setError('Failed to analyze file.');
    } finally {
      setLoading(false);
    }
  };

  const handleDimensionChange = (col: string, checked: boolean) => {
    if (!hypothesis) return;
    const dimObj = hypothesis.extracted_dimensions.find(d => d.name === col);
    if (!dimObj) return;
    if (checked) {
      // Move from measures to dimensions
      setMeasures(measures.filter(m => m !== col));
      setDimensions({ ...dimensions, [col]: dimObj.members });
    } else {
      // Move from dimensions to measures
      const newDims = { ...dimensions };
      delete newDims[col];
      setDimensions(newDims);
      setMeasures([...measures, col]);
    }
  };

  const handleConfirm = () => {
    onConfirm(dimensions, measures);
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: 24, borderRadius: 8, maxWidth: 700, margin: '24px auto' }}>
      <h2>Upload Data File</h2>
      <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={!file || loading} style={{ marginLeft: 8 }}>
        {loading ? 'Analyzing...' : 'Analyze'}
      </button>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      {hypothesis && (
        <div style={{ marginTop: 24 }}>
          <h3>Model Hypothesis</h3>
          <div style={{ fontStyle: 'italic', color: '#555' }}>{hypothesis.commentary}</div>
          <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ccc' }}>Column</th>
                <th style={{ borderBottom: '1px solid #ccc' }}>Type</th>
                <th style={{ borderBottom: '1px solid #ccc' }}>Unique Members</th>
                <th style={{ borderBottom: '1px solid #ccc' }}>Is Dimension?</th>
              </tr>
            </thead>
            <tbody>
              {hypothesis.extracted_dimensions.map(dim => (
                <tr key={dim.name}>
                  <td>{dim.name}</td>
                  <td>{dim.members.length > 0 ? 'Dimension' : 'Measure'}</td>
                  <td>{dim.members.length > 0 ? dim.members.join(', ') : '-'}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!dimensions[dim.name]}
                      onChange={e => handleDimensionChange(dim.name, e.target.checked)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleConfirm} style={{ marginTop: 16 }}>
            Confirm & Generate
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUploadAndModelDialog; 