import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  generateUploadUrl(fileName: string, fileType: string, contentType: string, fileCategory: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/generate-upload-url`, {
      fileName,
      fileType,
      contentType,
      fileCategory
    });
  }

  uploadFileToS3(url: string, file: File): Observable<any> {
    return new Observable(observer => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      xhr.setRequestHeader('Content-Type', file.type);
      
      xhr.onload = () => {
        if (xhr.status === 200) {
          observer.next({ success: true });
          observer.complete();
        } else {
          observer.error({ status: xhr.status, statusText: xhr.statusText });
        }
      };
      
      xhr.onerror = () => {
        observer.error({ status: xhr.status, statusText: xhr.statusText });
      };
      
      xhr.send(file);
    });
  }

  getFiles(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/files`);
  }

  getDownloadUrl(objectKey: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/files/${encodeURIComponent(objectKey)}`);
  }
}