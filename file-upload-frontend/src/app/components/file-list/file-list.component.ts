import { Component, OnInit } from '@angular/core';
import { FileService } from '../../services/file.service';

interface FileItem {
  name: string;
  objectKey: string;
  type: string;
  uploadDate: string;
  downloadUrl?: string;
  isLoading?: boolean;
  error?: string;
}

@Component({
  selector: 'app-file-list',
  templateUrl: './file-list.component.html',
  styleUrls: ['./file-list.component.css']
})
export class FileListComponent implements OnInit {
  files: FileItem[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(private fileService: FileService) {}

  ngOnInit(): void {
    this.loadFiles();
  }

  loadFiles(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.fileService.getFiles().subscribe({
      next: (response) => {
        this.files = response.files;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load files. Please try again.';
        this.isLoading = false;
        console.error('Load files error:', error);
      }
    });
  }

  getFileIcon(fileType: string): string {
    switch (fileType) {
      case 'image':
        return 'fa-image';
      case 'pdf':
        return 'fa-file-pdf';
      case 'doc':
        return 'fa-file-word';
      default:
        return 'fa-file';
    }
  }

  downloadFile(file: FileItem): void {
    if (file.downloadUrl) {
      window.open(file.downloadUrl, '_blank');
      return;
    }

    file.isLoading = true;
    file.error = '';

    this.fileService.getDownloadUrl(file.objectKey).subscribe({
      next: (response) => {
        file.downloadUrl = response.downloadUrl;
        file.isLoading = false;
        window.open(file.downloadUrl, '_blank');
      },
      error: (error) => {
        file.error = 'Failed to generate download URL';
        file.isLoading = false;
        console.error('Download error:', error);
      }
    });
  }
}