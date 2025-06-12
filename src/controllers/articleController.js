const NewsAPI = require('newsapi');
const newsapi = new NewsAPI(process.env.NEWS_API_KEY);

let cachedArticles = [];
let lastFetched = 0;
const CACHE_DURATION = 3 * 60 * 60 * 1000; 

const fetchArticles = async () => {
  const response = await newsapi.v2.everything({
    q: 'sampah',
    language: 'id',
    sortBy: 'publishedAt',
    pageSize: 15,
  });

  return response.articles || [];
};

exports.getArticles = async (req, res) => {
  const now = Date.now();
  if (!cachedArticles.length || now - lastFetched > CACHE_DURATION) {
    try {
      cachedArticles = await fetchArticles();
      lastFetched = now;
    } catch (error) {
      console.error("Failed to fetch articles:", error.message);
      return res.status(500).json({message: "Failed to fetch articles"});
    }
  }
  res.json(cachedArticles);
};