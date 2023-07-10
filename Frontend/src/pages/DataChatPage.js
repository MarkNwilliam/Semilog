import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import DataGrid from 'react-data-grid';
import Swal from 'sweetalert2';
import { BlobServiceClient } from '@azure/storage-blob';
import { FaHome } from 'react-icons/fa';
import { useNavigate } from "react-router-dom";

const DataChatPage = () => {
  const [csvData, setCsvData] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [textResponse, setTextResponse] = useState('');
const [printedOutput, setPrintedOutput] = useState('');
  const [result, setResult] = useState('');
  const [plotImageUrl, setPlotImageUrl] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [uploadedCsvData, setUploadedCsvData] = useState([]);
  const [connectedStatus, setConnectedStatus] = useState('');
  const [blobName, setBlobName] = useState('');

  useEffect(() => {
    fetch('https://api.mosiai.studio/app1/connected')
      .then(response => response.text())
      .then(data => {
        setConnectedStatus(data);
      })
      .catch(error => {
        console.error('Error fetching server status:', error);
      });
  }, []);

  const handlePromptChange = (e) => {
    setPrompt(e.target.value);
  };

  const handleAnalysis = () => {
    if (!prompt || !blobName) {
      Swal.fire('Please enter a prompt and upload a file');
      return;
    }

    setIsLoading(true);

    fetch('https://api.mosiai.studio/app2/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt,  filename: blobName})
    })
      .then(response => response.json())
      .then(data => {
        setResult(data);
        setPrintedOutput(data.printed_output);  
        setPlotImageUrl(data.image_url);  // Set the plot image URL
        console.log(data); // Logs the data to the console
     
        setIsLoading(false);
      })
      .catch(error => {
        console.error('An error occurred during analysis:', error);
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: 'Something went wrong!'
        });
        setIsLoading(false);
      });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];

    if (!file) {
      return;
    }

    setBlobName(`mosicsv/${file.name}`);

    try {
      setIsLoading(true);

      
      // You should replace this string with your Blob SAS URL
      const sasUrl = "https://mosistorage.blob.core.windows.net/mosicsv?sp=racwdli&st=2023-07-04T16:36:55Z&se=2024-08-10T00:36:55Z&sv=2022-11-02&sr=c&sig=1ih1mqhCRb8qoRSWUfDsNwPwNbx23eQF3DfpADxCTHQ%3D"
      const blobServiceClient = new BlobServiceClient(sasUrl);
      const containerClient = blobServiceClient.getContainerClient('mosicsv');
      const blockBlobClient = containerClient.getBlockBlobClient(file.name);

      Swal.fire({
        title: 'Uploading...',
        html: 'Please wait...',
        allowEscapeKey: false,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      await blockBlobClient.uploadData(file, {
        onProgress: (progress) => {
          const progressPercentage = Math.round((progress.loadedBytes / progress.totalBytes) * 100);
          Swal.update({
            title: 'Uploading...',
            html: `Please wait... (${progressPercentage}%)`
          });
        }
      });

      Swal.close();

      Swal.fire('Success!', 'File uploaded successfully', 'success');

      const uploadedCsvData = await fetchAndParseCsvFromAzureBlob(blockBlobClient.url);
      setUploadedCsvData(uploadedCsvData);
      setIsLoading(false);
    } catch (error) {
      console.error('An error occurred during file upload:', error);
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Something went wrong!'
      });
      setIsLoading(false);
    }
  };

  const fetchAndParseCsvFromAzureBlob = async (csvUrl) => {
    try {
      const response = await fetch(csvUrl);

      if (!response.ok) {
        throw new Error(`Error downloading CSV file: ${response.status} - ${response.statusText}`);
      }

      const csvText = await response.text();
      const parsedData = Papa.parse(csvText, { header: true }).data;

      return parsedData;
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  };
  const navigate = useNavigate();

  const goBack = () => {
     navigate("/")
  };

  return (
<div className="flex flex-col items-center justify-center min-h-screen bg-blue-100 overflow-auto">

      <div className="mb-4">
        <h1 className="text-4xl font-bold">Semi Log <span className="text-sm font-normal text-red-500">(Beta)</span></h1>
      </div>
      <div className="mb-6">
        <p className="text-yellow-500 mb-2">Server Status: {connectedStatus}</p>
      </div>
      <div className="mb-6">
        <label className="block text-gray-700 font-bold mb-2" htmlFor="prompt">
          Prompt
        </label>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          id="prompt"
          type="text"
          placeholder="Enter the prompt"
          value={prompt}
          onChange={handlePromptChange}
        />
      </div>

      <div className="mb-6">
        <button
          className="bg-blue-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleAnalysis}
        >
          Analyze
        </button>
      </div>

      {isLoading && (
        <div className="text-center">
          <p className="text-gray-500">Analyzing data...</p>
          <div className="mt-2">
            {/* Add your loading animation here */}
          </div>
        </div>
      )}

<div className="h-30 overflow-auto relative mb-6">
  {printedOutput && printedOutput.split(/\n/g).map((item, index) => (
    <div key={index} className="mt-4 bg-blue-100 p-4 rounded-md">
      <p className="text-blue-600">{item.trim()}</p>
    </div>
  ))}
</div>



{plotImageUrl && <img src={plotImageUrl} alt="Plot Image" />}




<div className="mb-6">
  <label className="block text-gray-700 font-bold mb-2" htmlFor="csv-file">
    Upload CSV File
  </label>
  <div className="flex items-center">
    <input
      id="csv-file"
      type="file"
      accept=".csv"
      onChange={handleFileChange}
      className="hidden"
    />
    <label
      htmlFor="csv-file"
      className="bg-green-500 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-green-600"
    >
      Choose File
    </label>
    <span className="ml-2">{blobName}</span> {/* Display the selected file name */}
  </div>

</div>


      <div className="h-64 overflow-x-auto mb-6 shadow-md">
  {uploadedCsvData.length > 0 && (
    <table className="table-auto w-full">
      <thead>
        <tr>
          {Object.keys(uploadedCsvData[0]).map((key, index) => (
            <th key={index} className="px-4 py-2 bg-gray-200">{key}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {uploadedCsvData.slice(0, 10).map((row, index) => (
          <tr key={index}>
            {Object.values(row).map((value, index) => (
              <td key={index} className="border px-4 py-2">{value}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )}
</div>


      <button
        className="fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={goBack}
      >
        <FaHome className="mr-2" /> Back
      </button>
    </div>
  );
};

export default DataChatPage;