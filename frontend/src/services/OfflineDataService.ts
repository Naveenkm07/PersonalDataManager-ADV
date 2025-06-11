import { saveAs } from 'file-saver';
import JSZip from 'jszip';

class OfflineDataService {
  private static instance: OfflineDataService;

  private constructor() {}

  static getInstance(): OfflineDataService {
    if (!OfflineDataService.instance) {
      OfflineDataService.instance = new OfflineDataService();
    }
    return OfflineDataService.instance;
  }

  // Export data to JSON file
  async exportToJSON(data: any, filename: string = 'dream-app-data.json'): Promise<void> {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      saveAs(blob, filename);
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error('Failed to export data');
    }
  }

  // Export data to CSV
  async exportToCSV(data: any[], filename: string = 'dream-app-data.csv'): Promise<void> {
    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No data to export');
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => JSON.stringify(row[header])).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, filename);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw new Error('Failed to export data to CSV');
    }
  }

  // Import data from JSON file
  async importFromJSON(file: File): Promise<any> {
    try {
      const text = await file.text();
      return JSON.parse(text);
    } catch (error) {
      console.error('Error importing JSON:', error);
      throw new Error('Failed to import JSON data');
    }
  }

  // Import data from CSV file
  async importFromCSV(file: File): Promise<any[]> {
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(header => header.trim());
      
      return lines.slice(1).map(line => {
        const values = line.split(',').map(value => {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        });
        
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index];
          return obj;
        }, {} as any);
      });
    } catch (error) {
      console.error('Error importing CSV:', error);
      throw new Error('Failed to import CSV data');
    }
  }

  // Create a compressed backup
  async createBackup(data: any, filename: string = 'dream-app-backup.zip'): Promise<void> {
    try {
      const zip = new JSZip();
      
      // Add data files to zip
      zip.file('data.json', JSON.stringify(data, null, 2));
      
      // Add metadata
      const metadata = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        dataTypes: Object.keys(data)
      };
      zip.file('metadata.json', JSON.stringify(metadata, null, 2));
      
      // Generate and save zip file
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, filename);
    } catch (error) {
      console.error('Error creating backup:', error);
      throw new Error('Failed to create backup');
    }
  }

  // Restore from backup
  async restoreFromBackup(file: File): Promise<any> {
    try {
      const zip = await JSZip.loadAsync(file);
      
      // Read metadata
      const metadataFile = zip.file('metadata.json');
      if (!metadataFile) {
        throw new Error('Invalid backup file: metadata missing');
      }
      const metadata = JSON.parse(await metadataFile.async('string'));
      
      // Read data
      const dataFile = zip.file('data.json');
      if (!dataFile) {
        throw new Error('Invalid backup file: data missing');
      }
      return JSON.parse(await dataFile.async('string'));
    } catch (error) {
      console.error('Error restoring backup:', error);
      throw new Error('Failed to restore backup');
    }
  }

  // Compress data for storage
  async compressData(data: any): Promise<string> {
    try {
      const jsonString = JSON.stringify(data);
      const blob = new Blob([jsonString]);
      const compressed = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(compressed);
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
      }
      return btoa(binaryString);
    } catch (error) {
      console.error('Error compressing data:', error);
      throw new Error('Failed to compress data');
    }
  }

  // Decompress data from storage
  async decompressData(compressedData: string): Promise<any> {
    try {
      const binaryString = atob(compressedData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const jsonString = new TextDecoder().decode(bytes);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Error decompressing data:', error);
      throw new Error('Failed to decompress data');
    }
  }
}

export default OfflineDataService; 