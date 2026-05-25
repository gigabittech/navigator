// Raw .sql files are imported as strings (see next.config.mjs asset/source rule).
declare module "*.sql" {
  const content: string;
  export default content;
}
