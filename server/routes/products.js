import express from 'express';
import Product from '../models/Product.js';
import auth from '../middleware/auth.js';
import { scrapeProductPrice } from '../utils/scraper.js';

const router = express.Router();

// Get all products for user
router.get('/', auth, async (req, res) => {
  try {
    const products = await Product.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error fetching products' });
  }
});

// Add new product
router.post('/', auth, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ message: 'Please provide a product URL' });
    }

    // Scrape product data
    const productData = await scrapeProductPrice(url);

    if (!productData) {
      return res.status(400).json({ message: 'Could not fetch product data from the URL' });
    }

    // Generate 180 days of historical price data with realistic patterns
    const generateHistoricalPrices = (basePrice) => {
      const history = [];
      const today = new Date();
      let currentPrice = basePrice;
      let lastChangeDay = 0;
      let daysUntilNextChange = Math.floor(Math.random() * 3) + 1; // 1-3 days
      
      for (let i = 180; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // Only change price every 1-3 days
        const dayIndex = 180 - i;
        if (dayIndex >= lastChangeDay + daysUntilNextChange) {
          // Seasonal factors (festivals, sales events)
          const month = date.getMonth();
          const dayOfMonth = date.getDate();
          let seasonalMultiplier = 1.0;
          
          // Diwali season (Oct 15 - Nov 15) - prices drop due to sales
          if ((month === 9 && dayOfMonth >= 15) || (month === 10 && dayOfMonth <= 15)) {
            seasonalMultiplier = 0.85 + (Math.random() * 0.10); // 10-15% discount
          }
          // New Year sales (Dec 25 - Jan 10)
          else if ((month === 11 && dayOfMonth >= 25) || (month === 0 && dayOfMonth <= 10)) {
            seasonalMultiplier = 0.88 + (Math.random() * 0.08); // 8-12% discount
          }
          // Summer sales (May 15 - Jun 30)
          else if ((month === 4 && dayOfMonth >= 15) || (month === 5)) {
            seasonalMultiplier = 0.90 + (Math.random() * 0.07); // 7-10% discount
          }
          // Republic Day sale (Jan 20-26)
          else if (month === 0 && dayOfMonth >= 20 && dayOfMonth <= 26) {
            seasonalMultiplier = 0.92 + (Math.random() * 0.05); // 5-8% discount
          }
          // Regular days - very small fluctuations
          else {
            seasonalMultiplier = 0.98 + (Math.random() * 0.04); // -2% to +2%
          }
          
          // Gradual price drift over 6 months (slight inflation)
          const daysFromStart = 180 - i;
          const trendFactor = 1 + (daysFromStart * 0.00008); // ~1.5% increase over 180 days
          
          // Small random variation when price changes
          const priceVariation = 0.995 + (Math.random() * 0.01); // ±0.5%
          
          // Calculate new price
          currentPrice = basePrice * seasonalMultiplier * trendFactor * priceVariation;
          
          // Round to nearest 10 for realistic pricing
          currentPrice = Math.round(currentPrice / 10) * 10;
          
          // Set next change interval (1-3 days)
          lastChangeDay = dayIndex;
          daysUntilNextChange = Math.floor(Math.random() * 3) + 1;
        }
        
        history.push({
          price: currentPrice,
          date: date
        });
      }
      
      return history;
    };

    // Generate historical prices
    const historicalPrices = generateHistoricalPrices(productData.price);
    console.log('=== PRICE HISTORY GENERATION ===');
    console.log('Base Price:', productData.price);
    console.log('Total history entries generated:', historicalPrices.length);
    console.log('First 5 entries:', historicalPrices.slice(0, 5));
    console.log('Last 5 entries:', historicalPrices.slice(-5));
    console.log('================================');

    // Create product with historical data
    const product = new Product({
      userId: req.userId,
      url,
      title: productData.title,
      currentPrice: productData.price,
      currency: productData.currency || 'INR',
      imageUrl: productData.imageUrl,
      platform: productData.platform,
      priceHistory: historicalPrices
    });

    await product.save();
    
    console.log('Product saved with price history length:', product.priceHistory.length);
    
    res.status(201).json(product);
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ message: 'Server error adding product' });
  }
});

// Update product price
router.put('/:id/refresh', auth, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, userId: req.userId });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Scrape updated price
    const productData = await scrapeProductPrice(product.url);

    if (!productData) {
      return res.status(400).json({ message: 'Could not fetch updated product data' });
    }

    // Update product price
    product.currentPrice = productData.price;
    product.lastChecked = new Date();
    
    // Only add to history if price changed or it's been more than a day
    const lastEntry = product.priceHistory[product.priceHistory.length - 1];
    const lastDate = new Date(lastEntry.date);
    const daysSinceLastEntry = (new Date() - lastDate) / (1000 * 60 * 60 * 24);
    
    if (lastEntry.price !== productData.price || daysSinceLastEntry >= 1) {
      product.priceHistory.push({
        price: productData.price,
        date: new Date()
      });
    }

    await product.save();
    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error updating product' });
  }
});

// Delete product
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, userId: req.userId });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error deleting product' });
  }
});

// Generate weekly contextual summary for RAG
const generateWeeklySummary = (priceHistory, productTitle, platform) => {
  const weeks = [];
  let currentWeek = [];
  let weekStartDate = null;
  
  priceHistory.forEach((entry, index) => {
    const entryDate = new Date(entry.date);
    
    if (!weekStartDate) {
      weekStartDate = entryDate;
    }
    
    currentWeek.push(entry);
    
    // Check if week is complete (7 days) or it's the last entry
    if (currentWeek.length === 7 || index === priceHistory.length - 1) {
      const prices = currentWeek.map(e => e.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      const startPrice = currentWeek[0].price;
      const endPrice = currentWeek[currentWeek.length - 1].price;
      const priceChange = endPrice - startPrice;
      const priceChangePercent = ((priceChange / startPrice) * 100).toFixed(2);
      
      // Determine trend
      let trend = 'stable';
      if (Math.abs(priceChangePercent) < 1) trend = 'stable';
      else if (priceChangePercent > 0) trend = 'increasing';
      else trend = 'decreasing';
      
      // Check for significant events
      const volatility = maxPrice - minPrice;
      const isHighVolatility = volatility > (avgPrice * 0.05); // >5% range
      
      const weekNum = weeks.length + 1;
      const weekEnd = new Date(currentWeek[currentWeek.length - 1].date);
      
      weeks.push({
        week: weekNum,
        startDate: weekStartDate.toLocaleDateString('en-IN'),
        endDate: weekEnd.toLocaleDateString('en-IN'),
        avgPrice,
        minPrice,
        maxPrice,
        startPrice,
        endPrice,
        priceChange,
        priceChangePercent,
        trend,
        volatility,
        isHighVolatility,
        daysInWeek: currentWeek.length
      });
      
      currentWeek = [];
      weekStartDate = null;
    }
  });
  
  return weeks;
};

// Generate RAG-optimized context summary
const generateRAGContext = (weeklySummary, productTitle, platform, currentPrice) => {
  let context = `Product: ${productTitle}\n`;
  context += `Platform: ${platform}\n`;
  context += `Current Price: ₹${currentPrice}\n`;
  context += `Analysis Period: 180 days (${weeklySummary.length} weeks)\n\n`;
  
  // Overall statistics
  const allAvgPrices = weeklySummary.map(w => w.avgPrice);
  const overallMin = Math.min(...weeklySummary.map(w => w.minPrice));
  const overallMax = Math.max(...weeklySummary.map(w => w.maxPrice));
  const overallAvg = Math.round(allAvgPrices.reduce((a, b) => a + b, 0) / allAvgPrices.length);
  
  context += `OVERALL SUMMARY:\n`;
  context += `- Average Price: ₹${overallAvg}\n`;
  context += `- Lowest Price: ₹${overallMin}\n`;
  context += `- Highest Price: ₹${overallMax}\n`;
  context += `- Price Range: ₹${overallMax - overallMin} (${(((overallMax - overallMin) / overallAvg) * 100).toFixed(1)}%)\n\n`;
  
  // Identify best weeks to buy
  const sortedByMin = [...weeklySummary].sort((a, b) => a.minPrice - b.minPrice);
  context += `BEST WEEKS TO BUY (Lowest Prices):\n`;
  sortedByMin.slice(0, 3).forEach(week => {
    context += `- Week ${week.week} (${week.startDate}): ₹${week.minPrice}\n`;
  });
  context += `\n`;
  
  // Identify high volatility weeks
  const highVolWeeks = weeklySummary.filter(w => w.isHighVolatility);
  if (highVolWeeks.length > 0) {
    context += `HIGH VOLATILITY WEEKS (Price Fluctuations):\n`;
    highVolWeeks.slice(0, 5).forEach(week => {
      context += `- Week ${week.week}: ₹${week.minPrice}-₹${week.maxPrice} (${week.trend})\n`;
    });
    context += `\n`;
  }
  
  // Weekly breakdown
  context += `WEEKLY PRICE ANALYSIS:\n`;
  weeklySummary.forEach(week => {
    context += `Week ${week.week} (${week.startDate} to ${week.endDate}):\n`;
    context += `  Average: ₹${week.avgPrice} | Range: ₹${week.minPrice}-₹${week.maxPrice}\n`;
    context += `  Trend: ${week.trend} (${week.priceChangePercent > 0 ? '+' : ''}${week.priceChangePercent}%)\n`;
    if (week.isHighVolatility) {
      context += `  Note: High price volatility detected\n`;
    }
    context += `\n`;
  });
  
  // Recommendations
  context += `RECOMMENDATIONS:\n`;
  if (currentPrice <= overallMin * 1.05) {
    context += `- Current price is near historical low. Good time to buy.\n`;
  } else if (currentPrice >= overallMax * 0.95) {
    context += `- Current price is near historical high. Consider waiting.\n`;
  } else {
    context += `- Current price is moderate. Monitor for better deals.\n`;
  }
  
  return context;
};

// Download product price history as CSV
router.get('/:id/csv', auth, async (req, res) => {
  try {
    console.log('CSV download requested for product ID:', req.params.id);
    
    const product = await Product.findOne({ _id: req.params.id, userId: req.userId });

    if (!product) {
      console.log('Product not found for CSV download');
      return res.status(404).json({ message: 'Product not found' });
    }

    console.log(`Generating CSV for product: ${product.title}`);
    console.log(`Price history entries: ${product.priceHistory.length}`);

    // Generate CSV content
    let csv = 'Date,Price (INR),Product,Platform\n';
    
    product.priceHistory.forEach(entry => {
      const date = new Date(entry.date).toLocaleDateString('en-IN');
      csv += `${date},${entry.price},"${product.title}",${product.platform}\n`;
    });

    console.log(`CSV generated with ${csv.split('\n').length - 1} rows`);

    // Generate short filename (max 30 chars + extension)
    const shortTitle = product.title.substring(0, 25).replace(/[^a-z0-9]/gi, '_');
    const filename = `${shortTitle}_prices.csv`;
    
    console.log(`Sending CSV file: ${filename}`);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(csv));
    
    res.send(csv);
    console.log('CSV sent successfully');
  } catch (error) {
    console.error('CSV download error:', error);
    res.status(500).json({ message: 'Server error generating CSV' });
  }
});

// Download RAG-optimized contextual summary
router.get('/:id/summary', auth, async (req, res) => {
  try {
    console.log('Summary requested for product ID:', req.params.id);
    
    const product = await Product.findOne({ _id: req.params.id, userId: req.userId });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    console.log(`Generating summary for: ${product.title}`);
    
    // Generate weekly summary
    const weeklySummary = generateWeeklySummary(product.priceHistory, product.title, product.platform);
    
    // Generate RAG context
    const ragContext = generateRAGContext(weeklySummary, product.title, product.platform, product.currentPrice);
    
    // Create summary text file
    const shortTitle = product.title.substring(0, 25).replace(/[^a-z0-9]/gi, '_');
    const filename = `${shortTitle}_summary.txt`;
    
    console.log(`Sending summary file: ${filename}`);
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(ragContext);
    console.log('Summary sent successfully');
  } catch (error) {
    console.error('Summary generation error:', error);
    res.status(500).json({ message: 'Server error generating summary' });
  }
});

export default router;
