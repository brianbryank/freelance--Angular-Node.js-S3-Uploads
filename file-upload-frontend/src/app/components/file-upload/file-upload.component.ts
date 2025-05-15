import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FileService } from '../../services/file.service';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css']
})
export class FileUploadComponent {
  uploadForm: FormGroup;
  selectedFile: File | null = null;
  isUploading: boolean = false;
  uploadProgress: number = 0;
  errorMessage: string = '';
  successMessage: string = '';
  
  fileCategories = [
    { value: 'image', label: 'Image (JPG, PNG, GIF)' },
    { value: 'pdf', label: 'PDF Document' },
    { value: 'doc', label: 'Word Document (DOC, DOCX)' }
  ];

  constructor(
    private fb: FormBuilder,
    private fileService: FileService
  ) {
    this.uploadForm = this.fb.group({
      fileCategory: ['image', Validators.required],
      file: [null, Validators.required]
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.uploadForm.patchValue({ file: file });
      this.errorMessage = '';
    }
  }

  validateFileType(file: File, category: string): boolean {
    const allowedTypes: { [key: string]: string[] } = {
      'image': ['image/jpeg', 'image/png', 'image/gif'],
      'pdf': ['application/pdf'],
      'doc': ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    };

    return allowedTypes[category]?.includes(file.type) || false;
  }

  onSubmit(): void {
    if (this.uploadForm.invalid || !this.selectedFile) {
      return;
    }

    const fileCategory = this.uploadForm.get('fileCategory')?.value;
    
    if (!this.validateFileType(this.selectedFile, fileCategory)) {
      this.errorMessage = `Invalid file type. Please select a valid ${fileCategory} file.`;
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;
    this.errorMessage = '';
    this.successMessage = '';

    // Step 1: Get presigned URL from our backend
    this.fileService.generateUploadUrl(
      this.selectedFile.name,
      this.selectedFile.type.split('/')[1],
      this.selectedFile.type,
      fileCategory
    ).subscribe({
      next: (response) => {
        // Step 2: Upload file directly to S3 using the presigned URL
        this.fileService.uploadFileToS3(response.uploadUrl, this.selectedFile!).subscribe({
          next: () => {
            this.isUploading = false;
            this.uploadProgress = 100;
            this.successMessage = 'File uploaded successfully!';
            this.uploadForm.reset({ fileCategory });
            this.selectedFile = null;
          },
          error: (error) => {
            this.isUploading = false;
            this.errorMessage = 'Failed to upload file to S3. Please try again.';
            console.error('S3 upload error:', error);
          }
        });
      },
      error: (error) => {
        this.isUploading = false;
        this.errorMessage = error.error?.error || 'Failed to generate upload URL. Please try again.';
        console.error('Generate URL error:', error);
      }
    });
  }
} 