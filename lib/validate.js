// lib/validate.js — Input validation helpers

export function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validatePassword(password) {
    if (password.length < 8) return 'Password must be at least 8 characters'
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number'
    return null
}

export function validateProduct(data) {
    const errors = {}
    if (!data.name?.trim()) errors.name = 'Name is required'
    if (!data.description?.trim()) errors.description = 'Description is required'
    if (!data.mrp || isNaN(data.mrp) || data.mrp <= 0) errors.mrp = 'Valid MRP is required'
    if (!data.price || isNaN(data.price) || data.price <= 0) errors.price = 'Valid price is required'
    if (data.price > data.mrp) errors.price = 'Price cannot exceed MRP'
    if (!data.category?.trim()) errors.category = 'Category is required'
    return Object.keys(errors).length ? errors : null
}

export function validateOrder(data) {
    const errors = {}
    if (!data.addressId) errors.addressId = 'Delivery address is required'
    if (!data.paymentMethod) errors.paymentMethod = 'Payment method is required'
    if (!['COD', 'STRIPE'].includes(data.paymentMethod)) errors.paymentMethod = 'Invalid payment method'
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
        errors.items = 'Order must have at least one item'
    }
    return Object.keys(errors).length ? errors : null
}

export function validateAddress(data) {
    const errors = {}
    if (!data.name?.trim()) errors.name = 'Name is required'
    if (!data.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Valid email is required'
    if (!data.street?.trim()) errors.street = 'Street is required'
    if (!data.city?.trim()) errors.city = 'City is required'
    if (!data.state?.trim()) errors.state = 'State is required'
    if (!data.zip?.trim()) errors.zip = 'ZIP code is required'
    if (!data.country?.trim()) errors.country = 'Country is required'
    if (!data.phone?.trim()) errors.phone = 'Phone is required'
    return Object.keys(errors).length ? errors : null
}

export function sanitizeString(str) {
    return str?.toString().trim().slice(0, 1000) || ''
}

export function sanitizePositiveNumber(val) {
    const n = parseFloat(val)
    return isNaN(n) || n <= 0 ? null : n
}
