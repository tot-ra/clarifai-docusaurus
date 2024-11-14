// server.js
require('dotenv').config();
const fastify = require('fastify')({ logger: true });
// const axios = require('axios');
const PORT = 5000;

let { User, Search } = require("clarifai-nodejs");
const client = new User({
  userId: process.env.CLARIFAI_USER_ID,
  pat: process.env.CLARIFAI_PAT,
  appId: process.env.CLARIFAI_APP_ID,
});

// Fastify route for POST /search
fastify.post('/search', async (request, reply) => {
  try {
    const search = new Search({
      authConfig: {
        userId: process.env.CLARIFAI_USER_ID,
        pat: process.env.CLARIFAI_PAT,
        appId: process.env.CLARIFAI_APP_ID,
      },
      topK: 1,
      metric: "euclidean",
    });
    
    // Perform a search query with a specified text rank
    const response = await search.query({
      ranks: [{ textRaw: request.body.text}],
    });

    for await (const r of response) {
      hit = r?.hitsList?.[0]?.input?.data?.image?.url;
      
      console.dir(r, {depth: null});
    }

    // Send back the response from Clarifai to the client
    reply.send(response);
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
    await fastify.listen({ port: PORT });
    fastify.log.info(`Server is running on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
