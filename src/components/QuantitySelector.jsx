// src/components/QuantitySelector.jsx
import { useState, useEffect } from 'react';

export default function QuantitySelector({ 
  quantity = 1, 
  maxQuantity = 100, 
  minQuantity = 1,
  onQuantityChange,
  disabled = false,
  className = '',
  size = 'default' // 'small', 'default', 'large'
}) {
  const [localQuantity, setLocalQuantity] = useState(quantity);

  // Update local state when prop changes
  useEffect(() => {
    setLocalQuantity(quantity);
  }, [quantity]);

  // Handle quantity change with validation
  const handleQuantityChange = (newQuantity) => {
    const validQuantity = Math.max(minQuantity, Math.min(parseInt(newQuantity) || minQuantity, maxQuantity));
    setLocalQuantity(validQuantity);
    onQuantityChange?.(validQuantity);
  };

  // Handle increment
  const handleIncrement = () => {
    if (localQuantity < maxQuantity) {
      handleQuantityChange(localQuantity + 1);
    }
  };

  // Handle decrement
  const handleDecrement = () => {
    if (localQuantity > minQuantity) {
      handleQuantityChange(localQuantity - 1);
    }
  };

  // Handle direct input
  const handleInputChange = (e) => {
    const value = e.target.value;
    if (value === '') {
      setLocalQuantity('');
      return;
    }
    handleQuantityChange(value);
  };

  // Handle input blur (ensure valid value)
  const handleInputBlur = () => {
    if (localQuantity === '' || localQuantity < minQuantity) {
      handleQuantityChange(minQuantity);
    }
  };

  // Size-based styling
  const sizeClasses = {
    small: {
      button: 'w-6 h-6 text-xs',
      input: 'w-12 h-6 text-xs',
      container: 'text-xs'
    },
    default: {
      button: 'w-8 h-8 text-sm',
      input: 'w-16 h-8 text-sm',
      container: 'text-sm'
    },
    large: {
      button: 'w-10 h-10 text-base',
      input: 'w-20 h-10 text-base',
      container: 'text-base'
    }
  };

  const currentSize = sizeClasses[size] || sizeClasses.default;

  return (
    <div className={`flex flex-col ${className}`}>
      <label className={`block font-medium text-gray-700 mb-2 ${currentSize.container}`}>
        Quantity
      </label>
      <div className="flex items-center">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || localQuantity <= minQuantity}
          className={`${currentSize.button} rounded-l border border-gray-300 bg-gray-50 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150`}
          aria-label="Decrease quantity"
        >
          −
        </button>
        
        <input
          type="number"
          min={minQuantity}
          max={maxQuantity}
          value={localQuantity}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          disabled={disabled}
          className={`${currentSize.input} text-center border-t border-b border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label="Quantity"
        />
        
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || localQuantity >= maxQuantity}
          className={`${currentSize.button} rounded-r border border-gray-300 bg-gray-50 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150`}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
    </div>
  );
}