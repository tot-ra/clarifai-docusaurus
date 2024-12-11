require('dotenv').config();

const fs = require('fs');
const { title } = require('process');
const recursive = require('recursive-readdir');
const path = require('path');


// Function to send data to Clarifai
async function sendToClarifai (id, filepath, text, title) {
    const raw = JSON.stringify({
        "user_app_id": {
            "user_id": process.env.CLARIFAI_USER_ID,
            "app_id": process.env.CLARIFAI_APP_ID
        },
        "inputs": [
            {
                id,
                "data": {
                    text: {
                        raw: text
                    },

                    metadata: {
                        filepath,
                        url: generateURL(filepath),
                        title
                    }
                }
            }
        ]
    });

    const requestOptions = {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Authorization': 'Key ' + process.env.CLARIFAI_PAT
        },
        body: raw
    };

    fetch("https://api.clarifai.com/v2/inputs", requestOptions)
        .then(response => response.text())
        .then(result => console.log(result))
        .catch(error => console.log('error', error));

    // sleep 100ms to not overwhelm the API
    await new Promise(r => setTimeout(r, 100));

};

function generateURL(filepath) {
    url = filepath.replace(".md", "");

    // split url into parts
    parts = url.split("/");
    // if last part is index, remove it
    if (parts[parts.length - 1] === "index") {
        parts.pop();
    }

    // if last path is same as second to last, remove it
    if (parts[parts.length - 1] === parts[parts.length - 2]) {
        parts.pop();
    }

    // join parts back together
    url = parts.join("/");
    return url;
}

function getTitleFromMarkdown(text, filepath) {
    // First try to get title from frontmatter
    const titleRegex = /^title:\s+(.*)/gm;
    const match = titleRegex.exec(text);
    let title = match ? match[1] : null;

    // If no title in frontmatter, try to get title from first heading
    if (!title) {
        const titleRegex = /^#\s+(.*)/gm;
        const match = titleRegex.exec(text);
        title = match ? match[1] : null;    
    }

    // If no title in frontmatter or first heading, use filename
    if (!title) {
        filepath = filepath.replace(".md", "");
        title = filepath.split("/").pop().replace(/-/g, " ");
        title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    return title;
}

// Function to read and process .md files
const processMarkdownFiles = async (dirPath) => {
    try {
        const files = await recursive(dirPath, ['!*.md', 'node_modules']);

        for (const file of files) {
            const text = fs.readFileSync(file, 'utf-8');
            let relFilePath = file.replace(dirPath, '');

            // Keep the relevant directory structure
            const markdownAbsFilePath = path.resolve(dirPath, file);

            // id is tied to file contents in case file is moved or changed and we re-run indexing
            const id = require('crypto').createHash('md5')
                .update(text)
                .digest('hex');

            let title = getTitleFromMarkdown(text, markdownAbsFilePath)

            // send text - file too
            // you may consider to split text into paragraphs if file is too big, but it could be slower to process
            await sendToClarifai(id, relFilePath, text, title);

            // send images
            let docToImagesMap = await detectImageLinksInMarkdown(id, text, dirPath, markdownAbsFilePath);

            await readImagesContentsAndPostToClarifai(docToImagesMap, markdownAbsFilePath, relFilePath, title);
        }
    } catch (err) {
        console.error("Error reading files:", err);
    }
};

async function detectImageLinksInMarkdown(id, text, dirPath, markdownFilePath) {
    const imageRegex = /!\[.*?\]\((.*?)\)/gm;
    let match;
    
    let docToImagesMap = {};
    docToImagesMap[id] = []; // Initialize an array for the given id

    // Convert dirPath to an absolute path
    const absoluteDirPath = path.resolve(dirPath);

    while ((match = imageRegex.exec(text)) !== null) {
        const relativeUrl = match[1];

        if (relativeUrl.startsWith("http")){
            docToImagesMap[id].push(relativeUrl);
        }
        else {

            const decodedUrl = decodeURIComponent(relativeUrl); // Decode URL-encoded parts

            // Correct the path resolution logic
            const absolutePath = path.resolve(absoluteDirPath, path.dirname(markdownFilePath), decodedUrl);

            // Check if the file exists before adding it to the map
            if (fs.existsSync(absolutePath)) {
                docToImagesMap[id].push(absolutePath);
            } else {
                console.error(`Image not found: ${absolutePath}`);
            }
        }
    }
    return docToImagesMap;
}

async function readImagesContentsAndPostToClarifai(docToImagesMap, markdownAbsFilePath, relFilePath, title) {
    for (const [docId, imagePaths] of Object.entries(docToImagesMap)) {
        for (const imagePath of imagePaths) {
            try {
                const raw = {
                    "inputs": [
                        {
                            "data": {
                                metadata: {
                                    "filepath": markdownAbsFilePath,
                                    "url": generateURL(relFilePath),
                                    "title": title
                                }
                            },

                        }
                    ],
                };

                if(imagePath.startsWith("http")) {
                    // Generate MD5 hash of the URL instead of file contents
                    const imageId = require('crypto').createHash('md5')
                        .update(imagePath)
                        .digest('hex');

                    raw.inputs[0].id = imageId; // Use imageId instead of docId
                    raw.inputs[0].data.image = {
                        url: imagePath
                    }
                } else {
                    const imageData = fs.readFileSync(imagePath, { encoding: 'base64' });

                    // Generate MD5 hash of the image contents
                    const imageId = require('crypto').createHash('md5')
                        .update(fs.readFileSync(imagePath))
                        .digest('hex');

                    raw.inputs[0].id = imageId; // Use imageId instead of docId
                    raw.inputs[0].data.image = {
                        base64: imageData
                    }
                }

                const requestOptions = {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': 'Key ' + process.env.CLARIFAI_PAT
                    },
                    body: JSON.stringify(raw)
                };

                const response = await fetch("https://api.clarifai.com/v2/inputs", requestOptions);
                const result = await response.text();
                console.log(result);

                // sleep 100ms to not overwhelm the API
                await new Promise(r => setTimeout(r, 1000));

            } catch (error) {
                console.error(`Error processing ${markdownAbsFilePath} : image ${imagePath}`, error);
            }
        }
    }
}

// Run the script
const directoryToProcess = process.argv[2];
if (!directoryToProcess) {
    console.error("Please provide a directory path to scan for .md files.");
    process.exit(1);
}

processMarkdownFiles(directoryToProcess);
