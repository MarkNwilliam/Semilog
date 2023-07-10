import os
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from azure.storage.blob import BlobServiceClient
from io import BytesIO
import pandas as pd
import glob
import vertexai
from vertexai.preview.language_models import ChatModel
from google.auth import credentials
from google.oauth2 import service_account
import google.cloud.aiplatform as aiplatform
import json
import io
import contextlib


app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Prompt(BaseModel):
    prompt: str
    filename: str

@app.on_event("startup")
async def startup_event():
    # Load the service account json file
    with open("participant-sa-26-ghc-025.json") as f:
        service_account_info = json.load(f)

    my_credentials = service_account.Credentials.from_service_account_info(
        service_account_info
    )

    # Initialize Google AI Platform with project details and credentials
    aiplatform.init(credentials=my_credentials)

    with open("participant-sa-26-ghc-025.json", encoding="utf-8") as f:
        project_json = json.load(f)
        project_id = project_json["project_id"]

    # Initialize Vertex AI with project and location
    vertexai.init(project=project_id, location="us-central1")

def clean_python_code(code):
    # Remove Markdown backticks
    code = code.replace("```python", "").replace("```", "")

    # Split the code by line breaks
    lines = code.split('\n')

    # Remove only trailing whitespace from each line to preserve indentation
    lines = [line.rstrip() for line in lines]

    # Remove empty lines
    lines = [line for line in lines if line]

    # Join the lines back together
    cleaned_code = '\n'.join(lines)

    return cleaned_code



@app.post("/analyze")
async def analyze_data(prompt: Prompt):
    # Azure Blob configurations
    connection_string = 'DefaultEndpointsProtocol=https;AccountName=mosistorage;AccountKey=E0h0nPOvoHKf50HoBg4vP7BBBTJ4eCnqqOWlURTbXiA5fbT/MuE0qcxUBDlNWdihlI76MzqQSaB3+ASt4/vpbg==;EndpointSuffix=core.windows.net'
    container_name = 'mosicsv'

    # Initialize BlobServiceClient
    blob_service_client = BlobServiceClient.from_connection_string(connection_string)

    # Download the CSV file from Azure Blob Storage
    csv_blob_client = blob_service_client.get_blob_client(container=container_name, blob=prompt.filename)
    csv_data = csv_blob_client.download_blob().readall()

    # Get the current directory path
    current_directory = os.getcwd()

    # Define the file destination path
    file_destination = os.path.join(current_directory, 'mosicsv', prompt.filename)

    # Create the 'mosicsv' directory if it doesn't exist
    os.makedirs(os.path.dirname(file_destination), exist_ok=True)

    # Save the downloaded CSV file to the file destination
    with open(file_destination, 'wb') as file:
        file.write(csv_data)

    # Convert the CSV file to a pandas DataFrame
    df = pd.read_csv(file_destination)

    # Get the head of the data as a preview
    data_preview = df.head().to_dict()

    chat_model = ChatModel.from_pretrained("chat-bison@001")
    parameters = {
        "temperature": 0.8,
        "max_output_tokens": 1024,
        "top_p": 0.8,
        "top_k": 40,
    }
    chat = chat_model.start_chat()
    print("Data Preview:", data_preview)
    print("File Destination:", file_destination)

    message_input = "Here's the head of my data: " + str(data_preview) + ". The CSV file is located at: " + file_destination + ". Write only python code. Can you analyze it for me by " + prompt.prompt

    chat_response = chat.send_message(message_input)

    # Clean the Python code
    cleaned_code = clean_python_code(chat_response.text)

    print("Uncleaned Code:", chat_response.text)
    print("Cleaned code:", cleaned_code)
     # Write cleaned Python code to a file
    python_code_filepath = "temp.py"
    with open(python_code_filepath, 'w') as python_file:
        python_file.write(cleaned_code)

     # Create a string buffer
    output = io.StringIO()
    # Initialize result variable
    result = None
    # Redirect standard output to the string buffer
    with contextlib.redirect_stdout(output):
     try:
         exec(cleaned_code)
         # If a .png file has been generated in the current directory, upload it to Azure
         if glob.glob("*.png"):
            image_file = glob.glob("*.png")[0]
            image_blob_client = blob_service_client.get_blob_client(container=container_name, blob=image_file)
            with open(image_file, "rb") as data:
                image_blob_client.upload_blob(data)
            os.remove(image_file)
            result = {"image_url": image_blob_client.url}
     except Exception as e:
         result = {"error": str(e)}

    # Get the print output
    printed_output = output.getvalue().strip()
    # Clean up the temporary files
    os.remove(python_code_filepath)

    if result is None:
        result = {"text_response": chat_response.text}

    # Add the printed_output to the result
    result["printed_output"] = printed_output
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
