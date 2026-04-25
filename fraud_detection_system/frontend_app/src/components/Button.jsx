import './Button.css'

function Button({ children, type = 'button', variant = 'primary', loading = false, onClick, disabled }) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${loading ? 'loading' : ''}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? 'Processing...' : children}
    </button>
  )
}

export default Button
