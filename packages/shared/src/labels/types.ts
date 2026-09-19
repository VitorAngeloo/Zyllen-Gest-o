

export interface LabelDataContractV1 {
    contractVersion: 'v1';
    layoutVersion: '1';
    templateId: string | null;
    assetId: string;
    assetCode: string;
    skuId: string;
    skuCode: string;
    skuName: string;
    description: string;
    brand?: string | null;
    barcode?: string | null;
    barcodeValue: string;
    qrContent: string;
    category: string;
    location: string;
    status: string;
}
