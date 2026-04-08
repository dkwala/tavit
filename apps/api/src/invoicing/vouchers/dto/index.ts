export class CreateVoucherDto {
  companyId: string;
  gstinId: string;
  voucherType:
    | "sales_invoice"
    | "purchase_invoice"
    | "credit_note"
    | "debit_note";
  voucherNumber: string;
  partyName: string;
  partyPan?: string;
  partyGstin?: string;
  invoiceDate: Date;
  dueDate?: Date;
  description?: string;
}

export class CreateVoucherLineItemDto {
  itemName: string;
  hsnSacCode?: string;
  quantity: number;
  unitPrice: number;
  taxCodeId: string;
}

export class CreateVoucherWithItemsDto extends CreateVoucherDto {
  lineItems: CreateVoucherLineItemDto[];
}

export class FinalizeVoucherDto {
  voucherId: string;
}

export class CreateReversalDto {
  originalVoucherId: string;
  reversalType: "credit_note" | "debit_note";
}
