export class UpdateTaxCodeDto {
  code?: string;
  description?: string;
  taxRate?: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  appliesTo?: "goods" | "services" | "both";
}
