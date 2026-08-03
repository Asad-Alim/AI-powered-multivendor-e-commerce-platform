export default function Product() {
  const { productId } = useParams()
  const [product, setProduct] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const { products } = useProducts()

  useEffect(() => {
    setNotFound(false)
    const found = products.find(p => p.id === productId)
    if (found) {
      setProduct(found)
      return
    }
    // Not in the client-side cache (e.g. just created/edited this session) —
    // fetch it directly instead of waiting on the cache forever.
    let cancelled = false
    fetch(`/api/products/${productId}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.success) setProduct(data.data.product)
        else setNotFound(true)
      })
      .catch(() => { if (!cancelled) setNotFound(true) })
    return () => { cancelled = true }
  }, [productId, products])

  useEffect(() => {
    scrollTo(0, 0)
    if (productId) trackRecentlyViewed(productId)
  }, [productId])

  if (notFound) return <div className='text-center py-20' style={{ color: 'var(--text-muted)' }}>Product not found.</div>
  if (!product) return <Loading />