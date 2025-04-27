import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ConfigService } from './config.service';

export interface DocumentationConfig {
  title: string;
  description: string;
  version: string;
  groups: DocumentationGroupConfig[];
}

export interface DocumentationGroupConfig {
  id: string;
  title: string;
  description?: string;
  overviewPath?: string;
  order: number;
  icon?: string;
  include: string[];
  exclude: string[];
}

export interface DocumentationGroup {
  id: string;
  title: string;
  description?: string;
  overviewPath?: string;
  order: number;
  icon?: string;
  files: DocumentationFile[];
  overview?: DocumentationFile;
}

export interface DocumentationFile {
  id: string;
  title: string;
  path: string;
  content: string;
  groupId: string;
  order: number;
  lastModified: string;
  isOverview: boolean;
  extension: string;
}

export interface BusinessFlowTag {
  name: string;
  description?: string;
  documentationFileId: string;
  methods: BusinessFlowMethod[];
}

export interface BusinessFlowMethod {
  className: string;
  simpleClassName: string;
  methodName: string;
  methodSignature: string;
  description?: string;
  stereotype: string;
  order: number;
  isLast?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentationService {
  private apiPath: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
    // Get the base path from the config service
    const config = this.configService.getConfig();
    const basePath = config.path || config.basePath || '/kraven';
    this.apiPath = basePath + '/v1/documentation';
  }

  /**
   * Gets the documentation configuration.
   */
  getConfig(): Observable<DocumentationConfig> {
    return this.http.get<DocumentationConfig>(`${this.apiPath}/config`).pipe(
      catchError(error => {
        console.error('Error fetching documentation config:', error);
        return of({
          title: 'Documentation',
          description: 'Service Documentation',
          version: '1.0.0',
          groups: []
        });
      })
    );
  }

  /**
   * Gets all documentation groups.
   */
  getAllGroups(): Observable<DocumentationGroup[]> {
    return this.http.get<DocumentationGroup[]>(`${this.apiPath}/groups`).pipe(
      catchError(error => {
        console.error('Error fetching documentation groups:', error);
        return of([]);
      })
    );
  }

  /**
   * Gets a documentation group by ID.
   */
  getGroup(groupId: string): Observable<DocumentationGroup> {
    return this.http.get<DocumentationGroup>(`${this.apiPath}/groups/${groupId}`).pipe(
      catchError(error => {
        console.error(`Error fetching documentation group ${groupId}:`, error);
        return of({
          id: '',
          title: '',
          description: '',
          overviewPath: '',
          order: 0,
          icon: '',
          files: []
        });
      })
    );
  }

  /**
   * Gets a documentation file by ID.
   */
  getFile(fileId: string): Observable<DocumentationFile> {
    return this.http.get<DocumentationFile>(`${this.apiPath}/files/${fileId}`).pipe(
      catchError(error => {
        console.error(`Error fetching documentation file ${fileId}:`, error);
        return of({
          id: '',
          title: '',
          path: '',
          content: 'Error loading documentation file.',
          groupId: '',
          order: 0,
          lastModified: new Date().toISOString(),
          isOverview: false,
          extension: 'md'
        });
      })
    );
  }

  /**
   * Decodes base64-encoded content from a documentation file.
   *
   * @param base64Content The base64-encoded content
   * @returns The decoded content as a string
   */
  decodeBase64Content(base64Content: string): string {
    try {
      return atob(base64Content);
    } catch (error) {
      console.error('Error decoding base64 content:', error);
      return 'Error decoding content. The content may not be properly encoded.';
    }
  }

  /**
   * Gets all business flow tags for a documentation file.
   */
  getBusinessFlowTags(fileId: string): Observable<BusinessFlowTag[]> {
    return this.http.get<BusinessFlowTag[]>(`${this.apiPath}/files/${fileId}/business-flow-tags`).pipe(
      catchError(error => {
        console.error(`Error fetching business flow tags for file ${fileId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Gets a business flow tag by name and documentation file ID.
   */
  getBusinessFlowTag(fileId: string, tagName: string): Observable<BusinessFlowTag> {
    return this.http.get<BusinessFlowTag>(`${this.apiPath}/files/${fileId}/business-flow-tags/${tagName}`).pipe(
      catchError(error => {
        console.error(`Error fetching business flow tag ${tagName} for file ${fileId}:`, error);
        return of({
          name: '',
          documentationFileId: '',
          methods: []
        });
      })
    );
  }

  /**
   * Gets all business flow tags.
   */
  getAllBusinessFlowTags(): Observable<Record<string, BusinessFlowTag[]>> {
    return this.http.get<Record<string, BusinessFlowTag[]>>(`${this.apiPath}/business-flow-tags`).pipe(
      catchError(error => {
        console.error('Error fetching all business flow tags:', error);
        return of({});
      })
    );
  }

  /**
   * Refreshes the documentation by rescanning.
   */
  refreshDocumentation(): Observable<string> {
    return this.http.post(`${this.apiPath}/refresh`, {}, { responseType: 'text' }).pipe(
      catchError(error => {
        console.error('Error refreshing documentation:', error);
        return of('Error refreshing documentation.');
      })
    );
  }
}
