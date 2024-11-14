const fs = require('fs');
const path = require('path');
const recursive = require('recursive-readdir');
const { ClarifaiStub, grpc } = require("clarifai-nodejs-grpc");

// Replace with your Clarifai API key
const CLARIFAI_API_KEY = 'c239bf7ec6bf4a8aa8c0f4ef82586fe4';

// Initialize Clarifai client
const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();
metadata.set("authorization", `Key ${CLARIFAI_API_KEY}`);

// Function to send data to Clarifai
const sendToClarifai = async (id, filepath, paragraph) => {

    // console.log({
    //     id,
    //     filepath,
    //     paragraph
    // })

    return new Promise((resolve, reject) => {
        stub.PostInputs(
            {
                inputs: [
                    {
                        data: {
                            text: {
                                raw: paragraph
                            },

                            metadata: {
                                filepath
                            }
                        },
                        // id: id
                    }
                ]
            },
            metadata,
            (err, response) => {
                if (err) {
                    reject(err);
                } else if (response.status.code !== 10000) {
                    console.log(response)
                    reject(`Clarifai API Error: ${response.status.description}`);
                } else {
                    resolve(response);
                }
            }
        );
    });
};

// Function to read and process .md files
const processMarkdownFiles = async (dirPath) => {
    try {
        const files = await recursive(dirPath, ['!*.md']);
        
        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8');
            const paragraphs = content.split(/\n\s*\n/);


            for (let i = 0; i < paragraphs.length; i++) {
                const paragraph = paragraphs[i].trim();
                if (paragraph) {
                    filepath = file.replace(dirPath, '');
                    const id = `${filepath}-p-${i + 1}`;

                    try {
                        const response = await sendToClarifai(id, file, paragraph);
                        console.log(response)
                        console.log(`Uploaded Paragraph ${i + 1} from ${file}`);
                    } catch (err) {
                        console.error(`Failed to upload ${id}:`, err);
                    }
                }
            }


            // send entire file too
            await sendToClarifai(filepath, file, content);

        }
    } catch (err) {
        console.error("Error reading files:", err);
    }
};

// Run the script
const directoryToProcess = process.argv[2];
if (!directoryToProcess) {
    console.error("Please provide a directory path to scan for .md files.");
    process.exit(1);
}

processMarkdownFiles(directoryToProcess);
