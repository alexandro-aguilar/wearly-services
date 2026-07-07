export class Barcode {
  private constructor(readonly value: string) {}

  static optional(value: string | undefined): Barcode | undefined {
    const normalized = value?.trim();
    return normalized ? new Barcode(normalized) : undefined;
  }
}
