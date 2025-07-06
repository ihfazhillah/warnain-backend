export interface Category {
  id: string;
  title: string;
  thumbnail: string;
  source: string;
  access_count: number;
}

export interface PrintableBook {
  id: string;
  title: string;
  description: string;
  category: string;
  category_name: string;
  image: string;
  pdf_file: string;
  created_at: string;
  updated_at: string;
  source: string;
}

export interface PrintJob {
  id: string;
  book: string;
  book_title: string;
  status: "pending" | "printing" | "completed" | "failed";
  created_at: string;
  updated_at: string;
  printer_name: string;
  copies: number;
  pages: string;
  paper_size: string;
  color_mode: "color" | "grayscale";
  duplex: boolean;
}

export interface PrinterSettings {
  id: string;
  name: string;
  description: string;
  printer_name: string;
  paper_size: string;
  color_mode: "color" | "grayscale";
  duplex: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface NetworkInterface {
  id: string;
  name: string;
  ip_address: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrintHistory {
  id: string;
  book: PrintableBook;
  print_job: PrintJob;
  timestamp: string;
  status: "success" | "failed";
  error_message?: string;
}

export interface ApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface PrintStatus {
  isConnected: boolean;
  printerName: string;
  status: "ready" | "printing" | "error" | "offline";
  message: string;
}

export interface Settings {
  baseUrl: string;
  defaultPrinter: string;
  autoConnect: boolean;
  printQuality: "draft" | "normal" | "high";
  paperSize: "A4" | "A3" | "Letter";
  colorMode: "color" | "grayscale";
  duplex: boolean;
}

export type RootStackParamList = {
  Home: undefined;
  CategoryList: undefined;
  CategoryDetail: { categoryId: string };
  QRScanner: undefined;
  PrintHistory: undefined;
  Settings: undefined;
  ImageViewer: { imageUri: string; title: string };
};

export type TabParamList = {
  Categories: undefined;
  Scanner: undefined;
  History: undefined;
  Settings: undefined;
};
