/** Type declaration for CSS Module imports in the client bundle. */
declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}
