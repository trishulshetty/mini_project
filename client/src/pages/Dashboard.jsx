import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingProduct, setAddingProduct] = useState(false);
  const [productUrl, setProductUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshingId, setRefreshingId] = useState(null);
  const [priceAlerts, setPriceAlerts] = useState({}); // Track persistent price drop alerts per product
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const ALERT_STORAGE_KEY = 'priceAlerts';
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  const isExpired = (alert) => {
    if (!alert || !alert.firstDetectedAt) return true;
    return Date.now() - alert.firstDetectedAt > ONE_DAY_MS;
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Load persisted alerts from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ALERT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) || {};
        // prune expired
        const pruned = Object.fromEntries(
          Object.entries(parsed).filter(([, a]) => a && a.firstDetectedAt && Date.now() - a.firstDetectedAt <= ONE_DAY_MS && !a.acknowledged)
        );
        setPriceAlerts(pruned);
      }
    } catch (e) {
      // ignore storage errors
    }
  }, []);

  // Persist alerts to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(priceAlerts));
    } catch (e) {
      // ignore storage errors
    }
  }, [priceAlerts]);

  // Auto-refresh for JharkhandEcom products every 5 seconds
  useEffect(() => {
    const jharkhandProducts = products.filter(p => p.platform === 'JharkhandEcom');
    
    if (jharkhandProducts.length === 0) return;

    const intervalId = setInterval(() => {
      jharkhandProducts.forEach(product => {
        autoRefreshProduct(product._id, product.currentPrice);
      });
    }, 5000); // 5 seconds

    return () => clearInterval(intervalId);
  }, [products]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products');
      setLoading(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setAddingProduct(true);

    try {
      const response = await axios.post('/api/products', { url: productUrl });
      setProducts([response.data, ...products]);
      setProductUrl('');
      setSuccess('Product added successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to add product');
    } finally {
      setAddingProduct(false);
    }
  };

  const autoRefreshProduct = async (productId, oldPrice) => {
    try {
      const response = await axios.put(`/api/products/${productId}/refresh`);
      const newProduct = response.data;
      
      // Manage persistent price-change alerts (drop or increase)
      setPriceAlerts(prev => {
        const existing = prev[productId];
        const expired = existing ? isExpired(existing) : true;
        const next = { ...prev };

        if (newProduct.currentPrice !== oldPrice) {
          // Price changed this cycle (drop or increase)
          if (!existing || existing.acknowledged || expired) {
            // Start a new alert window
            next[productId] = {
              oldPrice: oldPrice,
              newPrice: newProduct.currentPrice,
              firstDetectedAt: Date.now(),
              acknowledged: false
            };
          } else {
            // Keep old baseline, update the latest new price
            next[productId] = {
              ...existing,
              newPrice: newProduct.currentPrice
            };
          }
        } else {
          // No change this cycle. Keep showing existing unacknowledged, unexpired alert.
          if (existing) {
            if (existing.acknowledged || isExpired(existing)) {
              delete next[productId];
            } else {
              // Keep as-is
              next[productId] = existing;
            }
          }
        }

        return next;
      });
      
      setProducts(products.map(p => p._id === productId ? newProduct : p));
    } catch (error) {
      console.error('Auto-refresh error:', error);
    }
  };

  const acknowledgeAlert = (productId) => {
    setPriceAlerts(prev => {
      const next = { ...prev };
      if (next[productId]) {
        next[productId] = { ...next[productId], acknowledged: true };
      }
      return next;
    });
  };

  const handleAIAction = async (product, priceAlert) => {
    setSelectedProduct(product);
    setAiModalOpen(true);
    setAiResponse('');
    setAiLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/products/${product._id}/ai-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          oldPrice: priceAlert.oldPrice,
          newPrice: priceAlert.newPrice
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setAiLoading(false);
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullResponse += parsed.content;
                setAiResponse(fullResponse);
              }
              if (parsed.error) {
                setAiResponse(parsed.error);
                setAiLoading(false);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('AI action error:', error);
      setAiResponse('Error: Could not connect to AI service. Please ensure the server is running.');
      setAiLoading(false);
    }
  };

  const handleRefreshPrice = async (productId) => {
    setRefreshingId(productId);
    setError('');
    
    try {
      const response = await axios.put(`/api/products/${productId}/refresh`);
      setProducts(products.map(p => p._id === productId ? response.data : p));
      setSuccess('Price updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to refresh price');
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await axios.delete(`/api/products/${productId}`);
      setProducts(products.filter(p => p._id !== productId));
      setSuccess('Product deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to delete product');
    }
  };

  const formatPrice = (price, currency) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR'
    }).format(price);
  };

  const handleDownloadCSV = async (productId, productTitle) => {
    try {
      console.log('Downloading CSV for product:', productId);
      
      const response = await axios.get(`/api/products/${productId}/csv`, {
        responseType: 'blob'
      });
      
      console.log('CSV response received:', response);
      
      // Generate short filename
      const shortTitle = productTitle.substring(0, 25).replace(/[^a-z0-9]/gi, '_');
      const filename = `${shortTitle}_prices.csv`;
      
      console.log('Creating download with filename:', filename);
      
      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      setSuccess('CSV downloaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('CSV download error:', error);
      setError(`Failed to download CSV: ${error.message}`);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleDownloadSummary = async (productId, productTitle) => {
    try {
      console.log('Downloading summary for product:', productId);
      
      const response = await axios.get(`/api/products/${productId}/summary`, {
        responseType: 'blob'
      });
      
      console.log('Summary response received');
      
      // Generate short filename
      const shortTitle = productTitle.substring(0, 25).replace(/[^a-z0-9]/gi, '_');
      const filename = `${shortTitle}_summary.txt`;
      
      // Create download link
      const blob = new Blob([response.data], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      setSuccess('Summary downloaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Summary download error:', error);
      setError(`Failed to download summary: ${error.message}`);
      setTimeout(() => setError(''), 5000);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="dashboard">
      <nav className="navbar">
        <div className="container nav-content">
          <div className="nav-brand">
            <h2>Price Tracker</h2>
          </div>
          <div className="nav-user">
            <span>Welcome, {user?.name}!</span>
            <button onClick={logout} className="btn btn-secondary btn-sm">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <div className="container">
          <div className="dashboard-header">
            <div>
              <h1>Competitor Tracking</h1>
              <p>Monitor competitor prices to protect your business and prevent losses</p>
            </div>
            <div className="stats">
              <div className="stat-card">
                <div>
                  <div className="stat-value">{products.length}</div>
                  <div className="stat-label">Competitors Tracked</div>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              {success}
            </div>
          )}

          <div className="add-product-section card">
            <h3>
              Add Competitor Product
            </h3>
            <form onSubmit={handleAddProduct} className="add-product-form">
              <input
                type="url"
                className="input"
                placeholder="Paste competitor's product URL to track their pricing"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                required
              />
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={addingProduct}
              >
                {addingProduct ? 'Adding...' : 'Track Competitor'}
              </button>
            </form>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <h3>No competitors tracked yet</h3>
              <p>Add your first competitor product to start monitoring their pricing strategy</p>
            </div>
          ) : (
            <div className="products-grid">
              {products.map((product) => {
                const priceAlert = priceAlerts[product._id];
                const showAlert = priceAlert && !priceAlert.acknowledged && !isExpired(priceAlert);
                const isJharkhandEcom = product.platform === 'JharkhandEcom';
                
                return (
                <div key={product._id} className={`product-card card ${showAlert ? 'price-changed' : ''}`}>
                  {product.imageUrl && (
                    <div className="product-image">
                      <img src={product.imageUrl} alt={product.title} />
                    </div>
                  )}
                  <div className="product-content">
                    <div className="product-header">
                      <span className="platform-badge">{product.platform}</span>
                      {isJharkhandEcom && (
                        <span className="auto-refresh-badge" title="Auto-refreshing every 5 seconds">
                          Auto
                        </span>
                      )}
                      <h3 className="product-title">{product.title}</h3>
                    </div>
                    
                    {showAlert && (
                      <div className="price-alert">
                        <span className="alert-icon" aria-hidden="true"></span>
                        <div className="alert-content">
                          <strong>{priceAlert.newPrice < priceAlert.oldPrice ? 'Competitor Dropped Price' : 'Competitor Raised Price'}</strong>
                          <div className="price-comparison">
                            <span className="old-price">{formatPrice(priceAlert.oldPrice, product.currency)}</span>
                            <span className="arrow">→</span>
                            <span className={priceAlert.newPrice < priceAlert.oldPrice ? 'new-price-down' : 'new-price-up'}>
                              {formatPrice(priceAlert.newPrice, product.currency)}
                            </span>
                          </div>
                          <div className="alert-actions">
                            <button
                              className="action-button ai-action-button"
                              onClick={() => handleAIAction(product, priceAlert)}
                              title="Get AI competitive strategy to protect your business"
                            >
                              Take Action
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="product-price">
                      <div>
                        <div className="price-current">
                          {formatPrice(product.currentPrice, product.currency)}
                        </div>
                        <div className="price-label">Current Price</div>
                      </div>
                    </div>

                    <div className="product-meta">
                      <div className="meta-item">
                        <span className="meta-label">Added:</span>
                        <span className="meta-value">{formatDate(product.createdAt)}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Last Checked:</span>
                        <span className="meta-value">{formatDate(product.lastChecked)}</span>
                      </div>
                    </div>

                    <div className="product-actions">
                      <a 
                        href={product.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                      >
                        View
                      </a>
                      <button
                        onClick={() => handleRefreshPrice(product._id)}
                        className="btn btn-secondary btn-sm"
                        disabled={refreshingId === product._id}
                      >
                        {refreshingId === product._id ? 'Refreshing...' : 'Refresh'}
                      </button>
                      <button
                        onClick={() => handleDownloadCSV(product._id, product.title)}
                        className="btn btn-secondary btn-sm"
                        title="Download 180 days price data"
                      >
                        CSV
                      </button>
                      <button
                        onClick={() => handleDownloadSummary(product._id, product.title)}
                        className="btn btn-success btn-sm"
                        title="Download AI-ready weekly summary"
                      >
                        Summary
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product._id)}
                        className="btn btn-danger btn-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* AI Strategic Action Modal */}
      {aiModalOpen && (
        <div className="modal-overlay" onClick={() => setAiModalOpen(false)}>
          <div className="modal-content ai-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <h2>Competitive Strategy Analysis</h2>
              </div>
              <button 
                className="modal-close" 
                onClick={() => setAiModalOpen(false)}
                aria-label="Close modal"
              >
                Close
              </button>
            </div>
            
            {selectedProduct && (
              <div className="modal-product-info">
                <h3>Competitor: {selectedProduct.title}</h3>
                <span className="platform-badge">{selectedProduct.platform}</span>
              </div>
            )}
            
            <div className="rag-indicator">
              <div className="rag-badge">
                <span>Analyzing 180-day price history with RAG system</span>
              </div>
            </div>
            
            <div className="modal-body">
              {aiLoading && (
                <div className="ai-loading">
                  <div className="spinner"></div>
                  <p>Loading competitor's 180-day price summary...</p>
                  <p className="rag-status">RAG system processing historical data...</p>
                  <p className="rag-status">AI analyzing competitive strategy...</p>
                </div>
              )}
              
              {aiResponse && (
                <div className="ai-response">
                  <div className="response-content">
                    {aiResponse.split('\n').map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                </div>
              )}
              
              {!aiLoading && !aiResponse && (
                <div className="ai-waiting">
                  <p>Waiting for AI response...</p>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setAiModalOpen(false)}
              >
                Close
              </button>
              {selectedProduct && (
                <a
                  href={selectedProduct.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  View Competitor Product
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
