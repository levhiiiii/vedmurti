// Payment utility functions

export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatDate = (date, format = 'short') => {
  if (!date) return '';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  
  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    case 'long':
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'time':
      return dateObj.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    default:
      return dateObj.toLocaleDateString();
  }
};

export const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

export const getTransactionStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'failed':
    case 'rejected':
      return 'bg-red-100 text-red-800';
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getTransactionTypeLabel = (type) => {
  switch (type?.toLowerCase()) {
    case 'commission':
      return 'Commission';
    case 'bonus':
      return 'Bonus';
    case 'team_override':
      return 'Team Override';
    case 'leadership_bonus':
      return 'Leadership Bonus';
    case 'withdrawal_request':
      return 'Withdrawal Request';
    case 'withdrawal_completed':
      return 'Withdrawal';
    case 'refund':
      return 'Refund';
    case 'adjustment':
      return 'Adjustment';
    default:
      return type?.charAt(0).toUpperCase() + type?.slice(1) || 'Unknown';
  }
};

export const validateWithdrawalAmount = (amount, availableBalance, minAmount = 10, maxAmount = null) => {
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount) || numAmount <= 0) {
    return { isValid: false, error: 'Please enter a valid amount' };
  }
  
  if (numAmount < minAmount) {
    return { isValid: false, error: `Minimum withdrawal amount is ${formatCurrency(minAmount)}` };
  }
  
  if (maxAmount && numAmount > maxAmount) {
    return { isValid: false, error: `Maximum withdrawal amount is ${formatCurrency(maxAmount)}` };
  }
  
  if (numAmount > availableBalance) {
    return { isValid: false, error: 'Insufficient balance' };
  }
  
  return { isValid: true, error: null };
};

export const validateBankAccount = (bankAccountData) => {
  const errors = {};
  
  if (!bankAccountData.accountName?.trim()) {
    errors.accountName = 'Account name is required';
  }
  
  if (!bankAccountData.bankName?.trim()) {
    errors.bankName = 'Bank name is required';
  }
  
  if (!bankAccountData.accountNumber?.trim()) {
    errors.accountNumber = 'Account number is required';
  } else if (bankAccountData.accountNumber.length < 8) {
    errors.accountNumber = 'Account number must be at least 8 digits';
  }
  
  if (!bankAccountData.routingNumber?.trim()) {
    errors.routingNumber = 'Routing number is required';
  } else if (bankAccountData.routingNumber.length !== 9) {
    errors.routingNumber = 'Routing number must be 9 digits';
  }
  
  if (bankAccountData.accountType && !['checking', 'savings'].includes(bankAccountData.accountType)) {
    errors.accountType = 'Account type must be checking or savings';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const generateTransactionId = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `TXN_${timestamp}_${randomStr}`.toUpperCase();
};

export const calculateCommission = (saleAmount, commissionRate) => {
  return (saleAmount * commissionRate) / 100;
};

export const calculateTeamBonus = (teamSales, bonusStructure) => {
  let bonus = 0;
  
  for (const tier of bonusStructure) {
    if (teamSales >= tier.minSales) {
      bonus = (teamSales * tier.rate) / 100;
    }
  }
  
  return bonus;
};

export const getEarningsGrowth = (currentPeriod, previousPeriod) => {
  if (!previousPeriod || previousPeriod === 0) {
    return currentPeriod > 0 ? { percentage: 100, isPositive: true } : { percentage: 0, isPositive: false };
  }
  
  const percentage = ((currentPeriod - previousPeriod) / previousPeriod) * 100;
  return {
    percentage: Math.abs(percentage),
    isPositive: percentage >= 0
  };
};

export const formatTransactionForExport = (transactions) => {
  return transactions.map(transaction => ({
    'Transaction ID': transaction.id,
    'Date': formatDate(transaction.date, 'short'),
    'Type': getTransactionTypeLabel(transaction.type),
    'Amount': transaction.amount,
    'Status': transaction.status,
    'Description': transaction.description || ''
  }));
};

export const groupTransactionsByMonth = (transactions) => {
  const grouped = {};
  
  transactions.forEach(transaction => {
    const date = new Date(transaction.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!grouped[monthKey]) {
      grouped[monthKey] = {
        month: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
        transactions: [],
        totalAmount: 0,
        count: 0
      };
    }
    
    grouped[monthKey].transactions.push(transaction);
    if (transaction.status === 'completed' && transaction.amount > 0) {
      grouped[monthKey].totalAmount += transaction.amount;
    }
    grouped[monthKey].count++;
  });
  
  return Object.values(grouped).sort((a, b) => b.month.localeCompare(a.month));
};

export const calculateWithdrawalFee = (amount, feeStructure = { percentage: 0, fixed: 0, min: 0, max: 0 }) => {
  let fee = 0;
  
  // Calculate percentage fee
  if (feeStructure.percentage > 0) {
    fee += (amount * feeStructure.percentage) / 100;
  }
  
  // Add fixed fee
  if (feeStructure.fixed > 0) {
    fee += feeStructure.fixed;
  }
  
  // Apply minimum fee
  if (feeStructure.min > 0 && fee < feeStructure.min) {
    fee = feeStructure.min;
  }
  
  // Apply maximum fee
  if (feeStructure.max > 0 && fee > feeStructure.max) {
    fee = feeStructure.max;
  }
  
  return fee;
};

export const getPaymentMethodIcon = (method) => {
  switch (method?.toLowerCase()) {
    case 'bank_transfer':
    case 'ach':
      return 'FaUniversity';
    case 'paypal':
      return 'FaPaypal';
    case 'stripe':
      return 'FaCreditCard';
    case 'wire':
      return 'FaExchangeAlt';
    default:
      return 'FaMoneyBillWave';
  }
};

export const isBusinessDay = (date) => {
  const day = date.getDay();
  return day !== 0 && day !== 6; // Not Sunday (0) or Saturday (6)
};

export const calculateProcessingTime = (requestDate, businessDaysToProcess = 3) => {
  const currentDate = new Date(requestDate);
  let businessDaysAdded = 0;
  
  while (businessDaysAdded < businessDaysToProcess) {
    currentDate.setDate(currentDate.getDate() + 1);
    if (isBusinessDay(currentDate)) {
      businessDaysAdded++;
    }
  }
  
  return currentDate;
};

export const maskAccountNumber = (accountNumber, visibleDigits = 4) => {
  if (!accountNumber) return '';
  const str = accountNumber.toString();
  const masked = '•'.repeat(Math.max(0, str.length - visibleDigits));
  const visible = str.slice(-visibleDigits);
  return masked + visible;
};

export const validateRoutingNumber = (routingNumber) => {
  // Basic routing number validation (Luhn algorithm)
  if (!routingNumber || routingNumber.length !== 9) {
    return false;
  }
  
  const digits = routingNumber.split('').map(Number);
  const checksum = (3 * (digits[0] + digits[3] + digits[6]) +
                   7 * (digits[1] + digits[4] + digits[7]) +
                   (digits[2] + digits[5] + digits[8])) % 10;
  
  return checksum === 0;
};

export default {
  formatCurrency,
  formatDate,
  calculatePercentageChange,
  getTransactionStatusColor,
  getTransactionTypeLabel,
  validateWithdrawalAmount,
  validateBankAccount,
  generateTransactionId,
  calculateCommission,
  calculateTeamBonus,
  getEarningsGrowth,
  formatTransactionForExport,
  groupTransactionsByMonth,
  calculateWithdrawalFee,
  getPaymentMethodIcon,
  isBusinessDay,
  calculateProcessingTime,
  maskAccountNumber,
  validateRoutingNumber
};
