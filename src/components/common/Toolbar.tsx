interface ToolbarProps {
  title: string
  children: React.ReactNode
}

function Toolbar({ title, children }: ToolbarProps) {
  return (
    <div className="panel-header">
      <h3>{title}</h3>
      <div className="panel-actions">
        {children}
      </div>
    </div>
  )
}

export default Toolbar
