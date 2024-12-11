require('dotenv').config();
const fastify = require('fastify')({logger: true});
const PORT = 5000;

// add CORS SUPPORT
fastify.register(require('@fastify/cors'), {
    // add your own domain for security
    origin: '*',
});


// Fastify route for POST /search
fastify.post('/search', async (request, reply) => {
    try {
        const raw = JSON.stringify({
            "user_app_id": {
                "user_id": process.env.CLARIFAI_USER_ID,
                "app_id": process.env.CLARIFAI_APP_ID
            },
            "pagination": {
                "per_page": 10
            },
            "searches": [
                {
                    "query": {
                        "ranks": [
                            {
                                "annotation": {
                                    "data": {
                                        "text": {
                                            "raw": request.body.text
                                        }
                                    }
                                }
                            }
                        ]
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

        out = await fetch(`https://api.clarifai.com/v2/inputs/searches?per_page=10`, requestOptions)


        //convert readable stream to string
        out = await out.json();

        console.dir(out, {depth: null});

        // cleanup results
        results = out.hits.map(hit => {
            return {
                score: hit.score,
                title: hit.input.data.metadata.title,
                url: hit.input.data.metadata.url,
            };
        });

        reply.send(results);

    } catch (error) {
        // Handle errors
        fastify.log.error(error);
        reply.status(500).send({
            error: 'Failed to fetch results from Clarifai',
            details: error.message,
        });
    }
});

// Start the Fastify server
const start = async () => {
    try {
        await fastify.listen({port: PORT});
        fastify.log.info(`Server is running on http://localhost:${PORT}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
