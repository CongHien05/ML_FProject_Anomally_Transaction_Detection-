export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('current_user') || 'null');
  } catch {
    return null;
  }
};

export const saveAuth = ({ access_token, user }) => {
  localStorage.setItem('access_token', access_token);
  localStorage.setItem('current_user', JSON.stringify(user));
};

export const saveUser = (user) => {
  localStorage.setItem('current_user', JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('current_user');
};

export const parseVndAmount = (value = '') => {
  const digitsOnly = String(value).replace(/[^\d]/g, '');
  return digitsOnly ? Number(digitsOnly) : 0;
};

export const formatVndInput = (value = '') => {
  const amount = typeof value === 'number' ? Math.floor(value) : parseVndAmount(value);
  return amount
    ? new Intl.NumberFormat('vi-VN', {
        maximumFractionDigits: 0,
      }).format(amount)
    : '';
};

export const formatVnd = (value = 0) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
