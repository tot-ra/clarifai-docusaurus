require('dotenv').config();

const fs = require('fs');
const { title } = require('process');
const recursive = require('recursive-readdir');


// Function to send data to Clarifai
const sendToClarifai = async (id, filepath, text) => {
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
                        url: filepath.replace(".md", ""),
                        title: getTitleFromMarkdown(text)
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

function getTitleFromMarkdown(text) {
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

    return title;
}

// Function to read and process .md files
const processMarkdownFiles = async (dirPath) => {
    try {
        const files = await recursive(dirPath, ['!*.md']);
        
        for (const file of files) {
            const text = fs.readFileSync(file, 'utf-8');
            filepath = file.replace(dirPath, '');

            // id is tied to file contents in case file is moved or changed and we re-run indexing
            const id = require('crypto').createHash('md5')
                .update(text)
                .digest('hex');

            // send entire file too
            await sendToClarifai(id, filepath, text);
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
