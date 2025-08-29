import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../../Firebase/firebase'; // Adjust path as needed
import { FaUpload, FaTimes, FaPlus, FaMinus } from 'react-icons/fa';
import { FiImage } from 'react-icons/fi';

const ProductForm = () => {
  const [product, setProduct] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    category: '',
    stock: 10,
    featured: false,
    discountPercentage: 0,
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState(['Juices', 'Supplements', 'Wellness Kits', 'Skincare']);
  const [newCategory, setNewCategory] = useState('');
  const navigate = useNavigate();

  // Generate product ID in VDXXXXXX format
  const generateProductId = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `VD${randomNum}`;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProduct(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Calculate discount percentage if original price changes
    if (name === 'originalPrice' || name === 'price') {
      const original = parseFloat(product.originalPrice) || parseFloat(value);
      const current = name === 'price' ? parseFloat(value) : parseFloat(product.price);
      
      if (original > 0 && current > 0) {
        const discount = ((original - current) / original) * 100;
        setProduct(prev => ({
          ...prev,
          discountPercentage: Math.round(discount)
        }));
      }
    }

    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    // Validate all files
    for (const file of files) {
      if (!file.type.match('image.*')) {
        setErrors(prev => ({ ...prev, image: 'Please select only image files' }));
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, image: 'Each image should be less than 2MB' }));
        return;
      }
    }
    setImageFiles(files);
    setPreviewImages(files.map(file => URL.createObjectURL(file)));
    setErrors(prev => ({ ...prev, image: '' }));
  };

  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
  };

  const addCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories(prev => [...prev, newCategory.trim()]);
      setProduct(prev => ({ ...prev, category: newCategory.trim() }));
      setNewCategory('');
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!product.name.trim()) newErrors.name = 'Product name is required';
    if (!product.description.trim()) newErrors.description = 'Description is required';
    if (!product.price) newErrors.price = 'Price is required';
    if (!product.category) newErrors.category = 'Category is required';
    if (imageFiles.length === 0) newErrors.image = 'At least one product image is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setUploadProgress(0);
    const db = getFirestore(app);
    const storage = getStorage(app);

    try {
      // Generate product ID once and use it consistently
      const productId = generateProductId();
      
      // Upload all images to Firebase Storage
      let imageUrls = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        try {
          const storageRef = ref(storage, `products/${productId}/${file.name}`);
          console.log('Uploading image:', file.name, 'to path:', `products/${productId}/${file.name}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          console.log('Image uploaded successfully:', url);
          imageUrls.push(url);
          setUploadProgress(((i + 1) / imageFiles.length) * 100);
        } catch (uploadError) {
          console.error('Error uploading image:', file.name, uploadError);
          throw new Error(`Failed to upload image ${file.name}: ${uploadError.message}`);
        }
      }

      // Create product in Firestore
      const productData = {
        productId: productId,
        name: product.name,
        description: product.description,
        price: parseFloat(product.price),
        originalPrice: parseFloat(product.originalPrice) || parseFloat(product.price),
        images: imageUrls, // Array of image URLs
        category: product.category,
        stock: parseInt(product.stock),
        featured: product.featured,
        discountPercentage: product.discountPercentage,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'products'), productData);
      console.log('Product created successfully:', productData);
      console.log('Image URLs:', imageUrls);
      navigate('/shop'); // Redirect to shop page
    } catch (error) {
      console.error('Error adding product:', error);
      setErrors(prev => ({ ...prev, form: 'Failed to add product. Please try again.' }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Add New Product</h2>
      
      {errors.form && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Upload Progress */}
        {isLoading && uploadProgress > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Uploading images...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}
        {/* Product Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Product Images</label>
          <div className="flex items-center space-x-4 flex-wrap">
            {previewImages.map((img, idx) => (
              <div className="relative mb-2" key={idx}>
                <img 
                  src={img} 
                  alt={`Product preview ${idx+1}`} 
                  className="w-32 h-32 object-cover rounded-md border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                >
                  <FaTimes className="text-xs" />
                </button>
              </div>
            ))}
            {previewImages.length < 5 && (
              <div>
                <input
                  type="file"
                  id="productImage"
                  onChange={handleImageChange}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <label
                  htmlFor="productImage"
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer"
                >
                  <FaUpload className="mr-2" />
                  {previewImages.length > 0 ? 'Add More Images' : 'Upload Images'}
                </label>
                <p className="mt-1 text-xs text-gray-500">Up to 5 images, JPEG, PNG (Max 2MB each)</p>
                {errors.image && <p className="mt-1 text-sm text-red-600">{errors.image}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Product Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Product Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={product.name}
            onChange={handleChange}
            placeholder="Premium Noni Juice - 500ml"
            className={`mt-1 block w-full rounded-md border ${errors.name ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-green-500 focus:ring-green-500 p-2`}
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={product.description}
            onChange={handleChange}
            placeholder="Cold-pressed, organic Noni juice with no additives..."
            className={`mt-1 block w-full rounded-md border ${errors.description ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-green-500 focus:ring-green-500 p-2`}
          />
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Price */}
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
              Selling Price (₹)
            </label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <span className="text-gray-500 sm:text-sm">₹</span>
              </div>
              <input
                type="number"
                id="price"
                name="price"
                min="0"
                step="0.01"
                value={product.price}
                onChange={handleChange}
                className={`block w-full rounded-md border ${errors.price ? 'border-red-500' : 'border-gray-300'} pl-8 pr-12 focus:border-green-500 focus:ring-green-500 p-2`}
                placeholder="899.00"
              />
            </div>
            {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
          </div>

          {/* Original Price */}
          <div>
            <label htmlFor="originalPrice" className="block text-sm font-medium text-gray-700">
              Original Price (₹) <span className="text-gray-400">(optional)</span>
            </label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <span className="text-gray-500 sm:text-sm">₹</span>
              </div>
              <input
                type="number"
                id="originalPrice"
                name="originalPrice"
                min="0"
                step="0.01"
                value={product.originalPrice}
                onChange={handleChange}
                className={`block w-full rounded-md border ${errors.originalPrice ? 'border-red-500' : 'border-gray-300'} pl-8 pr-12 focus:border-green-500 focus:ring-green-500 p-2`}
                placeholder="999.00"
              />
            </div>
            {product.originalPrice && product.price && (
              <p className="mt-1 text-sm text-green-600">
                {product.discountPercentage}% discount
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <select
                id="category"
                name="category"
                value={product.category}
                onChange={handleChange}
                className={`block w-full rounded-md border ${errors.category ? 'border-red-500' : 'border-gray-300'} focus:border-green-500 focus:ring-green-500 p-2`}
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
          </div>

          {/* Stock */}
          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
              Stock Quantity
            </label>
            <div className="mt-1 flex items-center">
              <button
                type="button"
                onClick={() => setProduct(prev => ({ ...prev, stock: Math.max(0, prev.stock - 1) }))}
                className="p-2 bg-gray-200 rounded-l-md hover:bg-gray-300"
              >
                <FaMinus />
              </button>
              <input
                type="number"
                id="stock"
                name="stock"
                min="0"
                value={product.stock}
                onChange={handleChange}
                className="block w-full text-center border-t border-b border-gray-300 focus:border-green-500 focus:ring-green-500 p-2"
              />
              <button
                type="button"
                onClick={() => setProduct(prev => ({ ...prev, stock: prev.stock + 1 }))}
                className="p-2 bg-gray-200 rounded-r-md hover:bg-gray-300"
              >
                <FaPlus />
              </button>
            </div>
          </div>

          {/* Featured */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="featured"
              name="featured"
              checked={product.featured}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <label htmlFor="featured" className="ml-2 block text-sm text-gray-700">
              Featured Product
            </label>
          </div>
        </div>

        {/* Add New Category */}
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <label htmlFor="newCategory" className="block text-sm font-medium text-gray-700">
              Add New Category
            </label>
            <input
              type="text"
              id="newCategory"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Enter new category name"
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 p-2"
            />
          </div>
          <button
            type="button"
            onClick={addCategory}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Add
          </button>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding Product...
              </>
            ) : (
              'Add Product'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;