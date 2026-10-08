export interface ReportResponse {
  body: Blob | null;
  headers: { get(name: string): string | null };
}

export interface ReportDownloadState {
  downloading: boolean;
  error: string;
}

export interface ReportBrowser {
  createObjectUrl(blob: Blob): string;
  revokeObjectUrl(url: string): void;
  download(url: string, fileName: string): void;
}

export const browserReportDownload: ReportBrowser = {
  createObjectUrl: (blob) => URL.createObjectURL(blob),
  revokeObjectUrl: (url) => URL.revokeObjectURL(url),
  download: (url, fileName) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
  },
};

export function reportFileName(contentDisposition: string | null) {
  const encoded = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const simple = contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1];
  const value = encoded ? decodeURIComponent(encoded) : simple;
  return value?.trim() || 'relatorio-veiculo.pdf';
}

export async function downloadVehicleReport(
  request: () => Promise<ReportResponse>,
  state: ReportDownloadState,
  browser: ReportBrowser = browserReportDownload,
) {
  if (state.downloading) return;
  state.downloading = true;
  state.error = '';
  try {
    const response = await request();
    if (!response.body) throw new Error('empty report');
    const url = browser.createObjectUrl(response.body);
    try {
      browser.download(url, reportFileName(response.headers.get('Content-Disposition')));
    } finally {
      browser.revokeObjectUrl(url);
    }
  } catch {
    state.error = 'Não foi possível gerar o relatório. Tente novamente.';
  } finally {
    state.downloading = false;
  }
}
