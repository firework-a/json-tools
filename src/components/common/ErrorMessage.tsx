interface ErrorMessageProps {
  message: string | null
}

function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null
  
  return (
    <div className="error-message">
      {message}
    </div>
  )
}

export default ErrorMessage
