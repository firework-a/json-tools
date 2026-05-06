interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  className?: string
}

function Button({ 
  children, 
  onClick, 
  variant = 'secondary',
  className 
}: ButtonProps) {
  return (
    <button 
      className={`btn btn-${variant} ${className || ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default Button
