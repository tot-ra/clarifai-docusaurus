# 🌀 clarifai-docusaurus 🦖
Unofficial [Clarifai](https://www.clarifai.com/) AI search plugin for [docusaurus](https://docusaurus.io/). This was created as a hackathon project within 24h, so code is not ideal, feel free to improve.

This allows to search your documentation using AI. Specifically, it uses embedding model (running as part of Clarifai workflow in the cloud) to index your markdown files (treated as inputs). Generated embeddings are then searched using clarifai public API. 

![](docs/example.png)

## Why
1. Compared to traditional text search, this allows to find documents that are relevant by **meaning**.
  - You can pick which embedding model should be used (multilingual, domain specific etc) and the granularity level (document, paragraph etc).
  -  Theoretically, you could find documents based on the image/pdf contents present on the page
3. You control indexing time and speed of your documents (compared to crawling done by Algolia for example).
4. You can customize search process yourself as search service runs on your side

## TODOs
- add LRU cache to not hit Clarifai API on repeated search
- convert to typescript
- index images & PDFs to have visual search built-in
- have CI example to have reindexing working automatically
- remove index from clarifai on .md file deletion
- have fallback to local text search (for example if search failed or is too slow)
- have RAG, so that search could answer questions, ex. "given these markdown repo, write code that adds new audio file.."
  - needs different UI, large modal for more text, chat history etc

## Installation
1. After having docusaurus installed, copy `SearchBar.js` to your repo `src/theme/SearchBar.js` to render results. 
This component should make requests to your locally running search service `proxy-search.js` (replace `localhost:5000` with real production url you will host)


(Optional) To position input in the sidebar, edit docusaurus config and set under themeConfig.navbar.items:
```json
{
  "type": "search",
  "position": "right"
}
```


2. Checkout this repo somewhere close to your docs. 
3. Register in Clarifai and create an app with text workflow.
4. Create `.env` file which will reference Clarifai credentials that both `index-files.js` and `proxy-search.js` will use. 
You can get token from app settings that is for example `https://clarifai.com/my-user-123/my-docs/settings` it would look like:

```
CLARIFAI_PAT=dda3555e476742c8a894857a2c9b5170
CLARIFAI_APP_ID=my-docs
CLARIFAI_USER_ID=my-user-123
```

5. Run indexing: `node index-files.js ../my-docusaurus/docs/`. This should post all of .md files to clarifai app. From this UI you can delete indexed inputs as well. Theoretically you can run indexing in CI 🤔

![](docs/indexed-files.png)

6. Start your search service `node proxy-search.js`. This simply proxies search requests to Clarifai API, so that your tokens are safe.

Happy searching!
