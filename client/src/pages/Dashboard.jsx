import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  LogOut, 
  Plus, 
  RefreshCw, 
  Trash2, 
  TrendingDown, 
  Package,
  IndianRupee,
  ExternalLink,
  Loader,
  Download,
  FileText
} from 'lucide-react';
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
  const [priceAlerts, setPriceAlerts] = useState({}); // Track price changes per product

  useEffect(() => {
    fetchProducts();
  }, []);

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
      
      // Check if price changed
      if (newProduct.currentPrice !== oldPrice) {
        setPriceAlerts(prev => ({
          ...prev,
          [productId]: {
            oldPrice: oldPrice,
            newPrice: newProduct.currentPrice,
            timestamp: Date.now()
          }
        }));
        
        // Clear alert after 10 seconds
        setTimeout(() => {
          setPriceAlerts(prev => {
            const updated = { ...prev };
            delete updated[productId];
            return updated;
          });
        }, 10000);
      }
      
      setProducts(products.map(p => p._id === productId ? newProduct : p));
    } catch (error) {
      console.error('Auto-refresh error:', error);
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
            <TrendingDown size={32} color="#667eea" />
            <h2>Price Tracker</h2>
          </div>
          <div className="nav-user">
            <span>Welcome, {user?.name}!</span>
            <button onClick={logout} className="btn btn-secondary btn-sm">
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <div className="container">
          <div className="dashboard-header">
            <div>
              <h1>My Products</h1>
              <p>Track prices across multiple e-commerce platforms</p>
            </div>
            <div className="stats">
              <div className="stat-card">
                <Package size={24} color="#667eea" />
                <div>
                  <div className="stat-value">{products.length}</div>
                  <div className="stat-label">Products Tracked</div>
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
              <Plus size={24} />
              Add New Product
            </h3>
            <form onSubmit={handleAddProduct} className="add-product-form">
              <input
                type="url"
                className="input"
                placeholder="Paste product URL (Amazon, eBay, Walmart, etc.)"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                required
              />
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={addingProduct}
              >
                {addingProduct ? (
                  <>
                    <Loader size={20} className="spinning" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus size={20} />
                    Add Product
                  </>
                )}
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
              <Package size={64} color="#9ca3af" />
              <h3>No products yet</h3>
              <p>Add your first product to start tracking prices</p>
            </div>
          ) : (
            <div className="products-grid">
              {products.map((product) => {
                const priceAlert = priceAlerts[product._id];
                const isJharkhandEcom = product.platform === 'JharkhandEcom';
                
                return (
                <div key={product._id} className={`product-card card ${priceAlert ? 'price-changed' : ''}`}>
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
                          <RefreshCw size={12} className="spinning-slow" /> Auto
                        </span>
                      )}
                      <h3 className="product-title">{product.title}</h3>
                    </div>
                    
                    {priceAlert && (
                      <div className="price-alert">
                        <span className="alert-icon">🔔</span>
                        <div className="alert-content">
                          <strong>Price Changed!</strong>
                          <div className="price-comparison">
                            <span className="old-price">{formatPrice(priceAlert.oldPrice, product.currency)}</span>
                            <span className="arrow">→</span>
                            <span className={priceAlert.newPrice < priceAlert.oldPrice ? 'new-price-down' : 'new-price-up'}>
                              {formatPrice(priceAlert.newPrice, product.currency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="product-price">
                      <IndianRupee size={24} color="#10b981" />
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
                        <ExternalLink size={16} />
                        View
                      </a>
                      <button
                        onClick={() => handleRefreshPrice(product._id)}
                        className="btn btn-secondary btn-sm"
                        disabled={refreshingId === product._id}
                      >
                        {refreshingId === product._id ? (
                          <Loader size={16} className="spinning" />
                        ) : (
                          <RefreshCw size={16} />
                        )}
                        Refresh
                      </button>
                      <button
                        onClick={() => handleDownloadCSV(product._id, product.title)}
                        className="btn btn-secondary btn-sm"
                        title="Download 180 days price data"
                      >
                        <Download size={16} />
                        CSV
                      </button>
                      <button
                        onClick={() => handleDownloadSummary(product._id, product.title)}
                        className="btn btn-success btn-sm"
                        title="Download AI-ready weekly summary"
                      >
                        <FileText size={16} />
                        Summary
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product._id)}
                        className="btn btn-danger btn-sm"
                      >
                        <Trash2 size={16} />
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
    </div>
  );
};

export default Dashboard;
