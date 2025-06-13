const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^(\+201|01)[0-2,5]{1}[0-9]{8}$/;
  return phoneRegex.test(phone);
};