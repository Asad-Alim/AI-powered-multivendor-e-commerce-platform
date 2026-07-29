'use client'
// AppContext.jsx — Central React Context replacing ALL Redux slices
// Cart · Wishlist · Products · Auth · Addresses · Ratings
// Developer: Asad | Fixed: cartArray uses live products, not dummy data

import { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react'
import { addressDummyData } from '@/assets/assets'

// ─── Initial State ────────────────────────────────────────────────────────────
const initialState = {
  // Cart: { productId: quantity }
  cart: {},
  cartTotal: 0,

  // Wishlist: Set of productIds
  wishlist: [],

  // Products list — empty by default; fetched from API on mount
  products: [],

  // Auth
  user: null,
  token: null,
  isAuthLoading: true,

  // Addresses
  addresses: [addressDummyData],

  // Ratings submitted in this session
  ratings: [],
}

// ─── Reducer ─────────────────────────────────────────────────────────────────
function appReducer(state, action) {
  switch (action.type) {

    // ── CART ──────────────────────────────────────────────────────────────────
    case 'CART_ADD': {
      const id = action.productId
      const prev = state.cart[id] || 0
      return {
        ...state,
        cart: { ...state.cart, [id]: prev + 1 },
        cartTotal: state.cartTotal + 1,
      }
    }
    case 'CART_REMOVE': {
      const id = action.productId
      if (!state.cart[id]) return state
      const newQty = state.cart[id] - 1
      const newCart = { ...state.cart }
      if (newQty <= 0) delete newCart[id]
      else newCart[id] = newQty
      return { ...state, cart: newCart, cartTotal: Math.max(0, state.cartTotal - 1) }
    }
    case 'CART_DELETE': {
      const id = action.productId
      const qty = state.cart[id] || 0
      const newCart = { ...state.cart }
      delete newCart[id]
      return { ...state, cart: newCart, cartTotal: Math.max(0, state.cartTotal - qty) }
    }
    case 'CART_CLEAR':
      return { ...state, cart: {}, cartTotal: 0 }
    case 'CART_SET':
      return { ...state, cart: action.cart, cartTotal: Object.values(action.cart).reduce((a, b) => a + b, 0) }

    // ── WISHLIST ───────────────────────────────────────────────────────────────
    case 'WISHLIST_TOGGLE': {
      const id = action.productId
      const exists = state.wishlist.includes(id)
      return {
        ...state,
        wishlist: exists ? state.wishlist.filter(w => w !== id) : [...state.wishlist, id],
      }
    }
    case 'WISHLIST_SET':
      return { ...state, wishlist: action.wishlist }

    // ── PRODUCTS ───────────────────────────────────────────────────────────────
    case 'PRODUCTS_SET':
      return { ...state, products: action.products }

    // ── AUTH ───────────────────────────────────────────────────────────────────
    case 'AUTH_SET':
      return { ...state, user: action.user, token: action.token, isAuthLoading: false }
    case 'AUTH_LOADING':
      return { ...state, isAuthLoading: true }
    case 'AUTH_LOGOUT':
      return { ...state, user: null, token: null, isAuthLoading: false, cart: {}, cartTotal: 0, wishlist: [], addresses: [addressDummyData] }

    // ── ADDRESSES ──────────────────────────────────────────────────────────────
    case 'ADDRESS_ADD':
      return { ...state, addresses: [...state.addresses, action.address] }
    case 'ADDRESS_SET':
      return { ...state, addresses: action.addresses }
    case 'ADDRESS_DELETE':
      return { ...state, addresses: state.addresses.filter(a => a.id !== action.id) }

    // ── RATINGS ────────────────────────────────────────────────────────────────
    case 'RATING_ADD':
      return { ...state, ratings: [...state.ratings, action.rating] }

    default:
      return state
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────
const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  // ── Persist cart & wishlist in localStorage; hydrate auth from cookie ──────
  useEffect(() => {
    try {
      const savedCart     = localStorage.getItem('im_cart')
      const savedWishlist = localStorage.getItem('im_wishlist')
      if (savedCart)     dispatch({ type: 'CART_SET',     cart:    JSON.parse(savedCart) })
      if (savedWishlist) dispatch({ type: 'WISHLIST_SET', wishlist: JSON.parse(savedWishlist) })
    } catch {
      // ignore corrupt localStorage
    }

    // Auth now lives in an httpOnly cookie the browser can't read directly —
    // ask the server who's logged in.
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(res => (res.ok ? res.json() : { success: false }))
      .then(data => {
        if (data.success) dispatch({ type: 'AUTH_SET', user: data.data.user, token: null })
        else dispatch({ type: 'AUTH_SET', user: null, token: null })
      })
      .catch(() => dispatch({ type: 'AUTH_SET', user: null, token: null }))
  }, [])



  // ── Fetch real products from API on mount (all pages) ────────────────────
  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        // Page 1 first — if total fits in one page, done
        const res1  = await fetch('/api/products?limit=100&page=1')
        const data1 = await res1.json()
        if (!data1.success) return

        const { products, pagination } = data1.data
        let all = products

        // If there are more pages, fetch them in parallel
        if (pagination && pagination.totalPages > 1) {
          const remaining = Array.from({ length: pagination.totalPages - 1 }, (_, i) =>
            fetch(`/api/products?limit=100&page=${i + 2}`).then(r => r.json())
          )
          const pages = await Promise.all(remaining)
          for (const page of pages) {
            if (page.success) all = [...all, ...page.data.products]
          }
        }

        if (all.length > 0) {
          dispatch({ type: 'PRODUCTS_SET', products: all })
        }
      } catch {
        // Silently fall back — individual pages handle their own loading states
      }
    }
    fetchAllProducts()
  }, [])

  useEffect(() => {
    localStorage.setItem('im_cart', JSON.stringify(state.cart))
  }, [state.cart])

  useEffect(() => {
    localStorage.setItem('im_wishlist', JSON.stringify(state.wishlist))
  }, [state.wishlist])

  // ── Cart helpers ────────────────────────────────────────────────────────────
  const addToCart     = useCallback((productId) => dispatch({ type: 'CART_ADD',    productId }), [])
  const removeFromCart= useCallback((productId) => dispatch({ type: 'CART_REMOVE', productId }), [])
  const deleteFromCart= useCallback((productId) => dispatch({ type: 'CART_DELETE', productId }), [])
  const clearCart     = useCallback(() => dispatch({ type: 'CART_CLEAR' }), [])

  // FIX: cartArray built from live state.products (not dummy data)
  const cartArray = state.products
    .filter(p => state.cart[p.id])
    .map(p => ({ ...p, quantity: state.cart[p.id] }))

  const cartSubtotal = cartArray.reduce((sum, item) => sum + item.price * item.quantity, 0)

  // ── Wishlist helpers ────────────────────────────────────────────────────────
  const toggleWishlist = useCallback((productId) => dispatch({ type: 'WISHLIST_TOGGLE', productId }), [])
  const isWishlisted   = useCallback((productId) => state.wishlist.includes(productId), [state.wishlist])

  // ── Auth helpers ────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const res  = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || 'Login failed')
    localStorage.setItem('im_user', JSON.stringify(data.data.user))
    dispatch({ type: 'AUTH_SET', user: data.data.user, token: null })
    return data.data.user
  }, [])

  const register = useCallback(async (name, email, password) => {
    const res  = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ name, email, password }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || 'Registration failed')
    localStorage.setItem('im_user', JSON.stringify(data.data.user))
    dispatch({ type: 'AUTH_SET', user: data.data.user, token: null })
    return data.data.user
  }, [])

  const logout = useCallback(() => {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {})
    localStorage.removeItem('im_user')
    dispatch({ type: 'AUTH_LOGOUT' })
  }, [])

  // Authenticated API fetch helper — the httpOnly cookie is sent automatically
  const authFetch = useCallback(async (url, options = {}) => {
    return fetch(url, {
      ...options,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    })
  }, [])
  

  // ── Address helpers ────────────────────────────────────────────────────────
  const addAddress    = useCallback((address)   => dispatch({ type: 'ADDRESS_ADD', address }),         [])
  const setAddresses  = useCallback((addresses) => dispatch({ type: 'ADDRESS_SET', addresses }),       [])
  const deleteAddress = useCallback((id)        => dispatch({ type: 'ADDRESS_DELETE', id }),           [])

  // ── Rating helpers ─────────────────────────────────────────────────────────
  const addRating     = useCallback((rating)    => dispatch({ type: 'RATING_ADD', rating }),           [])

  // ── Products helpers ───────────────────────────────────────────────────────
  const setProducts   = useCallback((products)  => dispatch({ type: 'PRODUCTS_SET', products }),       [])

  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'

  const value = {
    // State
    ...state,
    cartArray,
    cartSubtotal,
    currency,

    // Cart
    addToCart,
    removeFromCart,
    deleteFromCart,
    clearCart,

    // Wishlist
    toggleWishlist,
    isWishlisted,

    // Auth
    login,
    register,
    logout,
    authFetch,

    // Addresses
    addAddress,
    setAddresses,
    deleteAddress,

    // Ratings
    addRating,

    // Products
    setProducts,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// ─── Custom Hook ───────────────────────────────────────────────────────────────
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}

export const useCart      = () => { const { cart, cartTotal, cartArray, cartSubtotal, addToCart, removeFromCart, deleteFromCart, clearCart, currency } = useApp(); return { cart, cartTotal, cartArray, cartSubtotal, addToCart, removeFromCart, deleteFromCart, clearCart, currency } }
export const useWishlist  = () => { const { wishlist, toggleWishlist, isWishlisted } = useApp(); return { wishlist, toggleWishlist, isWishlisted } }
export const useProducts  = () => { const { products, setProducts } = useApp(); return { products, setProducts } }
export const useAuth      = () => { const { user, token, isAuthLoading, login, register, logout, authFetch } = useApp(); return { user, token, isAuthLoading, login, register, logout, authFetch } }
export const useAddresses = () => { const { addresses, addAddress, setAddresses, deleteAddress } = useApp(); return { addresses, addAddress, setAddresses, deleteAddress } }
export const useRatings   = () => { const { ratings, addRating } = useApp(); return { ratings, addRating } }
